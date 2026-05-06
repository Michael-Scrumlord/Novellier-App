// Helpers for the populate_facts pipeline.
export function extractFactsFromCompletion(raw) {
    if (raw && typeof raw === 'object') {
        return raw.content || '';
    }
    return raw || '';
}

export function parseFactArray(text) {
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

export function parseCompletionAsFacts(raw) {
    return parseFactArray(extractFactsFromCompletion(raw));
}

export function parseCompletionAsIndices(raw) {
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
