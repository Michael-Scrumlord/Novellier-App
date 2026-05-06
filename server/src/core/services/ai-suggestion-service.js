import { ISuggestionService } from '../ports/ISuggestionService.js';
import { CONTINUITY_TOOL_SPECS } from '../domain/ContinuityToolSpecs.js';
import { PROGRESS } from '../domain/ToolProgressEvents.js';
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
    constructor({ aiService, vectorRepository, storyFactsGateway, strategies, logger, config, runtimeModels, jobQueue } = {}) {
        super();
        if (!aiService || !vectorRepository) {
            throw new Error('AISuggestionService requires aiService and vectorRepository');
        }
        if (!strategies?.novel) {
            throw new Error('AISuggestionService requires a strategies map with a "novel" default');
        }
        this.aiService = aiService;
        this.vectorRepository = vectorRepository;
        this.storyFactsPort = storyFactsGateway || null;
        this.strategies = strategies;
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

        // YouTrack demo — domain field selects the strategy; defaults to novel.
        const strategy = this.strategies[options.domain] ?? this.strategies.novel;
        const prompt = strategy.buildPrompt({
            currentText: clippedStory,
            ragContext,
            feedbackFocus: options.feedbackType,
            customPrompt: options.customPrompt,
            contextSummaries: options.contextSummaries,
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

        const executionResult = await executeToolCalls(toolCalls, {
            aiOptions,
            currentFacts: storyFacts,
            options,
            targetModel,
            aiService: this.aiService,
            storyService: this.storyFactsPort,
            jobQueue: this.jobQueue,
            logger: this.logger,
            onProgress: options.onProgress,
            emitToolEvent: (event) => options.onToolEvent?.(event),
            debugToolMode: (msg, meta) =>
                options.mode === TOOL_MODE && this.logger.log(`[ToolDebug] ${msg} ${JSON.stringify(meta)}`),
            logConversation: options.logConversation,
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
