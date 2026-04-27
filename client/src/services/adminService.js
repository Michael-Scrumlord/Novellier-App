import { request } from '../lib/api.js';

export const adminService = {
    // User management
    listUsers: (token) => request('/api/users', { token }),
    getUser: (token, id) => request(`/api/users/${id}`, { token }),
    createUser: (token, payload) =>
        request('/api/users', { method: 'POST', token, body: payload }),
    updateUser: (token, id, payload) =>
        request(`/api/users/${id}`, { method: 'PUT', token, body: payload }),
    deleteUser: (token, id) =>
        request(`/api/users/${id}`, { method: 'DELETE', token }),

    // Monitoring
    getContainers: (token) => request('/api/containers', { token }),
    getMongoStatus: (token) => request('/api/monitoring/mongo', { token }),
    getVolumeStatus: (token) => request('/api/monitoring/volumes', { token }),

    // Conversation history
    listConversations: (token, limit = 100) =>
        request(`/api/admin/conversations?limit=${limit}`, { token }),
    deleteConversation: (token, id) =>
        request(`/api/admin/conversations/${id}`, { method: 'DELETE', token }),
};
