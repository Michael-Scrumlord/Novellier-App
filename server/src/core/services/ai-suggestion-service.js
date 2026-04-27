import { ISuggestionService } from '../ports/ISuggestionService.js';
import { CONTINUITY_TOOL_SPECS } from '../domain/ContinuityToolSpecs.js';
import { PROGRESS } from '../domain/ToolProgressEvents.js';
import { PromptBuilder } from '../domain/PromptBuilder.js';
import { richTextToPlainText } from '../domain/RichText.js';
import { clipText } from '../domain/TextUtils.js';
import {
    createToolEvent,
    executeToolCalls,
    getToolArguments,
    getToolName,
} from './continuity-tool-executor.js';

const TOOL_MODE = 'tools';
const TOOL_ERROR_RESPONSE =
    '[Continuity Tool Error: The selected active model does not natively support Tools.]';

const DEFAULT_CONFIG = Object.freeze({
    maxActiveChars: null,
    maxTokens: null,
});

function normalizeAndClipStoryText(storyText, maxActiveChars) {
    const normalized = richTextToPlainText(storyText);
    if (!normalized) throw new Error('storyText is required');
    return maxActiveChars ? clipText(normalized, maxActiveChars) : normalized;
}

function extractNativeToolCalls(result) {
    if (typeof result !== 'object' || result === null) return null;
    const calls = Array.isArray(result.toolCalls) ? result.toolCalls : null;
    return calls?.length ? calls : null;
}

function extractContent(result) {
    if (typeof result === 'string') return result;
    return result?.content || '';
}

export class AISuggestionService extends ISuggestionService {
    constructor({ aiService, vectorRepository, storyFactsGateway, logger, config, runtimeModels, jobQueue } = {}) {
        super();
        if (!aiService || !vectorRepository) {
            throw new Error('AISuggestionService requires aiService and vectorRepository');
        }
        this.aiService = aiService;
        this.vectorRepository = vectorRepository;
        this.storyFactsPort = storyFactsGateway || null;
        this.logger = logger || console;
        this.config = { ...DEFAULT_CONFIG, ...(config || {}) };
        this.runtimeModels = runtimeModels || null;
        this.jobQueue = jobQueue || null;
    }

    async getSuggestion(storyText, options = {}) {
        const clippedStory = normalizeAndClipStoryText(storyText, this.config.maxActiveChars);
        const isToolMode = options.mode === TOOL_MODE;

        const [ragContext, storyFacts] = await Promise.all([
            this._loadRagContext(clippedStory, options.storyId),
            this._loadStoryFacts(options.storyId, options._meta),
        ]);

        const prompt = PromptBuilder.build({
            currentText: clippedStory,
            ragContext,
            feedbackFocus: options.feedbackType,
            customPrompt: options.customPrompt,
            currentChapterSummary: options.currentChapterSummary,
            currentBeatSummary: options.currentBeatSummary,
            storySummary: options.storySummary,
            storySummaryShort: options.storySummaryShort,
            storySummaryLong: options.storySummaryLong,
            storyFacts,
            mode: options.mode,
        });
        options.onPromptBuilt?.(prompt);

        const targetModel = options.model || this.runtimeModels?.suggestion;
        const aiOptions = {
            maxTokens: options.maxTokens ?? this.config.maxTokens,
            model: targetModel,
            abortSignal: options.abortSignal,
        };

        if (isToolMode) {
            let supportsTools = false;
            try {
                const status = await this.aiService.ensureModelAvailable(targetModel);
                supportsTools = status?.supportsTools || false;
            } catch (error) {
                this.logger.warn(`[AISuggestionService] Tool support check failed: ${error.message}`);
            }
            if (!supportsTools) {
                options.onProgress?.({ kind: PROGRESS.UNSUPPORTED_MODEL });
                return options.onChunk ? undefined : TOOL_ERROR_RESPONSE;
            }
            aiOptions.tools = CONTINUITY_TOOL_SPECS;
        }

        const result = await (options.onChunk
            ? this.aiService.generateStreamingCompletion(prompt, aiOptions, options.onChunk)
            : this.aiService.generateCompletion(prompt, aiOptions));

        if (isToolMode && result !== undefined) {
            await this._processToolCalls(result, storyFacts, aiOptions, options, targetModel);
        }

        return result;
    }

    async _loadRagContext(clippedStory, storyId) {
        if (!storyId) return '';
        try {
            return await this.vectorRepository.searchContext(clippedStory, { storyId, limit: null });
        } catch (error) {
            this.logger.warn(`[AISuggestionService] RAG search failed: ${error.message}`);
            return '';
        }
    }

    async _loadStoryFacts(storyId, metadata) {
        if (!storyId || !this.storyFactsPort) return [];
        try {
            const actor = { userId: metadata?.userId, role: metadata?.role || 'user' };
            return await this.storyFactsPort.getFacts(storyId, actor);
        } catch (error) {
            this.logger.warn(`[AISuggestionService] Facts load failed: ${error.message}`);
            return [];
        }
    }

    async _processToolCalls(result, storyFacts, aiOptions, options, targetModel) {
        const toolCalls = extractNativeToolCalls(result);
        if (!toolCalls) return;

        toolCalls.forEach((call, index) => {
            options.onToolEvent?.(
                createToolEvent('tool_requested', getToolName(call), index, {
                    arguments: getToolArguments(call),
                })
            );
        });

        const trackingAiService = {
            ...this.aiService,
            generateCompletion: async (prompt, aiOpts) => {
                const res = await this.aiService.generateCompletion(prompt, aiOpts);
                options.logConversation?.(prompt, extractContent(res) || JSON.stringify(res, null, 2));
                return res;
            },
            generateStreamingCompletion: async (prompt, aiOpts, onChunk) => {
                let accumulated = '';
                const res = await this.aiService.generateStreamingCompletion(prompt, aiOpts, (chunk) => {
                    accumulated += chunk;
                    onChunk?.(chunk);
                });
                options.logConversation?.(prompt, accumulated || extractContent(res) || JSON.stringify(res, null, 2));
                return res;
            },
        };

        const executionResult = await executeToolCalls(toolCalls, {
            aiOptions,
            currentFacts: storyFacts,
            options,
            targetModel,
            aiService: trackingAiService,
            storyService: this.storyFactsPort,
            jobQueue: this.jobQueue,
            logger: this.logger,
            onProgress: options.onProgress,
            emitToolEvent: (event) => options.onToolEvent?.(event),
            debugToolMode: (msg, meta) =>
                options.mode === TOOL_MODE && this.logger.log(`[ToolDebug] ${msg} ${JSON.stringify(meta)}`),
        });

        if (executionResult.factsMutated && executionResult.canMutateFacts && this.storyFactsPort) {
            try {
                const actor = { userId: options._meta?.userId, role: options._meta?.role || 'user' };
                await this.storyFactsPort.saveFacts(options.storyId, executionResult.updatedFacts, actor);
            } catch (error) {
                this.logger.warn(`[AISuggestionService] Fact persistence failed: ${error.message}`);
            }
        }

        options.onProgress?.({ kind: PROGRESS.TOOL_EXECUTION_COMPLETE });
    }
}
