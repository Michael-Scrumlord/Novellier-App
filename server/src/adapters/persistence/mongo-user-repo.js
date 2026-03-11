import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { IUserRepository } from '../../core/ports/IUserRepository.js';
import MongoBaseRepository from './mongo-base-repo.js';

export default class MongoUserRepository extends IUserRepository {
    /*
    constructor({ mongoUrl, dbName, collectionName } = {}) {
        this.mongoUrl = mongoUrl || process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
        this.dbName = dbName || process.env.MONGO_DB || 'novellier';
        this.collectionName = collectionName || 'users';
        this.client = new MongoClient(this.mongoUrl);
        this.collection = null;
    }
        */

    constructor(config = {}) {
        super();
        this._base = new MongoBaseRepository({
        mongoUrl: config.mongoUrl || 'mongodb://mongodb:27017/novellier',
        dbName: config.dbName || 'novellier',
        collectionName: config.collectionName || 'users'
        });
        this._indexed = false;
    }

    async getCollection() {
        const collection = await this._base.getCollection();
        if (!this._indexed) {
        await collection.createIndex({ username: 1 }, { unique: true });
        this._indexed = true;
        }
        return collection;
    }

    async createUser({ username, password, role = 'user', firstName = '', lastName = '', email = '', profilePicture = null, uuid }) {
        const collection = await this.getCollection();
        const now = new Date();

        const result = await collection.insertOne({
            username,
            password,
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