// Populate facts tool handler — Simple and Thorough modes.
// Simple: single LLM call over chapter summaries.
// Thorough: per-chapter, per-chunk extraction with batch verification.
import { PROGRESS } from '../ToolProgressEvents.js';
import { richTextToPlainText } from '../RichText.js';
import { chunkText } from '../TextUtils.js';
import { FactValidator } from './FactValidator.js';

// ── Constants ──────────────────────────────────────────────────────────────
const SIMPLE_MAX_CHARS = 12000;
const EXTRACT_FACTS_MAX_TOKENS = 800;
const EXTRACT_FACTS_SIMPLE_MAX_TOKENS = 1200;
const BATCH_VERIFY_MAX_TOKENS = 500;

const CHUNK_WORD_TARGET = 1200;
const CHUNK_WORD_OVERLAP = 150;
const CHUNK_CHAR_SIZE = CHUNK_WORD_TARGET * 6;
const CHUNK_CHAR_OVERLAP = CHUNK_WORD_OVERLAP * 6;
const MAX_CHAPTERS = 15;
const BATCH_VERIFY_SIZE = 7;

// ── Prompt builders ────────────────────────────────────────────────────────
function buildExtractPrompt(existingFacts, text) {
    return `You are a backend extraction service.
            Find objective facts about characters, timelines, and the universe ONLY.
            Exclude anything that repeats EXISTING_FACTS.
            The fact should have the form "Character X is Y" or "Event A happened before Event B". or "Location L is described as Z". or similar concise statements. DO NOT RETURN ANY FACTS THAT ARE NOT EXPLICITLY SUPPORTED BY THE TEXT.
            Print a bare JSON array e.g. ["Fact 1", "Fact 2"].
            NO MARKDOWN. NO BACKTICKS. JUST THE ARRAY.
            \n\nEXISTING_FACTS: ${JSON.stringify(existingFacts)}
            \n\nTEXT:\n${text}`;
}

function buildBatchVerifyPrompt(batchItems) {
    const candidates = batchItems
        .map((item, i) =>
            `${i + 1}. FACT: ${JSON.stringify(item.fact)}\n   EXCERPT: ${JSON.stringify(item.excerpt)}`
        )
        .join('\n\n');

    return [
        'You are a fact-verification service.',
        'Each numbered candidate below has a FACT and a supporting EXCERPT.',
        'Return ONLY a bare JSON array of the 1-based INDEX numbers of candidates clearly and explicitly supported by their excerpt.',
        'Example: if candidates 1 and 3 are supported, return [1, 3]. If none are supported, return [].',
        'DO NOT INCLUDE AN INDEX UNLESS THE FACT IS CLEARLY AND EXPLICITLY STATED IN ITS EXCERPT.',
        'NO MARKDOWN. NO PREAMBLE. JUST THE ARRAY OF NUMBERS.',
        '',
        'CANDIDATES:',
        candidates,
    ].join('\n');
}

// ── Parsing helpers ────────────────────────────────────────────────────────
function extractFactsFromCompletion(raw) {
    if (raw && typeof raw === 'object') return raw.content || '';
    return raw || '';
}

function parseFactArray(text) {
    if (typeof text !== 'string') return [];
    const match = text.match(/\[([\s\S]*)\]/);
    if (!match) return [];
    try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed) ? parsed.filter((f) => typeof f === 'string') : [];
    } catch {
        return [];
    }
}

function parseCompletionAsFacts(raw) {
    return parseFactArray(extractFactsFromCompletion(raw));
}

function parseCompletionAsIndices(raw) {
    const text = extractFactsFromCompletion(raw);
    if (typeof text !== 'string') return [];
    const match = text.match(/\[([\s\S]*)\]/);
    if (!match) return [];
    try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed)
            ? parsed.filter((n) => typeof n === 'number' && Number.isInteger(n) && n > 0)
            : [];
    } catch {
        return [];
    }
}

// ── Validation helpers ─────────────────────────────────────────────────────
function buildSeenSet(existingFacts) {
    return new Set(existingFacts.map((f) => f.toLowerCase()));
}

function mergeValidated(candidates, existingFacts) {
    const seen = buildSeenSet(existingFacts);
    const additions = [];
    for (const candidate of candidates) {
        const check = FactValidator.validate(candidate);
        if (!check.ok) continue;
        const key = check.fact.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push(check.fact);
    }
    return additions;
}

// ── Pipeline helpers ───────────────────────────────────────────────────────
function runQueued(jobQueue, name, priority, fn, abortSignal) {
    if (!jobQueue) return fn();
    return jobQueue.enqueue(name, fn, { priority, abortSignal });
}

