function sortModels(models) {
    return [...models].sort((a, b) => {
        if (a.active?.suggestion !== b.active?.suggestion) {
            return a.active?.suggestion ? -1 : 1;
        }
        if (a.downloaded !== b.downloaded) {
            return a.downloaded ? -1 : 1;
        }
        return a.family.localeCompare(b.family);
    });
}

function matchesSearch(entry, query) {
    if (!query) return true;
    const haystack = [entry.family, entry.displayName, entry.description, ...(entry.sizeTags || [])]
        .filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
}

export function filterAndSortModels(models, query) {
    const q = (query || '').toLowerCase();
    return sortModels(models.filter((entry) => matchesSearch(entry, q)));
}

export function pickInitialFamily(models, current) {
    if (current && models.some((m) => m.family === current)) return current;
    return models[0]?.family || '';
}

export function pickInitialVariant(details, current) {
    if (!details) return '';
    if (current && details.variants?.some((v) => v.tag === current)) return current;
    return details.selectedVariant?.tag || details.variants?.[0]?.tag || '';
}

export function resolveSelectedVariant(details, tag) {
    if (!details) return null;
    return details.variants?.find((v) => v.tag === tag)
        || details.selectedVariant
        || details.variants?.[0]
        || null;
}