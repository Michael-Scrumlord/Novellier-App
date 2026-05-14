import { Router, json as expressJson } from 'express';
import { asyncHandler } from './error-handling.js';
import { requireRole } from './auth-middleware.js';

// This provides the route definitions for the web adapter.
// All protected routes pass through authMiddleware, which enforces admin endpoints with requireRole.
// Controller methods are wrapped in asyncHandler to normalize async error propagation.
//
// Body-size policy: there is no global body parser. Every route that needs a
// JSON body mounts either smallBody (512kb) or largeBody (10mb) inline.
// This is intentional — a global small-limit parser would run before the
// per-route largeBody parser and reject story saves with a 413 before the
// route handler is reached.
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
    loginLimiter,
    smallJsonLimit = '512kb',
    largeJsonLimit = '10mb',
}) => {
    const router = Router();
    const bind = (controller, method) => asyncHandler(controller[method].bind(controller));
    const noop = (_req, _res, next) => next();
    const limitLogin = loginLimiter || noop;
    const smallBody = expressJson({ limit: smallJsonLimit });
    const largeBody = expressJson({ limit: largeJsonLimit });

    // Health - used by the client status indicator and doesn't require auth.
    router.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    // Authentication routes. Login carries a per-IP rate limiter (default 10/15min).
    router.post('/api/auth/login', limitLogin, smallBody, bind(authController, 'login'));
    router.post('/api/auth/logout', smallBody, bind(authController, 'logout'));

    // User Management endpoints (admin only).
    router.get('/api/users', authMiddleware, requireRole('admin'), bind(userController, 'listUsers'));
    router.get('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'getUser'));
    router.post('/api/users', authMiddleware, requireRole('admin'), smallBody, bind(userController, 'createUser'));
    router.put('/api/users/:id', authMiddleware, requireRole('admin'), smallBody, bind(userController, 'updateUser'));
    router.delete('/api/users/:id', authMiddleware, requireRole('admin'), bind(userController, 'deleteUser'));

    // Story management endpoints — story bodies can be large (chapters with
    // embedded HTML), so create/update get the larger body limit.
    router.get('/api/stories', authMiddleware, bind(storyController, 'listStories'));
    router.get('/api/stories/:id', authMiddleware, bind(storyController, 'getStory'));
    router.post('/api/stories', authMiddleware, largeBody, bind(storyController, 'createStory'));
    router.put('/api/stories/:id', authMiddleware, largeBody, bind(storyController, 'updateStory'));
    router.delete('/api/stories/:id', authMiddleware, bind(storyController, 'deleteStory'));
    router.get('/api/stories/:id/index-status', authMiddleware, bind(storyController, 'getIndexStatus'));

    // AI Suggestions (SuggestionController) — needs the larger body for
    // long context + custom prompts. Streaming bind is direct (not asyncHandler)
    // because the controller manages its own response lifecycle.
    router.post(
        '/api/suggest',
        authMiddleware,
        largeBody,
        suggestionController.getSuggestion.bind(suggestionController)
    );

    // Endpoints for the Model Catalog (Admin Panel)
    router.get('/api/models', authMiddleware, bind(modelCatalogController, 'listModels'));
    router.get('/api/admin/models/status', authMiddleware, requireRole('admin'), bind(modelCatalogController, 'getAdminModelStatus'));
    router.get('/api/admin/models/catalog', authMiddleware, requireRole('admin'), bind(modelCatalogController, 'getAdminModelCatalog'));
    router.get('/api/admin/models/details', authMiddleware, requireRole('admin'), bind(modelCatalogController, 'getAdminModelDetails'));

    // Endpoints for managing the models themselves
    router.post('/api/ai/warmup', authMiddleware, smallBody, bind(modelManagementController, 'warmup'));
    router.post('/api/ai/keepalive', authMiddleware, smallBody, bind(modelManagementController, 'keepAlive'));
    router.post('/api/models/ensure', authMiddleware, smallBody, bind(modelManagementController, 'ensureModel'));
    router.get('/api/admin/models/config', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getAdminModelConfig'));
    router.post('/api/admin/models/set-active', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'setActiveModel'));
    router.post('/api/admin/models/pull', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'pullModel'));
    router.post('/api/admin/models/remove', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'removeModel'));
    router.get('/api/admin/models/pull-progress', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getPullProgress'));

    // Ollama endpoints
    router.get('/api/admin/ollama/endpoint', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getOllamaEndpoint'));
    router.put('/api/admin/ollama/endpoint', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'setOllamaEndpoint'));
    router.post('/api/admin/ollama/endpoint/test', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'testOllamaEndpoint'));
    // Ollama model parameters
    router.get('/api/admin/ollama/params', authMiddleware, requireRole('admin'), bind(modelManagementController, 'getLlmParams'));
    router.put('/api/admin/ollama/params', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'setLlmParams'));
    router.post('/api/admin/ollama/params/reset', authMiddleware, requireRole('admin'), smallBody, bind(modelManagementController, 'resetLlmParams'));

    // Conversations endpoints (Admin Panel)
    router.get('/api/admin/conversations', authMiddleware, requireRole('admin'), bind(conversationController, 'listConversations'));
    router.delete('/api/admin/conversations/:id', authMiddleware, requireRole('admin'), bind(conversationController, 'deleteConversation'));

    // For Monitoring - containers, mongo, volumes.
    router.get('/api/containers', authMiddleware, requireRole('admin'), bind(monitoringController, 'getContainers'));
    router.get('/api/monitoring/mongo', authMiddleware, requireRole('admin'), bind(monitoringController, 'getMongoStatus'));
    router.get('/api/monitoring/volumes', authMiddleware, requireRole('admin'), bind(monitoringController, 'getVolumeStatus'));
    return router;
};
