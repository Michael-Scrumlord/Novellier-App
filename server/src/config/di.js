// Dependency injection setup for the server application
// This file can be used to manage and inject dependencies across the application
// For now, it's a placeholder for future enhancements

import AuthController from "../adapters/web/auth-controller.js";
import MongoUserRepository from "../adapters/persistence/mongo-user-repo.js";
import { UserService } from "../core/services/user-service.js";

export const buildDependencies = () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
    const mongoDb = process.env.MONGO_DB || 'novellier';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    const userRepository = new MongoUserRepository({
        mongoUrl,
        dbName: mongoDb
    });

    const userService = new UserService({ userRepository });
    const authController = new AuthController({ userService, jwtSecret });

    return {
        authController,
        userService
    };
}