function extractRelevantExcerpt(fact, sourceText, topN = 3) {
    const sentences = (sourceText.match(/[^.!?]+[.!?]+/g) || [sourceText])
        .map((s) => s.trim())
        .filter(Boolean);

    const factWords = fact
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

    const scored = sentences.map((sentence, idx) => ({
        idx,
        sentence,
        score: factWords.filter((w) => sentence.toLowerCase().includes(w)).length,
    }));

    const top = scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .sort((a, b) => a.idx - b.idx)
        .map((s) => s.sentence);

    return top.length > 0 ? top.join(' ') : sentences.slice(0, 2).join(' ');
}

// Verify candidates globally in parallel batches. Each batch is dispatched through the
// AI job queue so hardware concurrency limits are still respected; Promise.all only
// determines submission order, not actual concurrency at the worker.
async function batchVerifyCandidatesParallel({
    aiService,
    targetModel,
    jobQueue,
    candidates,
    onProgress,
    logger,
    abortSignal,
}) {
    if (candidates.length === 0) return [];

    const batches = [];
    for (let start = 0; start < candidates.length; start += BATCH_VERIFY_SIZE) {
        batches.push({ start, batch: candidates.slice(start, start + BATCH_VERIFY_SIZE) });
    }

    candidates.forEach((c, i) => {
        onProgress?.({
            kind: PROGRESS.POPULATE_VERIFY_START,
            fact: c.fact,
            index: i + 1,
            total: candidates.length,
        });
    });

    const batchPromises = batches.map(({ start, batch }) => {
        const batchItems = batch.map((item) => ({
            fact: item.fact,
            excerpt: extractRelevantExcerpt(item.fact, item.sourceText),
        }));
        return runQueued(
            jobQueue,
            `populate_verify_b${start}`,
            6,
            () =>
                aiService.generateCompletion(
                    buildBatchVerifyPrompt(batchItems),
                    { maxTokens: BATCH_VERIFY_MAX_TOKENS, model: targetModel, abortSignal }
                ),
            abortSignal
        )
            .then((raw) => ({ start, batch, raw, error: null }))
            .catch((error) => ({ start, batch, raw: null, error }));
    });

    const settled = await Promise.all(batchPromises);

    const accepted = [];
    for (const { start, batch, raw, error } of settled) {
        if (error) {
            logger?.warn(
                `[PopulateFacts] Batch verify failed batch@${start}: ${error.message}`
            );
        }
        const verifiedSet = new Set();
        if (raw) {
            const indices = parseCompletionAsIndices(raw);
            for (const idx of indices) {
                if (idx >= 1 && idx <= batch.length) {
                    verifiedSet.add(batch[idx - 1].fact.toLowerCase().trim());
                }
            }
        }
        for (let i = 0; i < batch.length; i++) {
            const key = batch[i].fact.toLowerCase().trim();
            const isAccepted = verifiedSet.has(key);
            if (isAccepted) accepted.push(batch[i].fact);
            onProgress?.({
                kind: PROGRESS.POPULATE_VERIFY_COMPLETE,
                fact: batch[i].fact,
                index: start + i + 1,
                total: candidates.length,
                accepted: isAccepted,
            });
        }
    }

    return accepted;
}

function prepareChapters(sections) {
    return (sections || [])
        .map((s, i) => ({
            index: i,
            title: s?.title || `Chapter ${i + 1}`,
            text: richTextToPlainText(s?.content || ''),
        }))
        .filter((s) => s.text.trim().length > 0)
        .slice(0, MAX_CHAPTERS);
}

