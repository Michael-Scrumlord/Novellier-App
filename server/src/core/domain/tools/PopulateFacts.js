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
function runQueued(jobQueue, name, priority, fn) {
    if (!jobQueue) return fn();
    return jobQueue.enqueue(name, fn, { priority });
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

async function batchVerifyCandidates({
    aiService,
    targetModel,
    jobQueue,
    candidates,
    chapterIdx,
    chunkIdx,
    onProgress,
    logger,
}) {
    const accepted = [];

    for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_VERIFY_SIZE) {
        const batch = candidates.slice(batchStart, batchStart + BATCH_VERIFY_SIZE);

        const batchItems = batch.map((item) => ({
            fact: item.fact,
            excerpt: extractRelevantExcerpt(item.fact, item.sourceText),
        }));

        for (let i = 0; i < batch.length; i++) {
            onProgress?.({
                kind: PROGRESS.POPULATE_VERIFY_START,
                fact: batch[i].fact,
                index: batchStart + i + 1,
                total: candidates.length,
            });
        }

        let verifiedSet = new Set();
        try {
            const raw = await runQueued(
                jobQueue,
                `populate_verify_ch${chapterIdx}_ck${chunkIdx}_b${batchStart}`,
                6,
                () =>
                    aiService.generateCompletion(
                        buildBatchVerifyPrompt(batchItems),
                        { maxTokens: BATCH_VERIFY_MAX_TOKENS, model: targetModel }
                    )
            );
            const indices = parseCompletionAsIndices(raw);
            for (const idx of indices) {
                if (idx >= 1 && idx <= batch.length) {
                    verifiedSet.add(batch[idx - 1].fact.toLowerCase().trim());
                }
            }
        } catch (error) {
            logger?.warn(
                `[PopulateFacts] Batch verify failed ch${chapterIdx}/chunk${chunkIdx} batch@${batchStart}: ${error.message}`
            );
        }

        for (let i = 0; i < batch.length; i++) {
            const key = batch[i].fact.toLowerCase().trim();
            const isAccepted = verifiedSet.has(key);
            if (isAccepted) accepted.push(batch[i].fact);
            onProgress?.({
                kind: PROGRESS.POPULATE_VERIFY_COMPLETE,
                fact: batch[i].fact,
                index: batchStart + i + 1,
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

async function thoroughChunkPipeline({
    aiService,
    targetModel,
    jobQueue,
    existingFacts,
    chapters,
    onProgress,
    logger,
}) {
    const workingFacts = [...existingFacts];
    const totalChapters = chapters.length;
    let addedCount = 0;

    for (const chapter of chapters) {
        const chunks = chunkText(chapter.text, CHUNK_CHAR_SIZE, CHUNK_CHAR_OVERLAP);

        onProgress?.({
            kind: PROGRESS.POPULATE_CHAPTER_START,
            index: chapter.index + 1,
            total: totalChapters,
            chunks: chunks.length,
        });

        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            onProgress?.({
                kind: PROGRESS.POPULATE_CHUNK_START,
                chapterIndex: chapter.index + 1,
                chunkIndex: chunkIdx + 1,
                chunkCount: chunks.length,
            });

            // 1. Extract candidates from this chunk.
            let candidates = [];
            try {
                const raw = await runQueued(
                    jobQueue,
                    `populate_extract_ch${chapter.index + 1}_ck${chunkIdx + 1}`,
                    5,
                    () =>
                        aiService.generateCompletion(
                            buildExtractPrompt(workingFacts, chunks[chunkIdx]),
                            { maxTokens: EXTRACT_FACTS_MAX_TOKENS, model: targetModel }
                        )
                );
                const parsed = parseCompletionAsFacts(raw);

                // 2. Validate and deduplicate locally against workingFacts.
                const seen = new Set(workingFacts.map((f) => f.toLowerCase()));
                for (const candidate of parsed) {
                    const check = FactValidator.validate(candidate);
                    if (!check.ok) continue;
                    const key = check.fact.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    candidates.push({ fact: check.fact, sourceText: chunks[chunkIdx] });
                }
            } catch (error) {
                logger?.warn(
                    `[PopulateFacts] Extract failed ch${chapter.index + 1}/chunk${chunkIdx + 1}: ${error.message}`
                );
            }

            // 3. Batch-verify candidates against their source excerpts.
            if (candidates.length > 0) {
                const acceptedFacts = await batchVerifyCandidates({
                    aiService,
                    targetModel,
                    jobQueue,
                    candidates,
                    chapterIdx: chapter.index + 1,
                    chunkIdx: chunkIdx + 1,
                    onProgress,
                    logger,
                });

                for (const fact of acceptedFacts) {
                    workingFacts.push(fact);
                    addedCount++;
                }
            }

            onProgress?.({
                kind: PROGRESS.POPULATE_CHUNK_COMPLETE,
                chapterIndex: chapter.index + 1,
                chunkIndex: chunkIdx + 1,
                chunkCount: chunks.length,
            });
        }

        onProgress?.({
            kind: PROGRESS.POPULATE_CHAPTER_COMPLETE,
            index: chapter.index + 1,
            total: totalChapters,
        });
    }

    return { updatedFacts: workingFacts, factsMutated: addedCount > 0 };
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

    return thoroughChunkPipeline({
        aiService, targetModel, jobQueue, existingFacts, chapters, onProgress, logger,
    });
}

// ── Export ─────────────────────────────────────────────────────────────────
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
