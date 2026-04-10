import { ObjectId } from 'mongodb';
import { IStoryRepository } from '../../core/ports/IStoryRepository.js';
import MongoBaseRepository from './mongo-base-repo.js';
import { MONGO_URL, MONGO_DB_NAME } from './mongo-defaults.js';

export default class MongoStoryRepository extends IStoryRepository {
    constructor(config = {}) {
        super();
        this._base = new MongoBaseRepository({
        mongoUrl: config.mongoUrl || MONGO_URL,
        dbName: config.dbName || MONGO_DB_NAME,
        collectionName: config.collectionName || 'stories'
        });
        this._indexed = false;
    }

    async getCollection() {
        const collection = await this._base.getCollection();
        if (!this._indexed) {
        await Promise.all([
            collection.createIndex({ updatedAt: -1 }),
            collection.createIndex({ userId: 1 })
        ]);
        this._indexed = true;
        }
        return collection;
    }

    async createStory({ title, content, sections, genre, templateId, userId, titleHtml, chapterHeadingHtml, storySummaryShort, storySummaryLong, chapterSummaries, beatSummaries, storySummary }) {
        const collection = await this.getCollection();
        const now = new Date();
        const result = await collection.insertOne({
        title,
        titleHtml,
        chapterHeadingHtml,
        content,
        sections,
        chapterSummaries: chapterSummaries || [],
        beatSummaries: beatSummaries || [],
        storySummary: storySummary || '',
        storySummaryShort: storySummaryShort || '',
        storySummaryLong: storySummaryLong || '',
        genre,
        templateId,
        userId,
        createdAt: now,
        updatedAt: now
        });

        return this.getStoryById(result.insertedId.toString());
    }

    async updateStory(id, updates = {}) {
        const collection = await this.getCollection();
        const now = new Date();
        const payload = {
        ...(updates.title !== undefined ? { title: updates.title } : {}),
        ...(updates.titleHtml !== undefined ? { titleHtml: updates.titleHtml } : {}),
        ...(updates.chapterHeadingHtml !== undefined ? { chapterHeadingHtml: updates.chapterHeadingHtml } : {}),
        ...(updates.content !== undefined ? { content: updates.content } : {}),
        ...(updates.sections !== undefined ? { sections: updates.sections } : {}),
        ...(updates.chapterSummaries !== undefined ? { chapterSummaries: updates.chapterSummaries } : {}),
        ...(updates.beatSummaries !== undefined ? { beatSummaries: updates.beatSummaries } : {}),
        ...(updates.storySummary !== undefined ? { storySummary: updates.storySummary } : {}),
        ...(updates.storySummaryShort !== undefined ? { storySummaryShort: updates.storySummaryShort } : {}),
        ...(updates.storySummaryLong !== undefined ? { storySummaryLong: updates.storySummaryLong } : {}),
        ...(updates.genre !== undefined ? { genre: updates.genre } : {}),
        ...(updates.templateId !== undefined ? { templateId: updates.templateId } : {}),
        updatedAt: now
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
        const query = filters.userId ? { userId: filters.userId } : {};
        const stories = await collection.find(query).sort({ updatedAt: -1 }).toArray();
        return stories.map((story) => this.mapStory(story));
    }

    async getRecentStories({ limit = 3, excludeId, userId } = {}) {
        const collection = await this.getCollection();
        const query = {
        ...(excludeId ? { _id: { $ne: new ObjectId(excludeId) } } : {}),
        ...(userId ? { userId } : {})
        };
        const stories = await collection
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .toArray();

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
        chapterSummaries: story.chapterSummaries || [],
        beatSummaries: story.beatSummaries || [],
        storySummary: story.storySummary || '',
        storySummaryShort: story.storySummaryShort || '',
        storySummaryLong: story.storySummaryLong || '',
        genre: story.genre,
        templateId: story.templateId,
        userId: story.userId,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
        };
    }
}
