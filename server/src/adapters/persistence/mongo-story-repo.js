// MongoDB adapter for story documents.
// `content` is a flattened readable body; `sections` is the structured editor state and the authoritative edit model.
// Summary fields are denormalized onto the story document for fast reads.
import { ObjectId } from 'mongodb';
import { IStoryRepository } from '../../core/ports/IStoryRepository.js';

const MUTABLE_FIELDS = [
    'title', 'titleHtml', 'chapterHeadingHtml', 'content', 'sections',
    'facts', 'chapterSummaries', 'beatSummaries', 'storySummary', 'genre', 'templateId',
];

function pickDefined(obj, fields) {
    return Object.fromEntries(fields.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
}

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
        storySummary,
        chapterSummaries,
        beatSummaries,
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
        const payload = { ...pickDefined(updates, MUTABLE_FIELDS), updatedAt: new Date() };
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

    mapStory({ _id, ...rest }) {
        return { id: _id.toString(), ...rest };
    }
}
