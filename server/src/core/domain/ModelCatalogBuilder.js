import {
    normalizeModelName,
    coerceCandidateModelString,
    formatModelLabel,
} from './ModelNameUtils.js';

export function buildConstrainedModelSet(constrainedModels) {
    return new Set((constrainedModels || []).map((model) => normalizeModelName(model)));
}

export function collectCandidates({ localModels, constrainedSet, runtimeModels, installedModels }) {
    const candidatesByNormalized = new Map();

    const register = (value) => {
        const model = coerceCandidateModelString(value);
        if (!model) return;
        const normalized = normalizeModelName(model);
        if (!normalized || candidatesByNormalized.has(normalized)) return;
        candidatesByNormalized.set(normalized, model);
    };

    (localModels || []).forEach(register);
    if (constrainedSet) constrainedSet.forEach(register);
    if (runtimeModels) Object.values(runtimeModels).forEach(register);
    (installedModels || []).forEach((entry) => register(entry?.name));

    return candidatesByNormalized;
}

export function indexInstalledByNormalizedName(installedModels) {
    const indexed = new Map();
    for (const entry of installedModels || []) {
        const key = normalizeModelName(entry?.name || '');
        if (key) indexed.set(key, entry);
    }
    return indexed;
}

export function buildCatalogEntries(candidatesByNormalized, installedByNormalized, constrainedSet) {
    const catalog = [];
    for (const [normalized, model] of candidatesByNormalized.entries()) {
        const installedEntry = installedByNormalized.get(normalized);
        const canonicalModel = installedEntry?.name || model;
        catalog.push({
            model: canonicalModel,
            displayName: formatModelLabel(canonicalModel),
            downloaded: Boolean(installedEntry),
            sizeBytes: Number(installedEntry?.size || 0) || null,
            recommendedConstrained: constrainedSet.has(normalized),
        });
    }
    return catalog;
}
