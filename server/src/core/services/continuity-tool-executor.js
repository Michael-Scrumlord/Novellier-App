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

function _requireStoryContext({ canMutateFacts, ctx }) {
    if (canMutateFacts) return true;
    ctx.debugToolMode('tool_blocked_missing_story_context', { index: ctx.index, toolName: ctx.toolName });
    ctx.emitToolEvent(createToolEvent('tool_failed', ctx.toolName, ctx.index, { error: 'storyId required for mutation' }));
    return false;
}

function _runAddFact({ canMutateFacts, ctx, updatedFacts }) {
    if (!_requireStoryContext({ canMutateFacts, ctx })) {
        return { updatedFacts, factsMutated: false, skipSuccessEvent: true };
    }

    const result = handleAddFact(ctx.args, updatedFacts);

    ctx.debugToolMode('add_fact_evaluated', {
        index: ctx.index,
        toolName: ctx.toolName,
        atomicFactValid: result.ok,
        atomicFactReason: result.failureReason || null,
        beforeCount: updatedFacts.length,
        afterCount: result.updatedFacts.length,
    });

    if (!result.ok) {
        ctx.emitToolEvent(createToolEvent('tool_failed', ctx.toolName, ctx.index, { error: `invalid_fact: ${result.failureReason}` }));
        return { updatedFacts, factsMutated: false, skipSuccessEvent: true };
    }

    if (result.factsMutated) {
        ctx.debugToolMode('add_fact_mutated', { index: ctx.index, toolName: ctx.toolName, afterCount: result.updatedFacts.length });
    }

    return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated, skipSuccessEvent: false };
}

function _runRemoveFact({ canMutateFacts, ctx, updatedFacts }) {
    if (!_requireStoryContext({ canMutateFacts, ctx })) {
        return { updatedFacts, factsMutated: false, skipSuccessEvent: true };
    }

    const result = handleRemoveFact(ctx.args, updatedFacts);

    ctx.debugToolMode('remove_fact_evaluated', {
        index: ctx.index,
        toolName: ctx.toolName,
        beforeCount: updatedFacts.length,
        afterCount: result.updatedFacts.length,
        removed: result.factsMutated,
    });

    return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated, skipSuccessEvent: false };
}

async function _runPopulateFacts({ canMutateFacts, ctx, updatedFacts }) {
    if (!_requireStoryContext({ canMutateFacts, ctx })) {
        return { updatedFacts, factsMutated: false, skipSuccessEvent: true };
    }

    const result = await handlePopulateFacts(ctx.args, {
        aiService: ctx.aiService,
        targetModel: ctx.targetModel,
        existingFacts: updatedFacts,
        sections: ctx.options?.sections || [],
        chapterSummaries: ctx.options?.chapterSummaries || [],
        jobQueue: ctx.jobQueue || null,
        onProgress: ctx.onProgress,
        logger: ctx.logger,
    });

    return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated, skipSuccessEvent: false };
}

async function _runSectionFacts({ canMutateFacts, ctx, updatedFacts }) {
    if (!_requireStoryContext({ canMutateFacts, ctx })) {
        return { updatedFacts, factsMutated: false, skipSuccessEvent: true };
    }

    const result = await handleSectionFacts(ctx.args, {
        aiService: ctx.aiService,
        targetModel: ctx.targetModel,
        existingFacts: updatedFacts,
        sectionContent: ctx.options?.storyText || '',
        jobQueue: ctx.jobQueue || null,
        onProgress: ctx.onProgress,
        logger: ctx.logger,
    });

    return { updatedFacts: result.updatedFacts, factsMutated: result.factsMutated, skipSuccessEvent: false };
}

function _runListTools({ ctx }) {
    const tools = handleListTools(ctx.aiOptions?.tools || []);
    ctx.debugToolMode('list_tools_invoked', { index: ctx.index, toolName: ctx.toolName, availableCount: tools.length });
    ctx.onProgress?.({ kind: PROGRESS.LIST_TOOLS, tools });
    return { skipSuccessEvent: false };
}

async function _runToolCall(canMutateFacts, ctx, updatedFacts) {
    switch (ctx.toolName) {
        case TOOL_TYPES.ADD_FACT:
            return _runAddFact({ canMutateFacts, ctx, updatedFacts });
        case TOOL_TYPES.REMOVE_FACT:
            return _runRemoveFact({ canMutateFacts, ctx, updatedFacts });
        case TOOL_TYPES.POPULATE_FACTS:
            return await _runPopulateFacts({ canMutateFacts, ctx, updatedFacts });
        case TOOL_TYPES.SECTION_FACTS:
            return await _runSectionFacts({ canMutateFacts, ctx, updatedFacts });
        case TOOL_TYPES.LIST_TOOLS:
            return _runListTools({ ctx });
        default:
            ctx.emitToolEvent(createToolEvent('tool_failed', ctx.toolName, ctx.index, { error: `unsupported_tool: ${ctx.toolName}` }));
            return { updatedFacts, factsMutated: false, skipSuccessEvent: true };
    }
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
    onToolStarted,
}) {
    const canMutateFacts = Boolean(storyService && options.storyId);
    let factsMutated = false;
    let updatedFacts = [...currentFacts];

    for (let index = 0; index < extractedToolCalls.length; index++) {
        const call = extractedToolCalls[index];
        const toolName = getToolName(call);
        const args = getToolArguments(call);

        const ctx = {
            index,
            toolName,
            args,
            aiOptions,
            options,
            targetModel,
            aiService,
            jobQueue,
            logger,
            onProgress,
            emitToolEvent,
            debugToolMode,
        };

        debugToolMode('tool_started', { index, toolName, canMutateFacts, arguments: args });
        emitToolEvent(createToolEvent('tool_started', toolName, index, { arguments: args }));

        try {
            const result = await _runToolCall(canMutateFacts, ctx, updatedFacts);

            updatedFacts = result.updatedFacts || updatedFacts;
            factsMutated = factsMutated || Boolean(result.factsMutated);

            if (!result.skipSuccessEvent) {
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
