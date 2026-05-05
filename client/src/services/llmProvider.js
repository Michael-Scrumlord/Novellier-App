// The LLM Provider Port
// If, one day, I decide I want a new inference backend, like Anthropic or llama.cpp, all of the changes would happen below. 
import { request } from '../lib/api.js';

const PULL_TIMEOUT_MS = 10 * 60 * 1000;
const PULL_POLL_INTERVAL_MS = 1500;

async function delay(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });
}

export const llmProvider = {
    listModels: (token) =>
        request('/api/models', { token }),

    getModelConfig: (token) =>
        request('/api/admin/models/config', { token }),
    getModelCatalog: (token, query = '') =>
        request(
            `/api/admin/models/catalog${query ? `?query=${encodeURIComponent(query)}` : ''}`,
            { token }
        ),
    getModelDetails: (token, model) =>
        request(
            `/api/admin/models/details?model=${encodeURIComponent(model)}`,
            { token }
        ),

    setActiveModel: (token, target, model) =>
        request('/api/admin/models/set-active', {
            method: 'POST',
            token,
            body: { target, model },
        }),
    pullModel: (token, model) =>
        request('/api/admin/models/pull', {
            method: 'POST',
            token,
            body: { model },
        }),
    removeModel: (token, model) =>
        request('/api/admin/models/remove', {
            method: 'POST',
            token,
            body: { model },
        }),
    getPullProgress: (token, model) =>
        request(
            `/api/admin/models/pull-progress${model ? `?model=${encodeURIComponent(model)}` : ''}`,
            { token }
        ),
    async pollPullCompletion(token, model, { onProgress, signal } = {}) {
        const startedAt = Date.now();

        while (Date.now() - startedAt < PULL_TIMEOUT_MS) {
            const response = await request(
                `/api/admin/models/pull-progress?model=${encodeURIComponent(model)}`,
                { token }
            );
            const progress = response?.progress || null;
            const status = progress?.status || 'idle';

            onProgress?.(progress);

            if (status === 'ready') return true;
            if (status === 'error') throw new Error(`Unable to pull ${model}`);

            await delay(PULL_POLL_INTERVAL_MS, signal);
        }
        return false;
    },
    getEndpoint: (token) =>
        request('/api/admin/ollama/endpoint', { token }),
    setEndpoint: (token, url) =>
        request('/api/admin/ollama/endpoint', {
            method: 'PUT',
            token,
            body: { url },
        }),
    testEndpoint: (token, url) =>
        request('/api/admin/ollama/endpoint/test', {
            method: 'POST',
            token,
            body: { url },
        }),
    getLlmModelParams: (token) =>
        request('/api/admin/ollama/params', { token }),
    setLlmModelParams: (token, params) =>
        request('/api/admin/ollama/params', {
            method: 'PUT',
            token,
            body: params,
        }),
    resetLlmModelParams: (token) =>
        request('/api/admin/ollama/params/reset', {
            method: 'POST',
            token,
        }),
};