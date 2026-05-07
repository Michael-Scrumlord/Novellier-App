import { IInfrastructureRepository } from '../../core/ports/IInfrastructureRepository.js';

// Unified Mongo-backed implementation of IInfrastructureRepository. Composes the existing
// checkpoint, conversation, and key/value config stores into a single surface so application
// services don't bind to per-store method shapes.
export default class MongoInfrastructureRepository extends IInfrastructureRepository {
    constructor({ checkpointStore, conversationStore, settingsStore } = {}) {
        super();
        if (!checkpointStore) throw new Error('MongoInfrastructureRepository requires checkpointStore');
        if (!conversationStore) throw new Error('MongoInfrastructureRepository requires conversationStore');
        if (!settingsStore) throw new Error('MongoInfrastructureRepository requires settingsStore');
        this.checkpointStore = checkpointStore;
        this.conversationStore = conversationStore;
        this.settingsStore = settingsStore;
    }

    async saveCheckpoint(payload) {
        return this.checkpointStore.save(payload);
    }

    async createConversation(entry) {
        return this.conversationStore.create(entry);
    }

    async getSetting(key) {
        return this.settingsStore.get(key);
    }

    async saveSetting(key, value) {
        return this.settingsStore.set(key, value);
    }
}
