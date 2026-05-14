// Persistent JWT blocklist keyed by `jti` (token ID) with TTL-driven cleanup.
//
// Why this exists: JWTs cannot be revoked by design — once issued, they are
// valid until they expire. To make logout meaningful, we record the token's
// `jti` claim here on logout and reject any subsequent presentation of the
// same `jti` until its `exp` passes. The Mongo TTL index sweeps expired
// entries automatically so the collection never grows unbounded.
//
// The class deliberately accepts a tokenBlocklist-shaped `null` fallback so
// unit tests and synthetic environments can run without a Mongo collection.

export class MongoTokenBlocklist {
    /**
     * @param {object} opts
     * @param {object} opts.db - mongodb Db instance
     * @param {string} [opts.collectionName='revoked_tokens']
     */
    constructor({ db, collectionName = 'revoked_tokens' }) {
        if (!db) throw new Error('MongoTokenBlocklist requires a db');
        this.collection = db.collection(collectionName);
        this._indexReady = this._ensureIndex().catch((err) => {
            console.warn('[MongoTokenBlocklist] Failed to create TTL index:', err.message);
        });
    }

    async _ensureIndex() {
        // expireAfterSeconds: 0 means "delete the doc as soon as expiresAt is in the past"
        await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        await this.collection.createIndex({ jti: 1 }, { unique: true });
    }

    /**
     * Revoke a token by its jti. expiresAt should match the token's `exp` claim
     * (as a Date) so the TTL index cleans up after expiration.
     */
    async add(jti, expiresAt) {
        if (!jti) return;
        await this._indexReady;
        const expDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
        await this.collection.updateOne(
            { jti },
            { $set: { jti, expiresAt: expDate, revokedAt: new Date() } },
            { upsert: true }
        );
    }

    async has(jti) {
        if (!jti) return false;
        const doc = await this.collection.findOne({ jti });
        return !!doc;
    }
}

// In-memory fallback — kept for unit tests and environments without Mongo.
// Tokens revoked here are lost on restart, so MongoTokenBlocklist is preferred
// for any deployment with a database.
export class TokenBlocklist {
    constructor() {
        this._revoked = new Set();
    }

    async add(jti) {
        if (!jti) return;
        this._revoked.add(jti);
    }

    async has(jti) {
        if (!jti) return false;
        return this._revoked.has(jti);
    }
}
