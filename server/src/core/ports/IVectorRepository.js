// Port interface for the embedding/vector store. Implemented by ChromaVectorRepository.
// Application services depend on this contract instead of Chroma-specific method shapes.
export class IVectorRepository {
    async addContext(id, text, metadata = {}, options = {}) {
        throw new Error('Not implemented');
    }

    // Batch upsert. items: [{ id, text, metadata }]. Implementations should issue a
    // single batched embedding call (e.g. Ollama /api/embed) and a single Chroma upsert.
    async addContextBatch(items) {
        throw new Error('Not implemented');
    }

    async searchContext(text, options = {}) {
        throw new Error('Not implemented');
    }

    async deleteStoryContext(storyId) {
        throw new Error('Not implemented');
    }

    // Apply transport-level configuration to the vector store. Accepts { baseUrl } pointing
    // at the embedding host (e.g. Ollama URL).
    async updateTransport(config = {}) {
        throw new Error('Not implemented');
    }
}
