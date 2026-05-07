// Catch-all port for ancillary persistence concerns that don't merit their own bounded
// repository: job-queue checkpoints, AI conversation log writes, and key/value config
// settings (runtime model roles, ollama endpoint, llm params, etc.). Implemented by
// MongoInfrastructureRepository.
export class IInfrastructureRepository {
    async saveCheckpoint(payload) {
        throw new Error('Not implemented');
    }

    async createConversation(entry) {
        throw new Error('Not implemented');
    }

    async getSetting(key) {
        throw new Error('Not implemented');
    }

    async saveSetting(key, value) {
        throw new Error('Not implemented');
    }
}
