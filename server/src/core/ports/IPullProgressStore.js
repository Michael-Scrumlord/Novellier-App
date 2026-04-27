// Port for model-pull progress tracking. State survives process restarts so the admin UI
// can keep polling a pull through a server restart. Writes are upserts keyed by model name.
// Implemented by MongoPullProgressStore.
export class IPullProgressStore {
    async get(model) {
        throw new Error('Not implemented');
    }

    async listAll() {
        throw new Error('Not implemented');
    }

    async upsert(model, state) {
        throw new Error('Not implemented');
    }

    async clear(model) {
        throw new Error('Not implemented');
    }
}
