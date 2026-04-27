import { MongoClient } from 'mongodb';

import AuthController from '../adapters/web/auth-controller.js';
import { createAuthMiddleware } from '../adapters/web/auth-middleware.js';

import MongoUserRepository from '../adapters/persistence/mongo-user-repo.js';

import { UserService } from '../core/services/user-service.js';
import UserController from '../adapters/web/user-controller.js';

import StoryController from '../adapters/web/story-controller.js';
import MongoStoryRepository from '../adapters/persistence/mongo-story-repo.js';
import MongoConversationRepository from '../adapters/persistence/mongo-conversation-repo.js';
import MongoRuntimeModelConfigRepository from '../adapters/persistence/mongo-runtime-model-config-repo.js';
import MonitoringController from '../adapters/web/monitoring-controller.js';
import { StoryService } from '../core/services/story-service.js';
import { OllamaModelCatalogService } from '../core/services/ollama-model-catalog-service.js';
import { OllamaEndpointService } from '../core/services/ollama-endpoint-service.js';
import { AIJobQueue, ConcurrencyThrottle } from '../core/services/ai-job-queue.js';

import LocalLLMAdapter from '../adapters/ai/local-llm-adapter.js';
import { AISuggestionService } from '../core/services/ai-suggestion-service.js';
import { AIModelManagementService } from '../core/services/ai-model-management-service.js';
import { ConversationService } from '../core/services/conversation-service.js';
import { StorySummarizationService } from '../core/services/story-summarization-service.js';
import { StoryIndexingService } from '../core/services/story-indexing-service.js';
import { MonitoringService } from '../core/services/monitoring-service.js';

import SuggestionController from '../adapters/web/suggestion-controller.js';
import { SuggestionUseCase } from '../core/services/suggest-use-case.js';
import ModelManagementController from '../adapters/web/model-management-controller.js';
import ModelCatalogController from '../adapters/web/model-catalog-controller.js';
import ConversationController from '../adapters/web/conversation-controller.js';

import ChromaVectorRepository from '../adapters/persistence/chroma-vector-repo.js';
import { OllamaLibraryAdapter } from '../adapters/ai/ollama-library-adapter.js';
import { DockerMonitoringAdapter } from '../adapters/monitoring/docker-monitoring-adapter.js';
import { MongoMonitoringAdapter } from '../adapters/monitoring/mongo-monitoring-adapter.js';

import MongoPullProgressStore from '../adapters/coordination/mongo-pull-progress-store.js';
import MongoJobQueueCheckpointStore from '../adapters/coordination/mongo-job-queue-checkpoint-store.js';
import { StreamingSemaphore } from '../adapters/coordination/streaming-semaphore.js';

import { buildLlmHardwareOptions, buildRagConfig } from './runtime-config.js';

