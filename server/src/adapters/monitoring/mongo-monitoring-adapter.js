// Provides MongoDB status by querying the database directly.
// Infrastructure concerns such as connection handling and error translation are encapsulated here.
export class MongoMonitoringAdapter {
    constructor({ db }) {
        this.db = db;
    }

    async getStatus() {
        if (!this.db) {
            throw new Error('MongoDB connection not available');
        }

        const dbAdmin = this.db.admin();
        const serverStatus = await dbAdmin.serverStatus();

        const collectionsInfo = await this.db.listCollections().toArray();
        const collectionNames = collectionsInfo.map((c) => c.name);

        const counts = {};
        const collectionSizes = {};

        for (const name of collectionNames) {
            try {
                const collStats = await this.db.command({ collStats: name });
                counts[name] = collStats.count;
                collectionSizes[name] = collStats.size;
            } catch {
            }
        }

        return {
            ok: serverStatus.ok === 1,
            db: this.db.databaseName,
            collections: collectionNames,
            counts,
            collectionSizes,
        };
    }
}