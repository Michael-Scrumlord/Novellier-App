import { FactValidator } from '../FactValidator.js';

export { FactValidator };

export function buildSeenSet(existingFacts) {
    return new Set(existingFacts.map((f) => f.toLowerCase()));
}

export function mergeValidated(candidates, existingFacts) {
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

export function pairWithSources(consolidatedFacts, candidatesWithSource, existingFacts) {
    const seen = buildSeenSet(existingFacts);
    const result = [];
    for (const fact of consolidatedFacts) {
        const check = FactValidator.validate(fact);
        if (!check.ok) continue;
        const key = check.fact.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const source =
            candidatesWithSource.find((c) => c.fact.toLowerCase() === key) ||
            candidatesWithSource.find((c) =>
                fact.toLowerCase().includes(c.fact.toLowerCase().slice(0, 20))
            ) ||
            candidatesWithSource[0];

        result.push({ fact: check.fact, source });
    }
    return result;
}

export function pairCandidatesAsSources(candidatesWithSource, existingFacts) {
    const seen = buildSeenSet(existingFacts);
    const result = [];
    for (const c of candidatesWithSource) {
        const key = c.fact.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ fact: c.fact, source: c });
    }
    return result;
}