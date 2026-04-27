// Populate facts tool handler.
// Implementation is in prompts.js, fact-parsing.js, fact-validation.js, and passes.js 
// Comes in two modes: Simple and Thorough. Simple is a single LLM call over chapter summaries, 
// while Thorough processes the draft in chunks with multiple passes for extraction, consolidation, 
// and verification.
import { PROGRESS } from '../ToolProgressEvents.js';
import {
    buildExtractPrompt,
    EXTRACT_FACTS_SIMPLE_MAX_TOKENS,
} from './populate-facts/prompts.js';
import { parseCompletionAsFacts } from './populate-facts/fact-parsing.js';
import { mergeValidated } from './populate-facts/fact-validation.js';
import {
    prepareChapters,
    thoroughChunkPipeline,
} from './populate-facts/passes.js';

const SIMPLE_MAX_CHARS = 12000;

function runQueued(jobQueue, name, priority, fn) {
    if (!jobQueue) return fn();
    return jobQueue.enqueue(name, fn, { priority });
}

async function runSimpleMode({
    aiService,
    targetModel,
    jobQueue,
    existingFacts,
    chapterSummaries,
    onProgress,
    logger,
}) {
    const summariesText = (chapterSummaries || [])
        .map((c, i) => `Chapter ${i + 1} (${c.chapterTitle || 'Untitled'}): ${c.summary || ''}`)
        .filter((line) => line.length > 0)
        .join('\n');

    if (!summariesText.trim()) {
        logger?.warn('[PopulateFacts] Simple mode: no chapter summaries available. Run a save first.');
        return { updatedFacts: existingFacts, factsMutated: false };
    }

    onProgress?.({ kind: PROGRESS.POPULATE_SIMPLE_START });

    try {
        const raw = await runQueued(jobQueue, 'populate_simple', 5, () =>
            aiService.generateCompletion(
                buildExtractPrompt(existingFacts, summariesText.slice(0, SIMPLE_MAX_CHARS)),
                { maxTokens: EXTRACT_FACTS_SIMPLE_MAX_TOKENS, model: targetModel }
            )
        );
        const candidates = parseCompletionAsFacts(raw);
        const additions = mergeValidated(candidates, existingFacts);

        onProgress?.({ kind: PROGRESS.POPULATE_SIMPLE_COMPLETE, added: additions.length });

        return {
            updatedFacts: [...existingFacts, ...additions],
            factsMutated: additions.length > 0,
        };
    } catch (error) {
        logger?.warn(`[PopulateFacts] Simple mode failed: ${error.message}`);
        onProgress?.({ kind: PROGRESS.POPULATE_SIMPLE_COMPLETE, added: 0, error: error.message });
        return { updatedFacts: existingFacts, factsMutated: false };
    }
}

async function runThoroughMode({
    aiService,
    targetModel,
    jobQueue,
    existingFacts,
    sections,
    onProgress,
    logger,
}) {
    const chapters = prepareChapters(sections);
    if (chapters.length === 0) {
        return { updatedFacts: existingFacts, factsMutated: false };
    }

    return await thoroughChunkPipeline({
        aiService, targetModel, jobQueue, existingFacts, chapters, onProgress, logger,
    });
}

export async function handlePopulateFacts(args, {
    aiService,
    targetModel,
    existingFacts,
    sections,
    chapterSummaries,
    jobQueue,
    onProgress,
    logger,
}) {
    const mode = args?.mode === 'thorough' ? 'thorough' : 'simple';
    const commonArgs = { aiService, targetModel, jobQueue, existingFacts, onProgress, logger };

    if (mode === 'thorough') {
        return runThoroughMode({ ...commonArgs, sections });
    }
    return runSimpleMode({ ...commonArgs, chapterSummaries });
}
