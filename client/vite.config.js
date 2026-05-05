import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5000, // Internal port for the Vite dev server

        watch: {
            usePolling: true,
        },

        proxy: {
            '/api': {
                target: 'http://server:5000',
                changeOrigin: true,
                secure: false,
                proxyTimeout: 600000,
            },
        },
    },
});