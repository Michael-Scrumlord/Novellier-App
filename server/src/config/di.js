import { MongoClient } from 'mongodb';

import AuthController from '../adapters/web/auth-controller.js';
import { createAuthMiddleware } from '../adapters/web/auth-middleware.js';
import { TokenBlocklist } from '../adapters/web/token-blocklist.js';

import MongoUserRepository from '../adapters/persistence/mongo-user-repo.js';

import { UserService } from '../core/services/user-service.js';
import UserController from '../adapters/web/user-controller.js';

import StoryController from '../adapters/web/story-controller.js';
import MongoStoryRepository from '../adapters/persistence/mongo-story-repo.js';
import MongoConversationRepository from '../adapters/persistence/mongo-conversation-repo.js';
import MongoSettingsStore from '../adapters/persistence/mongo-settings-store.js';
import MongoInfrastructureRepository from '../adapters/persistence/mongo-infrastructure-repository.js';
import MonitoringController from '../adapters/web/monitoring-controller.js';
import { StoryService } from '../core/services/story-service.js';
import { OllamaModelCatalogService } from '../core/services/ollama-model-catalog-service.js';
import { OllamaEndpointService } from '../core/services/ollama-endpoint-service.js';
import { AIJobQueue } from '../core/services/ai-job-queue.js';

import LocalLLMAdapter from '../adapters/ai/local-llm-adapter.js';
import { AISuggestionService } from '../core/services/ai-suggestion-service.js';
import { NovelPromptStrategy } from '../adapters/prompts/NovelPromptStrategy.js';
import { YouTrackPromptStrategy } from '../adapters/prompts/YouTrackPromptStrategy.js';
import { AIModelManagementService } from '../core/services/ai-model-management-service.js';
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
import { InfrastructureMonitor } from '../adapters/monitoring/infrastructure-monitor.js';

import MongoPullProgressStore from '../adapters/coordination/mongo-pull-progress-store.js';
import MongoJobQueueCheckpointStore from '../adapters/coordination/mongo-job-queue-checkpoint-store.js';
import { StreamingSemaphore } from '../adapters/coordination/streaming-semaphore.js';

import { buildLlmHardwareOptions, buildRagConfig, LLM_SOFT_DEFAULTS } from './runtime-config.js';
import { LlmParamsService } from '../core/services/llm-params-service.js';

