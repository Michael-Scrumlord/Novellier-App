import { request } from '../lib/api.js';

export const authService = {
    login: (credentials) =>
        request('/api/auth/login', { method: 'POST', body: credentials }),
    logout: (token) =>
        request('/api/auth/logout', { method: 'POST', token }),
    updateSelf: (token, id, payload) =>
        request(`/api/users/${id}`, { method: 'PUT', token, body: payload }),
};