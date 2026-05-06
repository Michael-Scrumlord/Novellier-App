import { PROGRESS } from '../domain/ToolProgressEvents.js';
import { handleAddFact } from '../domain/tools/AddFact.js';
import { handleRemoveFact } from '../domain/tools/RemoveFact.js';
import { handleListTools } from '../domain/tools/ListTools.js';
import { handlePopulateFacts } from '../domain/tools/PopulateFacts.js';
import { handleSectionFacts } from '../domain/tools/PopulateSection.js';

const TOOL_TYPES = Object.freeze({
    ADD_FACT: 'add_fact',
    REMOVE_FACT: 'remove_fact',
    POPULATE_FACTS: 'populate_facts',
    SECTION_FACTS: 'section_facts',
    LIST_TOOLS: 'list_tools',
});

// Each handler declares needsContext (whether storyId + storyService are required) and a
// run(ctx, facts) method. Handlers return { updatedFacts, factsMutated, failureReason? }.
// A non-empty failureReason causes the loop to emit tool_failed instead of tool_succeeded.
const TOOL_HANDLERS = {
    [TOOL_TYPES.ADD_FACT]: {
        needsContext: true,
        run(ctx, facts) {
            const result = handleAddFact(ctx.args, facts);
            ctx.debugToolMode('add_fact_evaluated', {
                index: ctx.index,
                toolName: ctx.toolName,
                atomicFactValid: result.ok,
                atomicFactReason: result.failureReason || null,
                beforeCount: facts.length,
                afterCount: result.updatedFacts.length,
            });
            if (!result.ok) {
                return { updatedFacts: facts, factsMutated: false, failureReason: `invalid_fact: ${result.failureReason}` };
            }
            if (result.factsMutated) {
                ctx.debugToolMode('add_fact_mutated', { index: ctx.index, toolName: ctx.toolName, afterCount: result.updatedFacts.length });
            }
            return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated };
        },
    },

    [TOOL_TYPES.REMOVE_FACT]: {
        needsContext: true,
        run(ctx, facts) {
            const result = handleRemoveFact(ctx.args, facts);
            ctx.debugToolMode('remove_fact_evaluated', {
                index: ctx.index,
                toolName: ctx.toolName,
                beforeCount: facts.length,
                afterCount: result.updatedFacts.length,
                removed: result.factsMutated,
            });
            return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated };
        },
    },

    [TOOL_TYPES.POPULATE_FACTS]: {
        needsContext: true,
        async run(ctx, facts) {
            const result = await handlePopulateFacts(ctx.args, {
                aiService: ctx.aiService,
                targetModel: ctx.targetModel,
                existingFacts: facts,
                sections: ctx.options?.sections || [],
                chapterSummaries: ctx.options?.chapterSummaries || [],
                jobQueue: ctx.jobQueue || null,
                onProgress: ctx.onProgress,
                logger: ctx.logger,
            });
            return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated };
        },
    },

    [TOOL_TYPES.SECTION_FACTS]: {
        needsContext: true,
        async run(ctx, facts) {
            const result = await handleSectionFacts(ctx.args, {
                aiService: ctx.aiService,
                targetModel: ctx.targetModel,
                existingFacts: facts,
                sectionContent: ctx.options?.storyText || '',
                jobQueue: ctx.jobQueue || null,
                onProgress: ctx.onProgress,
                logger: ctx.logger,
            });
            return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated };
        },
    },

    [TOOL_TYPES.LIST_TOOLS]: {
        needsContext: false,
        run(ctx) {
            const tools = handleListTools(ctx.aiOptions?.tools || []);
            ctx.debugToolMode('list_tools_invoked', { index: ctx.index, toolName: ctx.toolName, availableCount: tools.length });
            ctx.onProgress?.({ kind: PROGRESS.LIST_TOOLS, tools });
            return {};
        },
    },
};

export function getToolName(call) {
    return call?.function?.name || call?.type || 'unknown_tool';
}

