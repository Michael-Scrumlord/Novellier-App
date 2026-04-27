import { IMongoMonitorPort } from '../../core/ports/IMonitoringPorts.js';

// This adapter implements the IMongoMonitorPort interface, providing a concrete implementation for monitoring MongoDB status.
// Infrastructure concerns such as direct database queries and error handling are encapsulated within this class, keeping the core application logic clean and focused on business rules.
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
