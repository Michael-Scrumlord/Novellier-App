import express from 'express';
import cors from 'cors';
import { seedDefaultAdmin } from '../src/config/seed.js';
import { createRoutes } from './adapters/web/routes.js';
import { buildDependencies } from './config/di.js';

const PORT = process.env.PORT || 5000;

async function start() {
    const deps = buildDependencies();

    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.use(createRoutes(deps));
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', message: 'Server is running' });
    });

    console.log('Seeding default admin user if not exists...');
    await seedDefaultAdmin(deps.userService);

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});