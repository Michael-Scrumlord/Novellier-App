import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export default class MongoUserRepository {
    constructor({ mongoUrl, dbName, collectionName } = {}) {
        this.mongoUrl = mongoUrl || process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
        this.dbName = dbName || process.env.MONGO_DB || 'novellier';
        this.collectionName = collectionName || 'users';
        this.client = new MongoClient(this.mongoUrl);
        this.collection = null;
    }

    async getCollection() {
        if (!this.collection) {
        await this.client.connect();
        this.collection = this.client.db(this.dbName).collection(this.collectionName);
        await this.collection.createIndex({ username: 1 }, { unique: true });
        }

        return this.collection;
    }

    async createUser({ username, password, role = 'user', firstName = '', lastName = '', email = '', profilePicture = null, uuid }) {
        const collection = await this.getCollection();
        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date();

            const result = await collection.insertOne({
            username,
            password: hashedPassword,
            role,
            firstName,
            lastName,
            email,
            profilePicture,
            uuid: uuid || crypto.randomUUID(),
            createdAt: now,
            updatedAt: now
            });

        return this.getUserById(result.insertedId.toString());
    }

    async deleteUser(id) {
        const collection = await this.getCollection();
        await collection.deleteOne({ _id: new ObjectId(id) });
        return { id };
    }

    async getUserByUsername(username) {
        const collection = await this.getCollection();
        const user = await collection.findOne({ username });
        return user ? this.mapUser(user) : null;
    }

    async listUsers() {
        const collection = await this.getCollection();
        const users = await collection.find({}).sort({ createdAt: -1 }).toArray();
        return users.map((user) => this.mapUser(user));
    }

    mapUser(user) {
        return {
            id: user._id.toString(),
            username: user.username,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            profilePicture: user.profilePicture || null,
            uuid: user.uuid,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
}