// Port interface for story persistence.
// Implementors: MongoStoryRepository.
export class IStoryRepository {
    async createStory(story) {
        throw new Error('Not implemented');
    }

    async updateStory(id, updates) {
        throw new Error('Not implemented');
    }

    async deleteStory(id) {
        throw new Error('Not implemented');
    }

    async getStoryById(id) {
        throw new Error('Not implemented');
    }

    async listStories() {
        throw new Error('Not implemented');
    }

    async getRecentStories() {
        throw new Error('Not implemented');
    }
}
