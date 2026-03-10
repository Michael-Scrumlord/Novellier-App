import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';

/**
 * Basic unit tests for server configuration
 * These test individual pieces without needing the full server running
 */
describe('Server Configuration Tests', () => {

    it('checks if health endpoint returns 200 OK status', async () => {
        const app = express();
        app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });

        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
