// Integration contract for the Auth and User HTTP layers.
// Verifies login, JWT issuance, and that protected routes reject unauthenticated requests.
import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import AuthController from '../../src/adapters/web/auth-controller.js';
import UserController from '../../src/adapters/web/user-controller.js';
import { createAuthMiddleware } from '../../src/adapters/web/auth-middleware.js';
import { createRoutes } from '../../src/adapters/web/routes.js';

const JWT_SECRET = 'test-secret-do-not-use-in-prod';

const ADMIN_USER = {
    id: 'user-001', uuid: 'uuid-001', username: 'admin',
    firstName: 'Test', lastName: 'Admin', email: 'admin@example.com',
    profilePicture: null, role: 'admin',
    createdAt: '1963-11-22T00:00:00.000Z', updatedAt: '1963-11-22T00:00:00.000Z',
};

const userService = {
    verifyPassword: async (username, password) =>
        username === ADMIN_USER.username && password === 'correct-password'
            ? ADMIN_USER : null,
    listUsers: async () => [ADMIN_USER],
};

const stub = () => new Proxy({}, { get: () => function () {} });

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(createRoutes({
        authController:            new AuthController({ userService, jwtSecret: JWT_SECRET }),
        userController:            new UserController({ userService }),
        authMiddleware:            createAuthMiddleware({ jwtSecret: JWT_SECRET }),
        storyController:           stub(),
        monitoringController:      stub(),
        suggestionController:      stub(),
        modelManagementController: stub(),
        modelCatalogController:    stub(),
        conversationController:    stub(),
    }));
    return app;
}

describe('Auth + User contract', () => {
    let app;
    beforeAll(() => { app = buildApp(); });

    describe('POST /api/auth/login', () => {
        it('200 — returns a signed JWT and full user profile on valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'correct-password' });

            expect(res.status).toBe(200);

            // Token must be a three-segment JWT string
            expect(typeof res.body.token).toBe('string');
            expect(res.body.token.split('.')).toHaveLength(3);

            // User payload must carry the fields a frontend depends on
            expect(res.body.user).toMatchObject({
                id:       ADMIN_USER.id,
                username: ADMIN_USER.username,
                role:     ADMIN_USER.role,
                email:    ADMIN_USER.email,
                uuid:     ADMIN_USER.uuid,
            });
        });

        it('401 — rejects invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin', password: 'wrong-password' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('400 — rejects a request with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'admin' }); // no password

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('GET /api/users (admin-protected)', () => {
        it('401 — rejects with no Authorization header', async () => {
            const res = await request(app).get('/api/users');

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Unauthorized' });
        });

        it('401 — rejects with a malformed Bearer token', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', 'Bearer not.a.real.token');

            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Unauthorized' });
        });
    });
});
