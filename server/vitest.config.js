import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: [
                'node_modules/**',
                '**/__tests__/',
                '**/*.test.js',
                ],
            cleanOnRerun: true,
            reportsDirectory: './coverage',
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        include: ['**/__tests__/**/*.test.js', '**/*.test.js'],
        exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    }
});