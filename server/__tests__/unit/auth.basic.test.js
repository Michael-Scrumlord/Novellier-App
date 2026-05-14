import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRoutes } from '../../src/adapters/web/routes.js';
import { createAuthMiddleware } from '../../src/adapters/web/auth-middleware.js';

// Minimal stub: every controller key createRoutes destructures must be
// present (and each property used in route registration must be a function),
// otherwise route registration crashes before any test request is made.
// We use a Proxy so we don't have to enumerate every method.
const stubController = () =>
    new Proxy(
        {},
        {
            get: () => (_req, res) => res.status(501).json({ error: 'stub' }),
        }
    );

const buildDeps = (overrides = {}) => ({
    authController: stubController(),
    userController: stubController(),
    storyController: stubController(),
    monitoringController: stubController(),
    suggestionController: stubController(),
    modelManagementController: stubController(),
    modelCatalogController: stubController(),
    conversationController: stubController(),
    authMiddleware: (_req, _res, next) => next(),
    ...overrides,
});

describe('Authentication Tests', () => {
    it('verifies POST /api/auth/logout returns 200 and logged out message', async () => {
        const app = express();
        app.use(express.json());

        const authController = {
            login: async (_req, res) =>
                res.json({ token: 'fake-token', user: { id: 'u1', role: 'admin' } }),
            logout: async (_req, res) => res.status(200).json({ message: 'Logged out' }),
        };

        app.use(createRoutes(buildDeps({ authController })));

        const response = await request(app).post('/api/auth/logout').send({});

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'Logged out' });
    });

    it('verifies authMiddleware returns 401 for invalid JWT token', async () => {
        const app = express();
        const authMiddleware = createAuthMiddleware({ jwtSecret: 'test-secret' });

        app.get('/protected', authMiddleware, (_req, res) => {
            res.json({ ok: true });
        });

        const response = await request(app)
            .get('/protected')
            .set('Authorization', 'Bearer invalid');

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ error: 'Unauthorized' });
    });
});
