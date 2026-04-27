import { Router } from 'express';
import { asyncHandler } from './error-handling.js';
import { requireRole } from './auth-middleware.js';

// This provides the route definitions for the web adapter. 

/*
    - All protected routes pass through `authMiddleware`.
    - Admin endpoints enforce the requireRole middleware.
    - Controller metthods are wrapped in an asynchandler which helps to normalize async error propogation. 
*/
export const createRoutes = ({
    authController,
    userController,
    storyController,
    monitoringController,
    authMiddleware,
    suggestionController,
    modelManagementController,
    modelCatalogController,
    conversationController,
}) => {
    const router = Router();
    const bind = (controller, method) => asyncHandler(controller[method].bind(controller));

    // Health - used by the client status indicator and doesn't require auth.
    router.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    // Authentication routes
    router.post('/api/auth/login', bind(authController, 'login'));
    router.post('/api/auth/logout', bind(authController, 'logout'));

    // User Management endpoints (admin only).
    router.get('/api/users', authMiddleware, requireRole('admin'), bind(userController, 'listUsers'));
    router.get('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'getUser'));
    router.post('/api/users', authMiddleware, requireRole('admin'), bind(userController, 'createUser'));
    router.put('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'updateUser'));
    router.delete('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'deleteUser'));

    // Store management endpoints. 
    // Consider changing the story naming convention for better generality. What if I do screenplay support too..? 
    router.get('/api/stories', authMiddleware, bind(storyController, 'listStories'));
    router.get('/api/stories/:id', authMiddleware, bind(storyController, 'getStory'));
    router.post('/api/stories', authMiddleware, bind(storyController, 'createStory'));
    router.put('/api/stories/:id', authMiddleware, bind(storyController, 'updateStory'));
    router.delete('/api/stories/:id', authMiddleware, bind(storyController, 'deleteStory'));

    // AI Suggestions (SuggestionController)
    // Note: getSuggestion handles its own streaming so it binds directly (not via asyncHandler).
    router.post('/api/suggest', authMiddleware, suggestionController.getSuggestion.bind(suggestionController));

    // Endpoints for the Model Catalog (Admin Panel)
    router.get('/api/models', authMiddleware, bind(modelCatalogController, 'listModels'));
    router.get('/api/admin/models/status', authMiddleware, requireRole('admin'), bind(modelCatalogController, 'getAdminModelStatus'));
    router.get('/api/admin/models/catalog', authMiddleware, requireRole('admin'), bind(modelCatalogController, 'getAdminModelCatalog'));
    router.get('/api/admin/models/details', authMiddleware, requireRole('admin'), bind(modelCatalogController, 'getAdminModelDetails'));

    // Endpoints for managing the models themselves
    router.post('/api/ai/warmup', authMiddleware, bind(modelManagementController, 'warmup'));
    router.post('/api/ai/keepalive', authMiddleware, bind(modelManagementController, 'keepAlive'));
    router.post('/api/models/ensure', authMiddleware, bind(modelManagementController, 'ensureModel'));
    router.get('/api/admin/models/config', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getAdminModelConfig'));
    router.post('/api/admin/models/set-active', authMiddleware, requireRole('admin'), bind(modelManagementController, 'setActiveModel'));
    router.post('/api/admin/models/pull', authMiddleware, requireRole('admin'), bind(modelManagementController, 'pullModel'));
    router.post('/api/admin/models/remove', authMiddleware, requireRole('admin'), bind(modelManagementController, 'removeModel'));
    router.get('/api/admin/models/pull-progress', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getPullProgress'));

    // Ollama endpoints
    router.get('/api/admin/ollama/endpoint', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getOllamaEndpoint'));
    router.put('/api/admin/ollama/endpoint', authMiddleware, requireRole('admin'), bind(modelManagementController, 'setOllamaEndpoint'));
    router.post('/api/admin/ollama/endpoint/test', authMiddleware, requireRole('admin'), bind(modelManagementController, 'testOllamaEndpoint'));

    // Conversations endpoints (Admin Panel)
    router.get('/api/admin/conversations', authMiddleware, requireRole('admin'), bind(conversationController, 'listConversations'));
    router.delete('/api/admin/conversations/:id', authMiddleware, requireRole('admin'), bind(conversationController, 'deleteConversation'));

    // For Monitoring - containers, mongo, volumes. 
    router.get('/api/containers', authMiddleware, requireRole('admin'), bind(monitoringController, 'getContainers'));
    router.get('/api/monitoring/mongo', authMiddleware, requireRole('admin'), bind(monitoringController, 'getMongoStatus'));
    router.get('/api/monitoring/volumes', authMiddleware, requireRole('admin'), bind(monitoringController, 'getVolumeStatus'));
    return router;
};
