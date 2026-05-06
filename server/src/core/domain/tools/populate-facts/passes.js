import { PROGRESS } from '../../ToolProgressEvents.js';
import { richTextToPlainText } from '../../RichText.js';
import { chunkText } from '../../TextUtils.js';
import {
    buildExtractPrompt,
    buildConsolidatePrompt,
    buildBatchVerifyPrompt,
    EXTRACT_FACTS_MAX_TOKENS,
    CONSOLIDATE_MAX_TOKENS,
    BATCH_VERIFY_MAX_TOKENS,
} from './prompts.js';
import { parseCompletionAsFacts, parseCompletionAsIndices } from './fact-parsing.js';
import {
    FactValidator,
    pairWithSources,
    pairCandidatesAsSources,
} from './fact-validation.js';

const CHUNK_WORD_TARGET = 1200;
const CHUNK_WORD_OVERLAP = 150;
const CHUNK_CHAR_SIZE = CHUNK_WORD_TARGET * 6;
const CHUNK_CHAR_OVERLAP = CHUNK_WORD_OVERLAP * 6;
const MAX_CHAPTERS = 15;
const BATCH_VERIFY_SIZE = 7;

function extractRelevantExcerpt(fact, chunkText, topN = 3) {
    const sentences = (chunkText.match(/[^.!?]+[.!?]+/g) || [chunkText])
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

function runQueued(jobQueue, name, priority, fn) {
    if (!jobQueue) return fn();
    return jobQueue.enqueue(name, fn, { priority });
}

export function prepareChapters(sections) {
    return (sections || [])
        .map((s, i) => ({
            index: i,
            title: s?.title || `Chapter ${i + 1}`,
            text: richTextToPlainText(s?.content || ''),
        }))
        .filter((s) => s.text.trim().length > 0)
        .slice(0, MAX_CHAPTERS);
}

export async function thoroughChunkPipeline({
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

            // 1. Extract Candidates
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

                // 2. Validate and deduplicate locally against workingFacts
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

            // 3. Batch-verify candidates (up to BATCH_VERIFY_SIZE per LLM call)
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

    return {
        updatedFacts: workingFacts,
        factsMutated: addedCount > 0
    };
}