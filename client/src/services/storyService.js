import { request } from '../lib/api.js';

export const storyService = {
    list: (token) => request('/api/stories', { token }),
    get: (token, id) => request(`/api/stories/${id}`, { token }),
    create: (token, payload) =>
        request('/api/stories', { method: 'POST', token, body: payload }),
    update: (token, id, payload) =>
        request(`/api/stories/${id}`, { method: 'PUT', token, body: payload }),
    remove: (token, id) =>
        request(`/api/stories/${id}`, { method: 'DELETE', token }),
};