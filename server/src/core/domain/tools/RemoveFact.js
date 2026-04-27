import { extractFactFromArgs } from './FactValidator.js';
// Facts removal handler. Removes facts, returns updated facts and mutation status. 
export function handleRemoveFact(args, currentFacts) {
    const factStr = extractFactFromArgs(
        args?.factString ?? args?.fact ?? args?.description ?? args?.value
    );

    if (!factStr) {
        return { updatedFacts: currentFacts, factsMutated: false };
    }

    const nextFacts = currentFacts.filter((f) => f !== factStr && !f.includes(factStr));
    return { updatedFacts: nextFacts, factsMutated: nextFacts.length !== currentFacts.length };
}
