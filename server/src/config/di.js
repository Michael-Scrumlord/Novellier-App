// Dependency injection setup for the server application
// This file can be used to manage and inject dependencies across the application
// For now, it's a placeholder for future enhancements

import os from 'os';

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

// AI Stuff
import LocalLLMAdapter from '../adapters/ai/local-llm-adapter.js';
import { AISuggestionService } from '../core/services/ai-suggestion-service.js';
import AIController from '../adapters/web/ai-controller.js';

// Chroma Stuff
import ChromaVectorRepository from '../adapters/persistence/chroma-vector-repo.js';

function buildRagConfig() {
    const totalMemoryGB = os.totalmem() / (1024 ** 3);
    const cpuCores = os.cpus().length;

    if (totalMemoryGB >= 16 && cpuCores >= 8) {
        return { contextChunks: 5, maxContextTokens: 2000, batchSize: 10 };
    }
    if (totalMemoryGB >= 8 && cpuCores >= 4) {
        return { contextChunks: 3, maxContextTokens: 1000, batchSize: 5 };
    }
    return { contextChunks: 2, maxContextTokens: 500, batchSize: 3 };
}
function buildLlmHardwareOptions() {
    const cpuCores = os.cpus().length;
    const totalMemoryGB = os.totalmem() / (1024 ** 3);

    return {
        num_ctx: totalMemoryGB >= 16 ? 4096 : 2048,
        num_thread: Math.max(cpuCores - 2, 4),
        num_gpu: 1,
        use_mmap: true,
        use_mlock: false,
        f16_kv: true,
        num_batch: totalMemoryGB >= 16 ? 512 : 256
    };
}

export const buildDependencies = () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
    const mongoDb = process.env.MONGO_DB || 'novellier';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    const ragConfig = buildRagConfig();
    const llmHardwareOptions = buildLlmHardwareOptions();

    const vectorRepository = new ChromaVectorRepository({
        baseUrl: process.env.CHROMA_URL || 'http://chromadb:8000',
        collectionName: process.env.CHROMA_COLLECTION || 'project_store',
        ollamaUrl,
        embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
        ragConfig
    });
    const storyRepository = new MongoStoryRepository({
        mongoUrl,
        dbName: mongoDb,
        collectionName: process.env.MONGO_COLLECTION || 'stories'
    });
    const userRepository = new MongoUserRepository({
        mongoUrl,
        dbName: mongoDb
    });

    const localAdapter = new LocalLLMAdapter({ // AI Service adapter
        baseUrl: ollamaUrl,
        model: process.env.LLM_MODEL || 'phi3',
        temperature: Number(process.env.LLM_TEMPERATURE) || 0.8,
        numPredict: Number(process.env.LLM_NUM_PREDICT) || 1024,
        hardwareOptions: llmHardwareOptions
    });

    const storyService = new StoryService({ 
        storyRepository,
        vectorRepository,
        aiService: localAdapter,
        summaryConfig: {
            model: process.env.SUMMARY_MODEL || process.env.LLM_MODEL || 'phi3',
            maxTokens: Number(process.env.SUMMARY_MAX_TOKENS) || 480,
            maxSourceChars: Number(process.env.SUMMARY_MAX_SOURCE_CHARS) || 9000
        }
    });

    // Sprint 3: AI Integration

    const suggestionService = new AISuggestionService({
        aiService: localAdapter,
        vectorRepository,
        config: {
            maxActiveChars: Number(process.env.AI_MAX_ACTIVE_CHARS) || 8000,
            maxTokens: process.env.AI_MAX_TOKENS ? Number(process.env.AI_MAX_TOKENS) : null
        }
    });

    const localModels = (process.env.LOCAL_MODELS || 'phi3,llama3.2,mistral').split(',');
    


    //------------------------------------------------------------------


    const userService = new UserService({ userRepository });
    const authController = new AuthController({ userService, jwtSecret });
    const userController = new UserController({ userService });
    const storyController = new StoryController({ storyService });
    const aiController = new AIController({ suggestionService: suggestionService, aiService: localAdapter });


    // Auth middleware can be created here and injected into routes that require authentication
    const authMiddleware = createAuthMiddleware({ jwtSecret });

    return {
        authController,
        userService,
        userController,
        authMiddleware,
        storyController,
        aiController,
        aiService: localAdapter
    };
}