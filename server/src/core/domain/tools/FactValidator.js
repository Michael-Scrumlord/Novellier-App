export const FactValidator = {
    normalize: (value) => String(value || '').trim().replace(/\s+/g, ' '),
    validate: (value) => {
        const fact = FactValidator.normalize(value);
        if (fact.endsWith('?')) {
            return { ok: false, fact, reason: 'fact_must_not_be_a_question' };
        }
        const words = fact.split(/\s+/).filter(Boolean);
        if (words.length < 5) {
            return { ok: false, fact, reason: 'fact_must_have_at_least_5_words' };
        }
        return { ok: true, fact, reason: null };
    },
};

// Extracts facts string from various argument formats and handles model output variations.. sort of gracefully.
export function extractFactFromArgs(value) {
    if (typeof value === 'string' && value.trim().match(/^[\{\[]/)) {
        try {
            const obj = JSON.parse(value.trim());
            if (obj && typeof obj === 'object') {
                value = obj.factString ?? obj.fact ?? obj.description ?? obj.value ?? '';
            }
        } catch {
        }
    }

    if (value && typeof value === 'object') {
        return extractFactFromArgs(value.factString ?? value.fact ?? value.description ?? value.value ?? '');
    }

    return String(value || '').trim();
}