// Dependency composition root — builds every adapter, service, and controller from env config.
export const buildDependencies = () => {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/novellier';
    const mongoDb = process.env.MONGO_DB || 'novellier';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
    const jwtExpiration = process.env.JWT_EXPIRATION || '24h';
    const tokenBlocklist = new TokenBlocklist();

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
    const conversationStore = new MongoConversationRepository({
        db,
        collectionName: process.env.MONGO_CONVERSATION_COLLECTION || 'ai_conversations',
    });
    const settingsStore = new MongoSettingsStore({
        db,
        collectionName: process.env.MONGO_RUNTIME_MODEL_CONFIG_COLLECTION || 'app_config',
    });
    const checkpointStore = new MongoJobQueueCheckpointStore({
        db,
        collectionName: process.env.MONGO_JOB_QUEUE_COLLECTION || 'job_queue_checkpoints',
    });
    const infrastructureRepository = new MongoInfrastructureRepository({
        checkpointStore,
        conversationStore,
        settingsStore,
    });

    const streamingSemaphore = new StreamingSemaphore({
        concurrency: Number(process.env.AI_STREAM_CONCURRENCY) || 2,
    });

    const vectorRepository = new ChromaVectorRepository({
        baseUrl: process.env.CHROMA_URL || 'http://chromadb:8000',
        collectionName: process.env.CHROMA_COLLECTION || 'project_store',
        ollamaUrl,
        ragConfig,
        runtimeModels,
        ollamaGate: streamingSemaphore,
    });

    // Coordination
    const pullProgressStore = new MongoPullProgressStore({
        db,
        collectionName: process.env.MONGO_PULL_PROGRESS_COLLECTION || 'pull_progress',
    });

    // Monitoring composite — owned by the LLM adapter so getTransportMetadata can return
    // container/volume/db health from a single call.
    const dockerMonitor = new DockerMonitoringAdapter({
        projectName: process.env.COMPOSE_PROJECT_NAME || 'novellier-app',
    });
    const mongoMonitor = new MongoMonitoringAdapter({ db });
    const infrastructureMonitor = new InfrastructureMonitor({ dockerMonitor, mongoMonitor });

    // Cohesive AI adapter — implements IAIService and exposes adapter-level extras
    // (pullModel, removeModel) for admin lifecycle controllers.
    const aiService = new LocalLLMAdapter({
        baseUrl: ollamaUrl,
        model: runtimeModels.suggestion,
        temperature: Number(process.env.LLM_TEMPERATURE) || LLM_SOFT_DEFAULTS.temperature,
        numPredict: Number(process.env.LLM_NUM_PREDICT) || LLM_SOFT_DEFAULTS.num_predict,
        hardwareOptions: llmHardwareOptions,
        pullProgressStore,
        streamingSemaphore,
        infrastructureMonitor,
        vectorRepository,
    });

    // Application services
    const summaryConfig = {
        model: runtimeModels.summary,
        maxTokens: Number(process.env.SUMMARY_MAX_TOKENS) || 480,
        maxSourceChars: Number(process.env.SUMMARY_MAX_SOURCE_CHARS) || 9000,
    };

    const aiJobQueue = new AIJobQueue({
        concurrency: Number(process.env.AI_JOB_QUEUE_CONCURRENCY) || 1,
        infrastructureRepository,
    });

    const summarizationService = new StorySummarizationService({
        aiService,
        runtimeModels,
        summaryConfig,
        jobQueue: aiJobQueue,
    });

    const indexingService = new StoryIndexingService({ vectorRepository });

    const storyService = new StoryService({
        storyRepository,
        summarizationService,
        indexingService,
    });

    const strategies = {
        novel: new NovelPromptStrategy(),
        youtrack: new YouTrackPromptStrategy(),
    };

    const aiSuggestionService = new AISuggestionService({
        aiService,
        vectorRepository,
        storyFactsGateway: storyService,
        strategies,
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
        aiService,
        ollamaLibraryAdapter,
        runtimeModels,
    });

    const modelManagementService = new AIModelManagementService({
        aiService,
        runtimeModels,
        infrastructureRepository,
    });

    const ollamaEndpointService = new OllamaEndpointService({
        aiService,
        vectorRepository,
        infrastructureRepository,
        envFallbackUrl: ollamaUrl,
    });

    const llmParamsService = new LlmParamsService({
        infrastructureRepository,
        aiService,
        hardwareDefaults: llmHardwareOptions,
        softDefaults: LLM_SOFT_DEFAULTS,
    });

    const suggestionService = new SuggestionUseCase({
        suggestionService: aiSuggestionService,
        infrastructureRepository,
    });

    const monitoringService = new MonitoringService({ aiService });

    const userService = new UserService({ userRepository });

    // HTTP controllers
    const authController = new AuthController({ userService, jwtSecret, jwtExpiration, tokenBlocklist });
    const userController = new UserController({ userService });
    const storyController = new StoryController({ storyService });
    const monitoringController = new MonitoringController({ monitoringService });
    const suggestionController = new SuggestionController({ suggestionService, runtimeModels });
    const modelManagementController = new ModelManagementController({
        aiService,
        modelManagementService,
        ollamaEndpointService,
        llmParamsService,
    });
    const modelCatalogController = new ModelCatalogController({
        modelCatalogService,
        modelManagementService,
    });
    const conversationController = new ConversationController({ conversationRepository: conversationStore });

    const authMiddleware = createAuthMiddleware({ jwtSecret, tokenBlocklist });

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
        aiService,
        pullProgressStore,
        infrastructureRepository,
        checkpointStore,
        streamingSemaphore,
        aiJobQueue,
        modelCatalogService,
        modelManagementService,
        ollamaEndpointService,
        llmParamsService,
    };
};
