import { richTextToPlainText } from '../domain/RichText.js';
import { chunkText } from '../domain/TextUtils.js';

// In-memory job status per story. Keys are storyId strings.
// Values: { status: 'pending'|'running'|'done'|'error', updatedAt: Date, error?: string }
// This map is intentionally not persisted — it resets on server restart,
// which is fine because embeddings either completed or the user will re-save.
const _jobs = new Map();

// App service for story vector indexing.
// Consumes IVectorRepository (addContextBatch / searchContext / deleteStoryContext / updateTransport).
// Responsible for chunking story sections and upserting them into the vector store, re-indexing on save, and cleaning up on deletion.
export class StoryIndexingService {
    constructor({ vectorRepository }) {
        this.vectorRepository = vectorRepository || null;
    }

    // Returns the current indexing status for a story, or null if never indexed this session.
    getIndexStatus(storyId) {
        return _jobs.get(storyId) ?? null;
    }

    // Schedule async indexing of story content. Safe to call without awaiting.
    triggerIndexing(storyId, metadata) {
        if (!this.vectorRepository || !metadata.sections?.length) return;

        _jobs.set(storyId, { status: 'pending', updatedAt: new Date() });

        this._indexStoryContent(storyId, metadata)
            .then(() => {
                _jobs.set(storyId, { status: 'done', updatedAt: new Date() });
            })
            .catch((err) => {
                console.error('[StoryIndexingService] Failed to index story content:', err.message);
                _jobs.set(storyId, { status: 'error', updatedAt: new Date(), error: err.message });
            });
    }

    deleteStoryContext(storyId) {
        if (!this.vectorRepository) return;
        _jobs.delete(storyId);

        this.vectorRepository.deleteStoryContext(storyId).catch((err) => {
            console.error('[StoryIndexingService] Failed to delete story context:', err.message);
        });
    }


    async _indexStoryContent(storyId, { title, genre, templateId, sections }) {
        _jobs.set(storyId, { status: 'running', updatedAt: new Date() });

        if (this.vectorRepository?.deleteStoryContext) {
            await this.vectorRepository.deleteStoryContext(storyId);
        }

        // Section chunks preserve ordering and carry beat metadata for targeted retrieval.
        const items = sections
            .map((section) => ({
                ...section,
                plainContent: richTextToPlainText(section.content),
            }))
            .filter((section) => section.plainContent && section.plainContent.length > 0)
            .flatMap((section) => {
                const sectionKey = section.beatKey || section.id || 'section';
                const chunks = chunkText(section.plainContent, 1600, 200);

                return chunks.map((chunkContent, chunkIndex) => {
                    const sectionId = `${storyId}__${sectionKey}__c${chunkIndex}`;
                    const fullText = section.title
                        ? `${section.title}\n\n${chunkContent}`
                        : chunkContent;

                    return {
                        id: sectionId,
                        text: fullText,
                        alreadyNormalized: true,
                        metadata: {
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
                        },
                    };
                });
            });

        if (items.length === 0) {
            _jobs.set(storyId, { status: 'done', updatedAt: new Date() });
            return;
        }

        // Single batched embedding call + single Chroma upsert via the repo's
        // addContextBatch (chunks internally to MAX_EMBED_BATCH).
        await this.vectorRepository.addContextBatch(items);
    }
}
