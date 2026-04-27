import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRoutes } from '../../src/adapters/web/routes.js';

const stubController = () => new Proxy({}, { get: () => function stub() {} });
const noop = (_req, _res, next) => next();

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(createRoutes({
        authController:          stubController(),
        userController:          stubController(),
        storyController:         stubController(),
        monitoringController:    stubController(),
        suggestionController:    stubController(),
        modelManagementController: stubController(),
        modelCatalogController:  stubController(),
        conversationController:  stubController(),
        authMiddleware:          noop,
    }));
    return app;
}

describe('GET /api/health — contract', () => {
    let app;

    beforeAll(() => { app = buildApp(); });

    it('responds 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
    });

    it('returns { status: "ok" }', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body).toEqual({ status: 'ok' });
    });

    it('sets Content-Type application/json', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['content-type']).toMatch(/application\/json/);
    });
});
