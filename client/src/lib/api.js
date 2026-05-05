import { parseSSEStream } from './sseParser.js';

function buildHeaders(token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

export async function request(path, { token, method = 'GET', body } = {}) {
    const response = await fetch(path, {
        method,
        headers: buildHeaders(token),
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed (${response.status})`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

export async function requestStream(path, { token, body, signal } = {}, callbacks = {}) {
    const response = await fetch(path, {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify(body),
        signal,
    });

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return parseSSEStream(response.body.getReader(), callbacks);
}