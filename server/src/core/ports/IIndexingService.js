// The driving port for story vector indexing.
// Consumed by StoryService, fire and forget after save/delete. Implemented by StoryIndexingService.
export class IIndexingService {
    /**
     * Schedule background indexing for a story.
     * @param {string} storyId
     * @param {{ title, genre, templateId, sections }} metadata
     */
    triggerIndexing(storyId, metadata) {
        throw new Error('Not implemented');
    }

    /**
     * Remove all vector chunks for a story.
     * @param {string} storyId
     */
    deleteStoryContext(storyId) {
        throw new Error('Not implemented');
    }
}
