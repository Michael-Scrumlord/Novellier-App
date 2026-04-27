import { FactValidator } from './FactValidator.js';
import { PROGRESS } from '../ToolProgressEvents.js';
import { richTextToPlainText } from '../RichText.js';
import { chunkText } from '../TextUtils.js';

const CHUNK_CHAR_SIZE = 7200;
const CHUNK_CHAR_OVERLAP = 900;

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

function runQueued(jobQueue, name, priority, fn) {
    if (!jobQueue) return fn();
    return jobQueue.enqueue(name, fn, { priority });
}

export async function handleSectionFacts(args, {
    aiService,
    targetModel,
    existingFacts,
    sectionContent,
    jobQueue,
    onProgress,
    logger,
}) {
    const text = richTextToPlainText(sectionContent || '');
    if (!text.trim()) {
        return { updatedFacts: existingFacts, factsMutated: false };
    }

    const chunks = chunkText(text, CHUNK_CHAR_SIZE, CHUNK_CHAR_OVERLAP);

    // Pass 1: sequential chunk extraction & verification
    let addedCount = 0;
    const workingFacts = [...existingFacts];

    for (let i = 0; i < chunks.length; i++) {
        onProgress?.({ kind: PROGRESS.SECTION_CHUNK_START, chunkIndex: i + 1, chunkCount: chunks.length });

        let candidates = [];
        try {
            const raw = await runQueued(jobQueue, `section_facts_extract_${i + 1}`, 5, () =>
                aiService.generateCompletion(
                    `You are a backend extraction service.
                    Find objective facts about characters, timelines, and the universe.
                    Exclude anything that repeats EXISTING_FACTS.
                    Print a bare JSON array e.g. ["Fact 1", "Fact 2"].
                    NO MARKDOWN. NO BACKTICKS. JUST THE ARRAY.
                    \n\nEXISTING_FACTS: ${JSON.stringify(workingFacts)}
                    \n\nTEXT:\n${chunks[i]}`,
                    { maxTokens: 800, model: targetModel }
                )
            );
            const parsed = parseFactArray(typeof raw === 'object' ? raw.content : raw);
            
            // Validate and deduplicate locally against workingFacts
            const seen = new Set(workingFacts.map((f) => f.toLowerCase()));
            for (const candidate of parsed) {
                const check = FactValidator.validate(candidate);
                if (!check.ok) continue;
                const key = check.fact.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                candidates.push(check.fact);
            }
        } catch (error) {
            logger?.warn(`[SectionFacts] Extract failed chunk ${i + 1}: ${error.message}`);
        }

        // Verify Candidates
        for (let j = 0; j < candidates.length; j++) {
            const fact = candidates[j];
            let accepted = true;
            try {
                const raw = await runQueued(jobQueue, `section_verify_ck${i + 1}_${j + 1}`, 6, () =>
                    aiService.generateCompletion(
                        `Is the following fact explicitly supported by the TEXT? Answer with a single word: yes or no.\n\nFACT: ${fact}\n\nTEXT:\n${chunks[i]}`,
                        { maxTokens: 50, model: targetModel }
                    )
                );
                const answer = (typeof raw === 'object' ? raw.content : raw).trim().toLowerCase();
                accepted = /^y(es)?\b/.test(answer);
            } catch (error) {
                logger?.warn(`[SectionFacts] Verify failed for "${fact}": ${error.message}`);
                accepted = false;
            }

            if (accepted) {
                workingFacts.push(fact);
                addedCount++;
            }
        }

        onProgress?.({ kind: PROGRESS.SECTION_CHUNK_COMPLETE, chunkIndex: i + 1, chunkCount: chunks.length });
    }

    onProgress?.({ kind: PROGRESS.SECTION_CONSOLIDATE_COMPLETE, added: addedCount });

    return {
        updatedFacts: workingFacts,
        factsMutated: addedCount > 0,
    };
}
