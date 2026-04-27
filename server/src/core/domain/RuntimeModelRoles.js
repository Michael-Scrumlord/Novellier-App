import { coerceModelString } from './ModelNameUtils.js';

export const MODEL_ROLE_TARGETS = Object.freeze(['suggestion', 'summary', 'embedding']);

export function createDefaultRuntimeModels() {
    return { suggestion: null, summary: null, embedding: null };
}

export function assertValidTarget(target) {
    if (!MODEL_ROLE_TARGETS.includes(target)) {
        throw new Error(
            `Invalid target "${target}". Must be one of: ${MODEL_ROLE_TARGETS.join(', ')}`
        );
    }
}

export function sanitizeRuntimeModels(models = {}) {
    const sanitized = {};
    for (const target of MODEL_ROLE_TARGETS) {
        sanitized[target] = coerceModelString(models[target]);
    }
    return sanitized;
}

export function mergePersistedIntoRuntime(current, persisted) {
    const sanitized = sanitizeRuntimeModels(persisted);
    const next = { ...current };
    for (const target of MODEL_ROLE_TARGETS) {
        if (sanitized[target]) next[target] = sanitized[target];
    }
    return next;
}
