// Port interface for conversation persistence.
// Implementors: MongoConversationRepository.
export class IConversationRepository {
    async create(entry) {
        throw new Error('Not implemented');
    }

    async list({ limit } = {}) {
        throw new Error('Not implemented');
    }

    async delete(id) {
        throw new Error('Not implemented');
    }
}
