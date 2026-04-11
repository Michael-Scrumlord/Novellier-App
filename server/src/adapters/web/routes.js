import { Router } from 'express';
import { asyncHandler
    //errorMiddleware 
} from './error-handling.js';
import { createAuthMiddleware, requireRole } from './auth-middleware.js';


export const createRoutes = ({
    aiController,
    authController,
    userController,
    storyController,
    authMiddleware
}) => {
    const router = Router();

    const bind = (controller, method) => asyncHandler(controller[method].bind(controller));

    router.post('/api/auth/login', bind(authController, 'login'));
    router.post('/api/auth/logout', bind(authController, 'logout'));

    // [SPRINT-1] S1-5: User Management Endpoints (admin only)
    router.get('/api/users', authMiddleware, requireRole('admin'), bind(userController, 'listUsers'));
    router.get('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'getUser'));
    router.post('/api/users', authMiddleware, requireRole('admin'), bind(userController, 'createUser'));
    router.put('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'updateUser'));
    router.delete('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'deleteUser'));

    // [SPRINT-2] S2-1: Story Creation Endpoint
    router.get('/api/stories', authMiddleware, bind(storyController, 'listStories'));
    router.get('/api/stories/:id', authMiddleware, bind(storyController, 'getStory'));
    router.post('/api/stories', authMiddleware, bind(storyController, 'createStory'));
    router.put('/api/stories/:id', authMiddleware, bind(storyController, 'updateStory'));
    router.delete('/api/stories/:id', authMiddleware, bind(storyController, 'deleteStory'));

    // [SPRINT-3] S3-1: AI Integration Endpoints
    router.post('/api/suggest', authMiddleware, aiController.getSuggestion.bind(aiController));
    router.get('/api/models', authMiddleware, bind(aiController, 'listModels'));
    router.post('/api/ai/warmup', authMiddleware, bind(aiController, 'warmup'));
    router.post('/api/ai/keepalive', authMiddleware, bind(aiController, 'keepAlive'));
    router.post('/api/models/ensure', authMiddleware, bind(aiController, 'ensureModel'));

    // TODO: Express error-handling middleware last

    return router;
};
