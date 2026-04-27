import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import ModelCatalogController from '../../src/adapters/web/model-catalog-controller.js';
import { createAuthMiddleware } from '../../src/adapters/web/auth-middleware.js';
import { createRoutes } from '../../src/adapters/web/routes.js';

const JWT_SECRET = 'test-secret-do-not-use-in-prod';

const modelCatalogService = {
    getCatalog: async () => ({
        models: [
            { installedTags: [{ name: 'llama3.2:3b' }, { name: 'llama3.2:1b' }] },
            { installedTags: [{ name: 'mistral:7b' }] },
        ],
    }),
    getModelDetails: async () => ({ details: {} }),
};

// fallback — only used if modelCatalogService throws
const modelManagementService = {
    getModelCatalog: async () => [],
    getActiveModels: () => ({}),
    getPullProgress: async () => null,
};

const stub = () => new Proxy({}, { get: () => function () {} });

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(createRoutes({
        modelCatalogController: new ModelCatalogController({ modelCatalogService, modelManagementService }),
        authMiddleware: createAuthMiddleware({ jwtSecret: JWT_SECRET }),
        authController: stub(),
        userController: stub(),
        storyController: stub(),
        monitoringController: stub(),
        suggestionController: stub(),
        modelManagementController: stub(),
        conversationController: stub(),
    }));
    return app;
}

describe('Model Catalog contract', () => {
    let app;
    let token;

    beforeAll(() => {
        app   = buildApp();
        token = jwt.sign({ sub: 'user-001', username: 'testuser', role: 'user' }, JWT_SECRET);
    });

    describe('GET /api/models', () => {
        it('200 — returns modelGroups, each with a label and options array', async () => {
            const res = await request(app)
                .get('/api/models')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.modelGroups)).toBe(true);

            for (const group of res.body.modelGroups) {
                expect(typeof group.label).toBe('string');
                expect(Array.isArray(group.options)).toBe(true);
            }
        });

        it('each option carries the value + label fields a model selector needs', async () => {
            const res = await request(app)
                .get('/api/models')
                .set('Authorization', `Bearer ${token}`);

            const options = res.body.modelGroups.flatMap((g) => g.options);
            expect(options.length).toBeGreaterThan(0);

            for (const option of options) {
                expect(typeof option.value).toBe('string');
                expect(typeof option.label).toBe('string');
            }
        });

        it('contains every seeded model tag', async () => {
            const res = await request(app)
                .get('/api/models')
                .set('Authorization', `Bearer ${token}`);

            const values = res.body.modelGroups.flatMap((g) => g.options).map((o) => o.value);
            expect(values).toContain('llama3.2:3b');
            expect(values).toContain('llama3.2:1b');
            expect(values).toContain('mistral:7b');
        });

        it('401 — rejects an unauthenticated request', async () => {
            const res = await request(app).get('/api/models');
            expect(res.status).toBe(401);
        });
    });
});
