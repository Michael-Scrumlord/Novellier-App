import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import SuggestionController from '../../src/adapters/web/suggestion-controller.js';
import { createAuthMiddleware } from '../../src/adapters/web/auth-middleware.js';
import { createRoutes } from '../../src/adapters/web/routes.js';

const JWT_SECRET = 'test-secret-do-not-use-in-prod';

function parseSseFrames(text) {
    return text
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => JSON.parse(line.slice(6)));
}
// emits two text chunks then returns, allowing the controller
// to write the terminal frame and close the stream naturally.
const suggestionService = {
    getSuggestion: async (_storyText, options) => {
        await options.onChunk('The forest was');
        await options.onChunk(' dark and silent.');
    },
};

const stub = () => new Proxy({}, { get: () => function () { } });

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(createRoutes({
        suggestionController: new SuggestionController({ suggestionService, runtimeModels: {} }),
        authMiddleware: createAuthMiddleware({ jwtSecret: JWT_SECRET }),
        authController: stub(),
        userController: stub(),
        storyController: stub(),
        monitoringController: stub(),
        modelManagementController: stub(),
        modelCatalogController: stub(),
        conversationController: stub(),
    }));
    return app;
}

describe('Semantic Search / AI Suggestion contract — POST /api/suggest', () => {
    let app;
    let token;

    beforeAll(() => {
        app = buildApp();
        token = jwt.sign({ sub: 'user-001', username: 'testuser', role: 'user' }, JWT_SECRET);
    });

    it('200 — responds with text/event-stream', async () => {
        const res = await request(app)
            .post('/api/suggest')
            .set('Authorization', `Bearer ${token}`)
            .send({ storyText: 'The forest was dark.', storyId: 'story-001' });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    });

    it('intermediate frames carry { chunk: string, done: false }', async () => {
        const res = await request(app)
            .post('/api/suggest')
            .set('Authorization', `Bearer ${token}`)
            .send({ storyText: 'The forest was dark.' });

        const chunks = parseSseFrames(res.text).filter((f) => f.done === false);

        expect(chunks.length).toBeGreaterThan(0);
        for (const frame of chunks) {
            expect(typeof frame.chunk).toBe('string');
        }
    });

    it('terminal frame sets done: true and carries fullResponse', async () => {
        const res = await request(app)
            .post('/api/suggest')
            .set('Authorization', `Bearer ${token}`)
            .send({ storyText: 'The forest was dark.' });

        const frames = parseSseFrames(res.text);
        const terminal = frames.at(-1);

        expect(terminal.done).toBe(true);
        expect(typeof terminal.fullResponse).toBe('string');
        expect(terminal.fullResponse.length).toBeGreaterThan(0);
    });

    it('fullResponse is the concatenation of all chunk values', async () => {
        const res = await request(app)
            .post('/api/suggest')
            .set('Authorization', `Bearer ${token}`)
            .send({ storyText: 'The forest was dark.' });

        const frames = parseSseFrames(res.text);
        const assembled = frames.filter((f) => !f.done).map((f) => f.chunk).join('');
        const terminal = frames.at(-1);

        expect(terminal.fullResponse).toBe(assembled);
    });

    it('400 — rejects when storyText is absent', async () => {
        const res = await request(app)
            .post('/api/suggest')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('401 — rejects an unauthenticated request', async () => {
        const res = await request(app)
            .post('/api/suggest')
            .send({ storyText: 'The forest was dark.' });

        expect(res.status).toBe(401);
    });
});
