import { IMongoMonitorPort } from '../../core/ports/IMonitoringPorts.js';

/**
 * Adapter that queries MongoDB admin APIs for database status.
 *
 * Infrastructure concerns isolated here:
 * - Raw MongoDB admin command execution
 * - Collection stat enumeration
 * - Error handling for transient collection issues
 */
export class MongoMonitoringAdapter extends IMongoMonitorPort {
    constructor({ db }) {
        super();
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
                // Ignore transient collection errors
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
