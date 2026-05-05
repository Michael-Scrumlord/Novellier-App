const SINGLETON_KEY = 'ai_job_queue';
// Mongo checkpoint for AIJobQueue, survives container restarts.
export default class MongoJobQueueCheckpointStore {
    constructor({ db, collectionName = 'job_queue_checkpoints' } = {}) {
        if (!db) throw new Error('MongoJobQueueCheckpointStore requires db');
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

    async load() {
        const collection = await this._collection();
        const doc = await collection.findOne({ key: SINGLETON_KEY });
        if (!doc) return null;
        return {
            running: doc.running || 0,
            pending: Array.isArray(doc.pending) ? doc.pending : [],
            snapshotAt: doc.snapshotAt || null,
        };
    }

    async save(snapshot) {
        const collection = await this._collection();
        const now = new Date();
        await collection.updateOne(
            { key: SINGLETON_KEY },
            {
                $set: {
                    running: Number(snapshot.running) || 0,
                    pending: Array.isArray(snapshot.pending) ? snapshot.pending : [],
                    snapshotAt: now,
                },
                $setOnInsert: { key: SINGLETON_KEY, createdAt: now },
            },
            { upsert: true }
        );
    }
}
