const buildHeaders = (token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
};

const request = async (path, { token, method = 'GET', body } = {}) => {
    const response = await fetch(path, {
        method,
        headers: buildHeaders(token),
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed (${response.status})`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

export const api = {
    login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
    logout: (token) => request('/api/auth/logout', { method: 'POST', token }),
    listStories: (token) => request('/api/stories', { token }),
    getStory: (token, id) => request(`/api/stories/${id}`, { token }),
    createStory: (token, payload) => request('/api/stories', { method: 'POST', token, body: payload }),
    updateStory: (token, id, payload) =>
        request(`/api/stories/${id}`, { method: 'PUT', token, body: payload }),
    deleteStory: (token, id) => request(`/api/stories/${id}`, { method: 'DELETE', token }),
    getSuggestion: (token, payload) => request('/api/suggest', { method: 'POST', token, body: payload }),
    getSuggestionStream: async (token, payload, onChunk, signal) => {
        const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ ...payload, stream: true }),
        signal
        });

        if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter((line) => line.trim().startsWith('data: '));

            for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                throw new Error(parsed.error);
                }
                if (parsed.chunk) {
                fullResponse += parsed.chunk;
                onChunk(parsed.chunk);
                }
                if (parsed.done) {
                return fullResponse;
                }
            } catch (e) {
                if (e.message !== 'Unexpected end of JSON input') {
                throw e;
                }
            }
            }
        }
        } finally {
        reader.releaseLock();
        }

        return fullResponse;
    },
    listUsers: (token) => request('/api/users', { token }),
    getUser: (token, id) => request(`/api/users/${id}`, { token }),
    createUser: (token, payload) => request('/api/users', { method: 'POST', token, body: payload }),
    updateUser: (token, id, payload) => request(`/api/users/${id}`, { method: 'PUT', token, body: payload }),
    deleteUser: (token, id) => request(`/api/users/${id}`, { method: 'DELETE', token }),
    getContainers: (token) => request('/api/containers', { token }),
    getMongoStatus: (token) => request('/api/monitoring/mongo', { token }),
    ensureModel: (token, model) =>
        request('/api/models/ensure', { method: 'POST', token, body: { model } }),
    warmupModel: (token, model) =>
        request('/api/ai/warmup', { method: 'POST', token, body: { model } }),
    keepAliveModel: (token, model) =>
        request('/api/ai/keepalive', { method: 'POST', token, body: { model } })
};
