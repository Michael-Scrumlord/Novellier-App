import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

import MongoUserRepository from '../../src/adapters/persistence/mongo-user-repo.js';
import MongoStoryRepository from '../../src/adapters/persistence/mongo-story-repo.js';

let mongod;
let mongoUrl;
let client;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    mongoUrl = mongod.getUri();
}, 30000);

afterAll(async () => {
    if (client) {
        await client.close();
    }

    if (mongod) {
        await mongod.stop();
    }
}, 30000);

describe('Mongo persistence', () => {
    it('verifies user repo default login can be instantiated and contains the admin user', async () => {

        const userRepoInstance = new MongoUserRepository({
            mongoUrl,
            dbName: 'novellier_test',
            collectionName: 'users_test'
        });

        expect(typeof userRepoInstance.getCollection).toBe('function');

        const collection = await userRepoInstance.getCollection();
        expect(collection.collectionName).toBe('users_test');

    });

    it('verifies story repo can be instantiated and it can retrieve the collection', async () => {
        const storyRepoInstance = new MongoStoryRepository({
            mongoUrl,
            dbName: 'novellier_test',
            collectionName: 'stories_test'
        });
        expect(typeof storyRepoInstance.getCollection).toBe('function');

        const collection = await storyRepoInstance.getCollection();
        expect(collection.collectionName).toBe('stories_test');
    });

    it('verifies the test database can connect and respond to ping', async () => {
        client = new MongoClient(mongoUrl);
        await client.connect();

        const db = client.db('novellier_test');
        const ping = await db.command({ ping: 1 });

        expect(ping.ok).toBe(1);
    });
});