export function getToolArguments(call) {
    const argsStr = call?.function?.arguments ?? call?.arguments;
    if (typeof argsStr === 'object') return argsStr;
    if (typeof argsStr !== 'string' || !argsStr.trim()) return {};
    try {
        const parsed = JSON.parse(argsStr);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function createToolEvent(type, toolName, index, extra = {}) {
    return { type, toolName, index, timestamp: new Date().toISOString(), ...extra };
}

// Wraps generateCompletion and generateStreamingCompletion to log conversation traces.
// All other aiService methods are forwarded explicitly to avoid prototype spread bugs.
function buildLoggingAiService(aiService, logConversation) {
    if (!logConversation) return aiService;

    const log = (prompt, res) => {
        const content = typeof res === 'string' ? res : (res?.content || '');
        logConversation(prompt, content || JSON.stringify(res, null, 2));
    };

    return {
        generateCompletion: async (prompt, aiOpts) => {
            const res = await aiService.generateCompletion(prompt, aiOpts);
            log(prompt, res);
            return res;
        },
        generateStreamingCompletion: async (prompt, aiOpts, onChunk) => {
            let accumulated = '';
            const res = await aiService.generateStreamingCompletion(prompt, aiOpts, (chunk) => {
                accumulated += chunk;
                onChunk?.(chunk);
            });
            log(prompt, accumulated || res);
            return res;
        },
        ensureModelAvailable: (model) => aiService.ensureModelAvailable(model),
        warmupModel: (model) => aiService.warmupModel?.(model),
    };
}

export async function executeToolCalls(extractedToolCalls, {
    aiOptions,
    currentFacts,
    options,
    targetModel,
    aiService,
    storyService,
    jobQueue,
    logger,
    onProgress,
    emitToolEvent,
    debugToolMode,
    logConversation,
}) {
    const canMutateFacts = Boolean(storyService && options.storyId);
    let factsMutated = false;
    let updatedFacts = [...currentFacts];
    const trackedAiService = buildLoggingAiService(aiService, logConversation);

    // Pre-pass: announce all requested tools before any begin executing.
    extractedToolCalls.forEach((call, i) =>
        emitToolEvent(createToolEvent('tool_requested', getToolName(call), i, { arguments: getToolArguments(call) }))
    );

    for (let index = 0; index < extractedToolCalls.length; index++) {
        const call = extractedToolCalls[index];
        const toolName = getToolName(call);
        const args = getToolArguments(call);

        const handler = TOOL_HANDLERS[toolName];
        if (!handler) {
            emitToolEvent(createToolEvent('tool_failed', toolName, index, { error: `unsupported_tool: ${toolName}` }));
            continue;
        }

        if (handler.needsContext && !canMutateFacts) {
            debugToolMode('tool_blocked_missing_story_context', { index, toolName });
            emitToolEvent(createToolEvent('tool_failed', toolName, index, { error: 'storyId required for mutation' }));
            continue;
        }

        const ctx = {
            index, toolName, args, aiOptions, options, targetModel,
            aiService: trackedAiService, jobQueue, logger, onProgress, emitToolEvent, debugToolMode,
        };

        debugToolMode('tool_started', { index, toolName, canMutateFacts, arguments: args });
        emitToolEvent(createToolEvent('tool_started', toolName, index, { arguments: args }));

        try {
            const result = await handler.run(ctx, updatedFacts);

            updatedFacts = result.updatedFacts ?? updatedFacts;
            factsMutated = factsMutated || Boolean(result.factsMutated);

            if (result.failureReason) {
                emitToolEvent(createToolEvent('tool_failed', toolName, index, { error: result.failureReason }));
                debugToolMode('tool_soft_failed', { index, toolName, reason: result.failureReason });
            } else {
                emitToolEvent(createToolEvent('tool_succeeded', toolName, index));
                debugToolMode('tool_succeeded', { index, toolName });
            }
        } catch (error) {
            debugToolMode('tool_failed_exception', { index, toolName, error: error.message });
            emitToolEvent(createToolEvent('tool_failed', toolName, index, { error: error.message }));
            throw error;
        }
    }

    return { canMutateFacts, factsMutated, updatedFacts };
}
