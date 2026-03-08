import express from 'express';
import cors from 'cors';
import * as aiController from './controllers/ai-controller.js';
import { seedDefaultAdmin } from './src/config/seed.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/suggest', aiController.getSuggestion);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Seed database, then start listening for traffic
seedDefaultAdmin()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            // TODO: Model warmup should go right here
        });
    })
    .catch((error) => {
        console.error('Failed to start the server:', error);
        process.exit(1); // Fails if the database isn't ready
    });