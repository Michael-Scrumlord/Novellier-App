// Ollama implementation of IModelManager. Handles model listing, pull with streamed progress,
// and removal via the Ollama HTTP API. Pull state is persisted to pullProgressStore so the
// client can poll for download status without holding a long-lived HTTP connection.

import { IModelManager } from '../../../core/ports/IModelManager.js';
import { TIMEOUTS } from './ollama-config.js';

export class LocalModelManager extends IModelManager {
    constructor({ transport, pullProgressStore }) {
        super();
        if (!transport) throw new Error('LocalModelManager requires transport');
        if (!pullProgressStore) throw new Error('LocalModelManager requires pullProgressStore');
        this.transport = transport;
        this.pullProgressStore = pullProgressStore;
    }

    async listInstalledModels() {
        const res = await this.transport._get('/api/tags', { timeoutMs: TIMEOUTS.UNARY });
        const data = await res.json();
        return data?.models || [];
    }

    async getPullProgress(modelName) {
        if (modelName) {
            const stored = await this.pullProgressStore.get(modelName);
            return (
                stored || {
                    model: modelName,
                    status: 'idle',
                    completed: null,
                    total: null,
                    percent: 0,
                    updatedAt: new Date().toISOString(),
                }
            );
        }
        return this.pullProgressStore.listAll();
    }

    async pullModelWithProgress(modelName) {
        const existing = await this.pullProgressStore.get(modelName);
        if (existing?.status === 'pulling') {
            return existing;
        }

        await this.pullProgressStore.upsert(modelName, {
            status: 'pulling',
            completed: 0,
            total: null,
            percent: 0,
            updatedAt: new Date().toISOString(),
        });

        const res = await this.transport._post(
            '/api/pull',
            { name: modelName, stream: true },
            { timeoutMs: TIMEOUTS.PULL }
        );
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let lastSeen = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const event = JSON.parse(line);
                    const completed = Number(event.completed || 0);
                    const total = Number(event.total || 0);
                    const percent =
                        total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                    const status = event.status === 'success' ? 'ready' : 'pulling';

                    lastSeen = {
                        status,
                        completed: completed > 0 ? completed : null,
                        total: total > 0 ? total : null,
                        percent: status === 'ready' ? 100 : percent,
                        updatedAt: new Date().toISOString(),
                    };
                    await this.pullProgressStore.upsert(modelName, lastSeen);
                } catch {
                    // Ignore partial/invalid pull stream lines.
                }
            }
        }

        if (lastSeen?.status !== 'ready') {
            await this.pullProgressStore.upsert(modelName, {
                status: 'ready',
                completed: lastSeen?.completed || null,
                total: lastSeen?.total || null,
                percent: 100,
                updatedAt: new Date().toISOString(),
            });
        }
        return this.pullProgressStore.get(modelName);
    }

    async removeModel(modelName) {
        await this.transport._post('/api/delete', { name: modelName }, { timeoutMs: TIMEOUTS.UNARY });
        await this.pullProgressStore.clear(modelName);
        return { model: modelName, status: 'removed' };
    }

    async _markReady(model) {
        await this.pullProgressStore.upsert(model, {
            status: 'ready',
            completed: null,
            total: null,
            percent: 100,
            updatedAt: new Date().toISOString(),
        });
    }
}
