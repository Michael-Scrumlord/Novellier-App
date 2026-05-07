// Generic key/value store backed by the app_config Mongo collection. Replaces the
// per-key methods of the previous runtime-model-config repository with a uniform
// get/set surface that MongoInfrastructureRepository exposes via getSetting/saveSetting.
export default class MongoSettingsStore {
    constructor({ db, collectionName = 'app_config' } = {}) {
        if (!db) throw new Error('MongoSettingsStore requires db');
        this.db = db;
        this.collectionName = collectionName;
        this._indexed = false;
    }

    async _collection() {
        const collection = this.db.collection(this.collectionName);
        if (!this._indexed) {
            await collection.createIndex({ key: 1 }, { unique: true });
            this._indexed = true;
        }
        return collection;
    }

    async get(key) {
        const collection = await this._collection();
        const record = await collection.findOne({ key });
        return record?.value ?? null;
    }

    async set(key, value) {
        const collection = await this._collection();
        const now = new Date();
        await collection.updateOne(
            { key },
            {
                $set: { value, updatedAt: now },
                $setOnInsert: { key, createdAt: now },
            },
            { upsert: true }
        );
        return value;
    }
}
