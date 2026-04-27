import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import StoryController from '../../src/adapters/web/story-controller.js';
import { createAuthMiddleware } from '../../src/adapters/web/auth-middleware.js';
import { createRoutes } from '../../src/adapters/web/routes.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const JWT_SECRET = 'test-secret-do-not-use-in-prod';

const STORY = {
    id: 'story-001',
    title: 'The Last Ember',
    genre: 'fantasy',
    sections: [],
    userId: 'user-001',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
};

const storyService = {
    createStory: async (payload) => ({ ...STORY, ...payload, id: STORY.id }),
    getStoryById: async (id) => (id === STORY.id ? STORY : null),
    listStories: async () => [STORY],
    updateStory: async (_id, patch) => ({ ...STORY, ...patch }),
    deleteStory: async () => {},
};

// ── App factory ───────────────────────────────────────────────────────────────

const stub = () => new Proxy({}, { get: () => function () {} });

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(createRoutes({
        storyController:           new StoryController({ storyService }),
        authMiddleware:            createAuthMiddleware({ jwtSecret: JWT_SECRET }),
        authController:            stub(),
        userController:            stub(),
        monitoringController:      stub(),
        suggestionController:      stub(),
        modelManagementController: stub(),
        modelCatalogController:    stub(),
        conversationController:    stub(),
    }));
    return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Story contract', () => {
    let app;
    let token;

    beforeAll(() => {
        app   = buildApp();
        token = jwt.sign({ sub: 'user-001', username: 'testuser', role: 'user' }, JWT_SECRET);
    });

    // ── POST /api/stories ─────────────────────────────────────────────────────

    describe('POST /api/stories', () => {
        it('201 — creates a story draft and returns the story object', async () => {
            const res = await request(app)
                .post('/api/stories')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'The Last Ember', genre: 'fantasy', sections: [] });

            expect(res.status).toBe(201);
            expect(res.body.story).toMatchObject({
                id:    expect.any(String),
                title: 'The Last Ember',
                genre: 'fantasy',
            });
            expect(Array.isArray(res.body.story.sections)).toBe(true);
        });

        it('401 — rejects an unauthenticated request', async () => {
            const res = await request(app)
                .post('/api/stories')
                .send({ title: 'Draft', genre: 'mystery' });

            expect(res.status).toBe(401);
        });
    });

    // ── GET /api/stories/:id ──────────────────────────────────────────────────

    describe('GET /api/stories/:id', () => {
        it('200 — retrieves a story by id with expected shape', async () => {
            const res = await request(app)
                .get(`/api/stories/${STORY.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.story).toMatchObject({
                id:    STORY.id,
                title: STORY.title,
                genre: STORY.genre,
            });
            expect(Array.isArray(res.body.story.sections)).toBe(true);
        });

        it('404 — returns an error body for an unknown id', async () => {
            const res = await request(app)
                .get('/api/stories/does-not-exist')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    // ── GET /api/stories ──────────────────────────────────────────────────────

    describe('GET /api/stories', () => {
        it('200 — returns a stories array', async () => {
            const res = await request(app)
                .get('/api/stories')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.stories)).toBe(true);
        });
    });
});
