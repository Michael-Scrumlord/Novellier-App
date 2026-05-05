export function normalizeModelName(modelName) {
    return String(modelName || '').trim().toLowerCase().replace(/:latest$/, '');
}

export function getModelSizeScore(modelName) {
    const normalized = normalizeModelName(modelName);

    const explicitMatch = normalized.match(/(\d+(?:\.\d+)?)([bm])\b/i);
    if (explicitMatch) {
        const value = Number.parseFloat(explicitMatch[1]);
        const unit = explicitMatch[2].toLowerCase();
        return unit === 'm' ? value / 1000 : value;
    }

    const knownSizes = {
        'phi3': 3.8,
        'phi4-mini': 3.8,
        'phi4-mini:3.8b': 3.8,
        'llama3.2': 3.2,
        'mistral': 7,
    };

    for (const [key, score] of Object.entries(knownSizes)) {
        if (normalized.startsWith(key)) return score;
    }

    return Number.POSITIVE_INFINITY;
}

export function coerceModelString(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
}

export function coerceCandidateModelString(value) {
    const candidate = String(value || '').trim();
    return candidate || null;
}

export function formatModelLabel(model) {
    return String(model || '')
        .split(':')[0]
        .split('-')
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join(' ');
}