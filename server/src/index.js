import express from 'express';
import cors from 'cors';
import * as aiController from '../controllers/ai-controller.js';
import { seedDefaultAdmin } from '../src/config/seed.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
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

process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    }
});