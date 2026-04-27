// This is the port for story continuity fact reads and writes.
// Consumers: AI Suggestion Service; Implementors: StoryService
// Callers only need the facts array, not the full story document.
export class IStoryFactsGateway {
    /**
     * @param {string} storyId
     * @param {{ userId: string, role: string }} actor
     * @returns {Promise<string[]>}
     */
    async getFacts(storyId, actor) {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} storyId
     * @param {string[]} facts
     * @param {{ userId: string, role: string }} actor
     * @returns {Promise<void>}
     */
    async saveFacts(storyId, facts, actor) {
        throw new Error('Not implemented');
    }
}
