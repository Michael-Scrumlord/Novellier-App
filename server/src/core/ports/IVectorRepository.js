/**
 * Port interface for vector search repositories.
 * It should provide semantic search and context storage for story content.
 */
export class IVectorRepository {

    async searchContext(text, options = {}) {
        throw new Error('Not implemented');
    }

    async addContext(id, text, metadata = {}) {
        throw new Error('Not implemented');
    }

    async deleteStoryContext(storyId) {
        throw new Error('Not implemented');
    }

    async warmupEmbeddingModel() {
        throw new Error('Not implemented');
    }
}

