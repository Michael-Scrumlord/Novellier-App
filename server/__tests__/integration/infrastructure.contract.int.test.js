import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const composePath = resolve(repoRoot, 'docker-compose.yml');
const envExamplePath = resolve(repoRoot, '.env.example');

describe('Infrastructure', () => {
    it('docker-compose includes core service names', async () => {
        const compose = await readFile(composePath, 'utf8');

        expect(compose).toContain('server:');
        expect(compose).toContain('client:');
        expect(compose).toContain('mongodb:');
        expect(compose).toContain('chromadb:');
        expect(compose).toContain('ollama:');
        expect(compose).toContain('portainer:');
    });

    it('verifies that docker-compose includes basic network and persistence configuration', async () => {
        const compose = await readFile(composePath, 'utf8');

        expect(compose).toContain('novellier-network');
        expect(compose).toContain('driver: bridge');
        expect(compose).toContain('novellier-mongo-data:/data/db');
        expect(compose).toContain('./ollama_data:/root/.ollama');
    });

    it('verifies that .env.example includes core environment variables', async () => {
        const envExample = await readFile(envExamplePath, 'utf8');

        expect(envExample).toContain('MONGO_URL=');
        expect(envExample).toContain('MONGO_DB=');
        expect(envExample).toContain('CHROMA_URL=');
        expect(envExample).toContain('OLLAMA_URL=');
        expect(envExample).toContain('JWT_SECRET=');
    });

    it.todo('initiates manual smoke check: docker-compose up --build starts services');
    it.todo('initiates manual smoke check: docker-compose logs is accessible');
});
