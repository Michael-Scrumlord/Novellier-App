// MongoDB adapter for story documents.
// `content` is a flattened readable body; `sections` is the structured editor state and the authoritative edit model.
// Summary fields are denormalized onto the story document for fast reads.
import { ObjectId } from 'mongodb';
import { IStoryRepository } from '../../core/ports/IStoryRepository.js';

export default class MongoStoryRepository extends IStoryRepository {
    constructor(config = {}) {
        super();
        this.db = config.db;
        this.collectionName = config.collectionName || 'stories';
        this._indexed = false;
    }

    async getCollection() {
        const collection = this.db.collection(this.collectionName);
        if (!this._indexed) {
            await Promise.all([
                collection.createIndex({ updatedAt: -1 }),
                collection.createIndex({ userId: 1 }),
            ]);
            this._indexed = true;
        }
        return collection;
    }

    async createStory({
        title,
        content,
        sections,
        facts,
        genre,
        templateId,
        userId,
        titleHtml,
        chapterHeadingHtml,
        storySummaryShort,
        storySummaryLong,
        chapterSummaries,
        beatSummaries,
        storySummary,
    }) {
        const collection = await this.getCollection();
        const now = new Date();
        const result = await collection.insertOne({
            title,
            titleHtml,
            chapterHeadingHtml,
            content,
            sections,
            facts: Array.isArray(facts) ? facts : [],
            chapterSummaries: chapterSummaries || [],
            beatSummaries: beatSummaries || [],
            storySummary: storySummary || '',
            storySummaryShort: storySummaryShort || '',
            storySummaryLong: storySummaryLong || '',
            genre,
            templateId,
            userId,
            createdAt: now,
            updatedAt: now,
        });

        return this.getStoryById(result.insertedId.toString());
    }

    async updateStory(id, updates = {}) {
        const collection = await this.getCollection();
        const now = new Date();
        // Only include fields that were explicitly provided — never overwrite existing values with undefined.
        const payload = {
            ...(updates.title !== undefined ? { title: updates.title } : {}),
            ...(updates.titleHtml !== undefined ? { titleHtml: updates.titleHtml } : {}),
            ...(updates.chapterHeadingHtml !== undefined ? { chapterHeadingHtml: updates.chapterHeadingHtml } : {}),
            ...(updates.content !== undefined ? { content: updates.content } : {}),
            ...(updates.sections !== undefined ? { sections: updates.sections } : {}),
            ...(updates.facts !== undefined ? { facts: updates.facts } : {}),
            ...(updates.chapterSummaries !== undefined ? { chapterSummaries: updates.chapterSummaries } : {}),
            ...(updates.beatSummaries !== undefined ? { beatSummaries: updates.beatSummaries } : {}),
            ...(updates.storySummary !== undefined ? { storySummary: updates.storySummary } : {}),
            ...(updates.storySummaryShort !== undefined ? { storySummaryShort: updates.storySummaryShort } : {}),
            ...(updates.storySummaryLong !== undefined ? { storySummaryLong: updates.storySummaryLong } : {}),
            ...(updates.genre !== undefined ? { genre: updates.genre } : {}),
            ...(updates.templateId !== undefined ? { templateId: updates.templateId } : {}),
            updatedAt: now,
        };

        await collection.updateOne({ _id: new ObjectId(id) }, { $set: payload });
        return this.getStoryById(id);
    }

    async deleteStory(id) {
        const collection = await this.getCollection();
        await collection.deleteOne({ _id: new ObjectId(id) });
        return { id };
    }

    async getStoryById(id) {
        const collection = await this.getCollection();
        const story = await collection.findOne({ _id: new ObjectId(id) });
        return story ? this.mapStory(story) : null;
    }

    async listStories(filters = {}) {
        const collection = await this.getCollection();
        // Access control: non-admin callers pass userId from the service layer.
        const query = filters.userId ? { userId: filters.userId } : {};
        const stories = await collection.find(query).sort({ updatedAt: -1 }).toArray();
        return stories.map((story) => this.mapStory(story));
    }

    async getRecentStories({ limit = 3, excludeId, userId } = {}) {
        const collection = await this.getCollection();
        const query = {
            ...(excludeId ? { _id: { $ne: new ObjectId(excludeId) } } : {}),
            ...(userId ? { userId } : {}),
        };
        const stories = await collection.find(query).sort({ updatedAt: -1 }).limit(limit).toArray();
        return stories.map((story) => this.mapStory(story));
    }

    mapStory(story) {
        return {
            id: story._id.toString(),
            title: story.title,
            titleHtml: story.titleHtml,
            chapterHeadingHtml: story.chapterHeadingHtml,
            content: story.content,
            sections: story.sections,
            facts: story.facts || [],
            chapterSummaries: story.chapterSummaries || [],
            beatSummaries: story.beatSummaries || [],
            storySummary: story.storySummary || '',
            storySummaryShort: story.storySummaryShort || '',
            storySummaryLong: story.storySummaryLong || '',
            genre: story.genre,
            templateId: story.templateId,
            userId: story.userId,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
        };
    }
}
