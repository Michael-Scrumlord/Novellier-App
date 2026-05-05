import { requestStream } from '../lib/api.js';

export const aiService = {
    streamSuggestion: (token, payload, { onChunk, onEvent, onProgress, signal } = {}) =>
        requestStream(
            '/api/suggest',
            { token, body: { ...payload, stream: true }, signal },
            { onChunk, onEvent, onProgress }
        ),
};