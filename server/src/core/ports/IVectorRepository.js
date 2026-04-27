// Simple port interface for vector search repositories.
// Is it needed? maybe not. Is it cool and does it demonstrate good architecture? Yes. 
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
}
