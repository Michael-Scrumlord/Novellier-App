import express from 'express';
import cors from 'cors';
import * as aiController from '../controllers/ai-controller.js';
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


/*
const app = express();
// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
const { authController } = buildDependencies();
app.post('/api/suggest', aiController.getSuggestion);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware - catches errors from routes
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

let server;

// This seeds the database with a default admin user and then starts the server
seedDefaultAdmin()
    .then(() => {
        server = app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            // TODO: Model warmup should go right here
        });
    })
    .catch((error) => {
        console.error('Failed to start the server:', error);
        process.exit(1);
    });
*/

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});