// Flat pipeline: build a single work list across all chapter/chunk pairs, dispatch all
// extractions through the AI job queue in parallel (the queue enforces concurrency),
// then run a single global verification pass after extractions settle.
//
// Trade-off: we lose the per-chunk soft-dedupe that the old serial pipeline fed into
// `buildExtractPrompt` via the growing workingFacts list. The hard dedupe inside
// `mergeValidated` and the cross-chunk seen-set below remain authoritative.
async function thoroughChunkPipeline({
    aiService,
    targetModel,
    jobQueue,
    existingFacts,
    chapters,
    onProgress,
    logger,
    abortSignal,
}) {
    const workingFacts = [...existingFacts];
    const totalChapters = chapters.length;

    // Build flat work list and emit chapter_start in source order.
    const workItems = [];
    const chapterRemaining = new Map();
    for (const chapter of chapters) {
        const chunks = chunkText(chapter.text, CHUNK_CHAR_SIZE, CHUNK_CHAR_OVERLAP);
        chapterRemaining.set(chapter.index, chunks.length);
        onProgress?.({
            kind: PROGRESS.POPULATE_CHAPTER_START,
            index: chapter.index + 1,
            total: totalChapters,
            chunks: chunks.length,
        });
        chunks.forEach((text, chunkIdx) => {
            workItems.push({
                chapter,
                chapterIndex: chapter.index + 1,
                chunkIndex: chunkIdx + 1,
                chunkCount: chunks.length,
                text,
            });
        });
    }

    if (workItems.length === 0) {
        return { updatedFacts: workingFacts, factsMutated: false };
    }

    // Stage 1: parallel extraction. Each call goes through runQueued so the AIJobQueue's
    // concurrency cap still throttles real GPU contention.
    const extractionPromises = workItems.map((item) => {
        onProgress?.({
            kind: PROGRESS.POPULATE_CHUNK_START,
            chapterIndex: item.chapterIndex,
            chunkIndex: item.chunkIndex,
            chunkCount: item.chunkCount,
        });
        return runQueued(
            jobQueue,
            `populate_extract_ch${item.chapterIndex}_ck${item.chunkIndex}`,
            5,
            () =>
                aiService.generateCompletion(
                    buildExtractPrompt(existingFacts, item.text),
                    { maxTokens: EXTRACT_FACTS_MAX_TOKENS, model: targetModel, abortSignal }
                ),
            abortSignal
        )
            .then((raw) => ({ item, raw, error: null }))
            .catch((error) => ({ item, raw: null, error }))
            .then((result) => {
                onProgress?.({
                    kind: PROGRESS.POPULATE_CHUNK_COMPLETE,
                    chapterIndex: item.chapterIndex,
                    chunkIndex: item.chunkIndex,
                    chunkCount: item.chunkCount,
                });
                const remaining = chapterRemaining.get(item.chapter.index) - 1;
                chapterRemaining.set(item.chapter.index, remaining);
                if (remaining === 0) {
                    onProgress?.({
                        kind: PROGRESS.POPULATE_CHAPTER_COMPLETE,
                        index: item.chapterIndex,
                        total: totalChapters,
                    });
                }
                return result;
            });
    });

    const extractionResults = await Promise.all(extractionPromises);

    // Stage 2: collect & globally dedupe across all chunks.
    const seen = new Set(workingFacts.map((f) => f.toLowerCase()));
    const allCandidates = [];
    for (const { item, raw, error } of extractionResults) {
        if (error) {
            logger?.warn(
                `[PopulateFacts] Extract failed ch${item.chapterIndex}/chunk${item.chunkIndex}: ${error.message}`
            );
            continue;
        }
        if (!raw) continue;
        const parsed = parseCompletionAsFacts(raw);
        for (const candidate of parsed) {
            const check = FactValidator.validate(candidate);
            if (!check.ok) continue;
            const key = check.fact.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            allCandidates.push({ fact: check.fact, sourceText: item.text });
        }
    }

    // Stage 3: single global verification pass with parallel batches.
    const acceptedFacts = await batchVerifyCandidatesParallel({
        aiService,
        targetModel,
        jobQueue,
        candidates: allCandidates,
        onProgress,
        logger,
        abortSignal,
    });

    for (const fact of acceptedFacts) {
        workingFacts.push(fact);
    }

    return { updatedFacts: workingFacts, factsMutated: acceptedFacts.length > 0 };
}

// ── Mode runners ───────────────────────────────────────────────────────────
async function runSimpleMode({
    aiService,
    targetModel,
    jobQueue,
    existingFacts,
    chapterSummaries,
    onProgress,
    logger,
    abortSignal,
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
                { maxTokens: EXTRACT_FACTS_SIMPLE_MAX_TOKENS, model: targetModel, abortSignal }
            ),
            abortSignal
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
    abortSignal,
}) {
    const chapters = prepareChapters(sections);
    if (chapters.length === 0) {
        return { updatedFacts: existingFacts, factsMutated: false };
    }

    return thoroughChunkPipeline({
        aiService, targetModel, jobQueue, existingFacts, chapters, onProgress, logger, abortSignal,
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
    abortSignal,
}) {
    const mode = args?.mode === 'thorough' ? 'thorough' : 'simple';
    const commonArgs = { aiService, targetModel, jobQueue, existingFacts, onProgress, logger, abortSignal };

    if (mode === 'thorough') {
        return runThoroughMode({ ...commonArgs, sections });
    }
    return runSimpleMode({ ...commonArgs, chapterSummaries });
}
