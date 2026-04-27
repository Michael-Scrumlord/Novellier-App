import { FactValidator, extractFactFromArgs } from './FactValidator.js';

// Add facts handler, returns ok, updatedFacts, factsMutated, failureReason?
export function handleAddFact(args, currentFacts) {
    const factStr = extractFactFromArgs(
        args?.factString ?? args?.fact ?? args?.description ?? args?.value
    );
    const check = FactValidator.validate(factStr);

    if (!check.ok) {
        return { ok: false, updatedFacts: currentFacts, factsMutated: false, failureReason: check.reason };
    }

    if (currentFacts.includes(check.fact)) {
        return { ok: true, updatedFacts: currentFacts, factsMutated: false };
    }

    return { ok: true, updatedFacts: [...currentFacts, check.fact], factsMutated: true };
}
