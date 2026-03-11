import { MongoClient, ObjectId } from 'mongodb';

export default class MongoStoryRepository {
    constructor( {mongoUrl, dbName, collectionName} = {}) {
        this.mongoUrl = mongoUrl || process.env.MONGO_URL;
        this.dbName = dbName || process.env.MONGO_DB;
        this.collectionName = collectionName || process.env.MONGO_COLLECTION|| 'stories';
        this.client = new MongoClient(this.mongoUrl);
        this.collection = null;
    }

    async getCollection() {
        if (!this.collection) {
        await this.client.connect();
        this.collection = this.client.db(this.dbName).collection(this.collectionName);
        await this.collection.createIndex({ updatedAt: -1 });
        await this.collection.createIndex({ userId: 1 });
        }

        return this.collection;
    }

    async createStory({ title, content, sections, genre, templateId, userId, titleHtml, chapterHeadingHtml }) {
        const collection = await this.getCollection();
        const now = new Date();
        const result = await collection.insertOne({
            title,
            titleHtml,
            chapterHeadingHtml,
            content,
            sections,
            genre,
            templateId,
            userId,
            createdAt: now,
            updatedAt: now
        });

        return { id: result.insertedId.toString(), title, content, sections, genre, templateId, userId, createdAt: now, updatedAt: now };
    }
    
    mapStory(story) {
        return {
        id: story._id.toString(),
        title: story.title,
        titleHtml: story.titleHtml,
        chapterHeadingHtml: story.chapterHeadingHtml,
        content: story.content,
        sections: story.sections,
        genre: story.genre,
        templateId: story.templateId,
        userId: story.userId,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt
        };
    }
}