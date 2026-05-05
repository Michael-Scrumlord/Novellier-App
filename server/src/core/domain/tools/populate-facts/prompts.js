export const EXTRACT_FACTS_MAX_TOKENS = 800;
export const EXTRACT_FACTS_SIMPLE_MAX_TOKENS = 1200;
export const CONSOLIDATE_MAX_TOKENS = 2000;
export const VERIFY_MAX_TOKENS = 8;
export const BATCH_VERIFY_MAX_TOKENS = 500;

export function buildExtractPrompt(existingFacts, text) {
    return `You are a backend extraction service.
            Find objective facts about characters, timelines, and the universe ONLY.
            Exclude anything that repeats EXISTING_FACTS. 
            The fact should have the form "Character X is Y" or "Event A happened before Event B". or "Location L is described as Z". or similar concise statements. DO NOT RETURN ANY FACTS THAT ARE NOT EXPLICITLY SUPPORTED BY THE TEXT.
            Print a bare JSON array e.g. ["Fact 1", "Fact 2"].
            NO MARKDOWN. NO BACKTICKS. JUST THE ARRAY.
            \n\nEXISTING_FACTS: ${JSON.stringify(existingFacts)}
            \n\nTEXT:\n${text}`;
}

export function buildConsolidatePrompt(existingFacts, candidates) {
    return [
        'You are a deduplication service. Review the following candidate facts. Collapse duplicates, merge near-duplicates into the clearer phrasing, and DROP any fact that contradicts another.',
        'KEEP all unique, non-contradictory candidates.',
        'Return ONLY a bare JSON array of the cleaned fact strings. NO MARKDOWN. NO PREAMBLE.',
        '',
        `EXISTING_FACTS: ${JSON.stringify(existingFacts)}`,
        '',
        `CANDIDATES: ${JSON.stringify(candidates)}`,
    ].join('\n');
}

export function buildVerifyPrompt(fact, sourceText) {
    return `Is the following fact explicitly supported by the TEXT? Answer with a single word: yes or no.\n\nFACT: ${fact}\n\nTEXT:\n${sourceText || ''}`;
}

export function buildBatchVerifyPrompt(batchItems) {
    const candidates = batchItems
        .map((item, i) =>
            `${i + 1}. FACT: ${JSON.stringify(item.fact)}\n   EXCERPT: ${JSON.stringify(item.excerpt)}`
        )
        .join('\n\n');

    return [
        'You are a fact-verification service.',
        'Each candidate below has a FACT and a supporting EXCERPT.',
        'Return ONLY a bare JSON array of the EXACT candidate strings that are explicitly stated in their excerpt.',
        'DO NOT RETURN A FACT UNLESS IT IS CLEARLY AND EXPLICITLY SUPPORTED BY ITS EXCERPT.',
        'Copy each accepted fact string verbatim — do not rephrase or modify.',
        'Omit any fact not clearly supported by its excerpt.',
        'NO MARKDOWN. NO PREAMBLE. JUST THE ARRAY.',
        '',
        'CANDIDATES:',
        candidates,
    ].join('\n');
}