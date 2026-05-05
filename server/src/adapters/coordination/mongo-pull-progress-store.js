// Mongo backed pull progress store
export default class MongoPullProgressStore {
    constructor({ db, collectionName = 'pull_progress' } = {}) {
        if (!db) throw new Error('MongoPullProgressStore requires db');
        this.db = db;
        this.collectionName = collectionName;
        this._indexed = false;
    }

    async _collection() {
        const collection = this.db.collection(this.collectionName);
        if (!this._indexed) {
            await collection.createIndex({ model: 1 }, { unique: true });
            this._indexed = true;
        }
        return collection;
    }

    async get(model) {
        if (!model) return null;
        const collection = await this._collection();
        const doc = await collection.findOne({ model });
        return doc ? stripId(doc) : null;
    }

    async listAll() {
        const collection = await this._collection();
        const docs = await collection.find({}).toArray();
        return docs.map(stripId);
    }

    async upsert(model, state) {
        if (!model) return;
        const collection = await this._collection();
        const updatedAt = new Date();
        await collection.updateOne(
            { model },
            {
                $set: { ...state, model, updatedAt },
                $setOnInsert: { createdAt: updatedAt },
            },
            { upsert: true }
        );
    }

    async clear(model) {
        if (!model) return;
        const collection = await this._collection();
        await collection.deleteOne({ model });
    }
}

function stripId(doc) {
    if (!doc) return doc;
    const { _id, createdAt, ...rest } = doc;
    return rest;
}