// Dependency composition root — builds every adapter, service, and controller from env config.
// Runtime model roles start null and are populated by hydrateRuntimeModels() on boot,
// then managed through Admin > AI Models in the frontend.
export const buildDependencies = () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
    const mongoDb = process.env.MONGO_DB || 'novellier';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

    const ragConfig = buildRagConfig();
    const llmHardwareOptions = buildLlmHardwareOptions();

    const runtimeModels = {
        suggestion: null,
        summary: null,
        embedding: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    };

    // Persistence
    const mongoClient = new MongoClient(mongoUrl);
    const db = mongoClient.db(mongoDb);

    const storyRepository = new MongoStoryRepository({
        db,
        collectionName: process.env.MONGO_COLLECTION || 'stories',
    });
    const userRepository = new MongoUserRepository({ db });
    const conversationRepository = new MongoConversationRepository({
        db,
        collectionName: process.env.MONGO_CONVERSATION_COLLECTION || 'ai_conversations',
    });
    const runtimeModelConfigRepository = new MongoRuntimeModelConfigRepository({
        db,
        collectionName: process.env.MONGO_RUNTIME_MODEL_CONFIG_COLLECTION || 'app_config',
    });
    const vectorRepository = new ChromaVectorRepository({
        baseUrl: process.env.CHROMA_URL || 'http://chromadb:8000',
        collectionName: process.env.CHROMA_COLLECTION || 'project_store',
        ollamaUrl,
        embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
        ragConfig,
        runtimeModels,
    });

    // Coordination
    const pullProgressStore = new MongoPullProgressStore({
        db,
        collectionName: process.env.MONGO_PULL_PROGRESS_COLLECTION || 'pull_progress',
    });
    const jobQueueCheckpointStore = new MongoJobQueueCheckpointStore({
        db,
        collectionName: process.env.MONGO_JOB_QUEUE_COLLECTION || 'job_queue_checkpoints',
    });
    const streamingSemaphore = new StreamingSemaphore({
        concurrency: Number(process.env.AI_STREAM_CONCURRENCY) || 2,
    });

    // AI adapter
    const localAdapter = new LocalLLMAdapter({
        baseUrl: ollamaUrl,
        model: runtimeModels.suggestion,
        temperature: Number(process.env.LLM_TEMPERATURE) || 0.8,
        numPredict: Number(process.env.LLM_NUM_PREDICT) || 1024,
        hardwareOptions: llmHardwareOptions,
        pullProgressStore,
        streamingSemaphore,
    });

    // Application services
    const summaryConfig = {
        model: runtimeModels.summary,
        maxTokens: Number(process.env.SUMMARY_MAX_TOKENS) || 480,
        maxSourceChars: Number(process.env.SUMMARY_MAX_SOURCE_CHARS) || 9000,
    };

    // One LLM completion runs at a time in the background. Streaming foreground prompts
    // bypass this queue and call generateStreamingCompletion directly.
    const aiJobQueue = new AIJobQueue({
        concurrency: Number(process.env.AI_JOB_QUEUE_CONCURRENCY) || 1,
        checkpointStore: jobQueueCheckpointStore,
    });

    // Embeddings are lightweight so small parallelism lets background indexing finish quickly
    // without monopolizing the model host.
    const embeddingThrottle = new ConcurrencyThrottle({
        concurrency: Number(process.env.EMBEDDING_THROTTLE_CONCURRENCY) || 2,
    });

    const summarizationService = new StorySummarizationService({
        aiService: localAdapter.aiService,
        runtimeModels,
        summaryConfig,
        jobQueue: aiJobQueue,
    });

    const indexingService = new StoryIndexingService({ vectorRepository, embeddingThrottle });

    const storyService = new StoryService({
        storyRepository,
        summarizationService,
        indexingService,
    });

    const aiSuggestionService = new AISuggestionService({
        aiService: localAdapter.aiService,
        vectorRepository,
        storyFactsGateway: storyService,
        runtimeModels,
        jobQueue: aiJobQueue,
        config: {
            maxActiveChars: Number(process.env.AI_MAX_ACTIVE_CHARS) || 8000,
            maxTokens: process.env.AI_MAX_TOKENS ? Number(process.env.AI_MAX_TOKENS) : null,
            enableTextToolCallFallback: process.env.AI_ENABLE_TEXT_TOOL_CALL_FALLBACK === 'true',
        },
    });

    const ollamaLibraryAdapter = new OllamaLibraryAdapter({
        libraryUrl: process.env.OLLAMA_LIBRARY_URL,
    });

    const modelCatalogService = new OllamaModelCatalogService({
        modelManager: localAdapter.modelManager,
        ollamaLibraryPort: ollamaLibraryAdapter,
        runtimeModels,
    });

    const modelManagementService = new AIModelManagementService({
        modelManager: localAdapter.modelManager,
        runtimeModels,
        runtimeModelConfigPort: runtimeModelConfigRepository,
    });

    const ollamaEndpointService = new OllamaEndpointService({
        runtimeConfigRepository: runtimeModelConfigRepository,
        llmAdapter: localAdapter,
        vectorRepository,
        envFallbackUrl: ollamaUrl,
    });

    const conversationService = new ConversationService({ conversationRepository });

    const suggestionService = new SuggestionUseCase({
        suggestionService: aiSuggestionService,
        conversationService,
    });

    const dockerMonitor = new DockerMonitoringAdapter({
        projectName: process.env.COMPOSE_PROJECT_NAME || 'novellier-app',
    });
    const mongoMonitor = new MongoMonitoringAdapter({ db });
    const monitoringService = new MonitoringService({ dockerMonitor, mongoMonitor });

    const userService = new UserService({ userRepository });

    // HTTP controllers
    const authController = new AuthController({ userService, jwtSecret });
    const userController = new UserController({ userService });
    const storyController = new StoryController({ storyService });
    const monitoringController = new MonitoringController({ monitoringService });

    const suggestionController = new SuggestionController({ suggestionService, runtimeModels });
    const modelManagementController = new ModelManagementController({
        aiService: localAdapter.aiService,
        modelManager: localAdapter.modelManager,
        modelManagementService,
        ollamaEndpointService,
    });
    const modelCatalogController = new ModelCatalogController({
        modelCatalogService,
        modelManagementService,
    });
    const conversationController = new ConversationController({ conversationService });

    // Auth middleware is created once so all routes share the same JWT configuration.
    const authMiddleware = createAuthMiddleware({ jwtSecret });

    return {
        authController,
        userService,
        userController,
        authMiddleware,
        storyController,
        monitoringController,
        mongoClient,
        suggestionController,
        modelManagementController,
        modelCatalogController,
        conversationController,
        // Exposed for seeding and health checks
        aiService: localAdapter.aiService,
        modelManager: localAdapter.modelManager,
        pullProgressStore,
        jobQueueCheckpointStore,
        streamingSemaphore,
        aiJobQueue,
        modelCatalogService,
        modelManagementService,
        ollamaEndpointService,
    };
};
