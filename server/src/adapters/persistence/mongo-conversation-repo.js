import { ObjectId } from 'mongodb';

// MongoDB adapter for AI conversation persistence.
// Lazily ensures indexes on first access so startup doesn't block on index creation.
export default class MongoConversationRepository {
    constructor(config = {}) {
        this.db = config.db;
        this.collectionName = config.collectionName || 'ai_conversations';
        this._indexed = false;
    }

    async getCollection() {
        const collection = this.db.collection(this.collectionName);
        if (!this._indexed) {
            await Promise.all([
                collection.createIndex({ createdAt: -1 }),
                collection.createIndex({ userId: 1 }),
                collection.createIndex({ storyId: 1 }),
            ]);
            this._indexed = true;
        }
        return collection;
    }

    async create(entry) {
        const collection = await this.getCollection();
        const doc = {
            userId: entry.userId || null,
            interactionId: entry.interactionId || null,
            role: entry.role || 'user',
            storyId: entry.storyId || null,
            model: entry.model || null,
            feedbackType: entry.feedbackType || null,
            prompt: entry.prompt || '',
            response: entry.response || '',
            createdAt: new Date(),
        };
        await collection.insertOne(doc);
        return doc;
    }

    async list({ limit = 100 } = {}) {
        const collection = await this.getCollection();
        return collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    }

    async delete(id) {
        const collection = await this.getCollection();
        await collection.deleteOne({ _id: new ObjectId(id) });
    }
}