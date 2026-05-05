import { richTextToPlainText } from '../domain/RichText.js';
import { chunkText } from '../domain/TextUtils.js';

// App service for story vector indexing.
// Responsible for chunking story sections and upserting them into the vector store, re-indexing on save, and cleaning up on deletion.
// Extracted from StoryService to satisfy the single responsibility principle.

export class StoryIndexingService {
    constructor({ vectorRepository, embeddingThrottle }) {
        this.vectorRepository = vectorRepository || null;
        this.embeddingThrottle = embeddingThrottle || null;
    }

    // Schedule async indexing of story content.
    // Safe to call without awaiting. failures are logged
    triggerIndexing(storyId, metadata) {
        if (!this.vectorRepository || !metadata.sections?.length) return;

        this._indexStoryContent(storyId, metadata).catch((err) => {
            console.error('[StoryIndexingService] Failed to index story content:', err.message);
        });
    }

    deleteStoryContext(storyId) {
        if (!this.vectorRepository) return;

        this.vectorRepository.deleteStoryContext(storyId).catch((err) => {
            console.error('[StoryIndexingService] Failed to delete story context:', err.message);
        });
    }


    async _indexStoryContent(storyId, { title, genre, templateId, sections }) {
        if (this.vectorRepository?.deleteStoryContext) {
            await this.vectorRepository.deleteStoryContext(storyId);
        }

        // Section chunks preserve ordering and carry beat metadata for targeted retrieval.
        const tasks = sections
            .map((section) => ({
                ...section,
                plainContent: richTextToPlainText(section.content),
            }))
            .filter((section) => section.plainContent && section.plainContent.length > 0)
            .flatMap((section) => {
                const sectionKey = section.beatKey || section.id || 'section';
                const chunks = chunkText(section.plainContent, 1600, 200);

                return chunks.map((chunkContent, chunkIndex) => () => {
                    const sectionId = `${storyId}__${sectionKey}__c${chunkIndex}`;
                    const fullText = section.title
                        ? `${section.title}\n\n${chunkContent}`
                        : chunkContent;

                    return this.vectorRepository.addContext(sectionId, fullText, {
                        storyId,
                        storyTitle: title,
                        genre: genre || 'unspecified',
                        templateId: templateId || null,
                        sectionId: section.id,
                        beatKey: section.beatKey,
                        sectionTitle: section.title,
                        sectionGuidance: section.guidance || '',
                        chunkIndex,
                        chunkCount: chunks.length,
                        timestamp: new Date().toISOString(),
                    });
                });
            });

        // Throttle embedding generation to protect GPU headroom without stalling indexing.
        const throttle = this.embeddingThrottle;
        const wrapped = throttle
            ? tasks.map((task) => throttle.run(task))
            : tasks.map((task) => task());

        await Promise.allSettled(wrapped);
    }
}