// Dependency injection setup for the server application
// This file can be used to manage and inject dependencies across the application
// For now, it's a placeholder for future enhancements

// Auth Stuff
import AuthController from "../adapters/web/auth-controller.js";
import { createAuthMiddleware } from "../adapters/web/auth-middleware.js";

// Mongo Stuff
import MongoUserRepository from "../adapters/persistence/mongo-user-repo.js";

// User Stuff
import { UserService } from "../core/services/user-service.js";
import UserController from "../adapters/web/user-controller.js";

// Story Stuff
import StoryController from '../adapters/web/story-controller.js';
import MongoStoryRepository from '../adapters/persistence/mongo-story-repo.js';
import { StoryService } from '../core/services/story-service.js';

export const buildDependencies = () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
    const mongoDb = process.env.MONGO_DB || 'novellier';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    const storyRepository = new MongoStoryRepository({
        mongoUrl,
        dbName: mongoDb,
        collectionName: process.env.MONGO_COLLECTION || 'stories'
    });
    const userRepository = new MongoUserRepository({
        mongoUrl,
        dbName: mongoDb
    });

    const storyService = new StoryService({ 
        storyRepository    });

    const userService = new UserService({ userRepository });
    const authController = new AuthController({ userService, jwtSecret });
    const userController = new UserController({ userService });
    const storyController = new StoryController({ storyService });


    // Auth middleware can be created here and injected into routes that require authentication
    const authMiddleware = createAuthMiddleware({ jwtSecret });

    return {
        authController,
        userService,
        userController,
        authMiddleware,
        storyController
    };
}