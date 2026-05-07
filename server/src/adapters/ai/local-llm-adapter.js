// Cohesive Ollama implementation of IAIService. Owns the LocalAIService transport and the
// LocalModelManager privately, and exposes a single port-shaped surface so application
// services and controllers do not need to reach into modelManager directly. Optional
// infrastructureMonitor (docker + mongo) is folded into getTransportMetadata so monitoring
// callers can read LLM-stack health through one method.

import { IAIService } from '../../core/ports/IAIService.js';
import { DEFAULT_BASE_URL } from './ollama/ollama-config.js';
import { LocalAIService } from './ollama/local-ai-service.js';
import { LocalModelManager } from './ollama/local-model-manager.js';

export { LocalAIService, LocalModelManager };

export default class LocalLLMAdapter extends IAIService {
    constructor({
        baseUrl = DEFAULT_BASE_URL,
        model = null,
        temperature = 0.8,
        numPredict = 150,
        hardwareOptions,
        pullProgressStore,
        streamingSemaphore,
        infrastructureMonitor = null,
        vectorRepository = null,
    } = {}) {
        super();
        if (!pullProgressStore) throw new Error('LocalLLMAdapter requires pullProgressStore');

        this._aiService = new LocalAIService({ baseUrl, model, temperature, numPredict, hardwareOptions, streamingSemaphore });
        this._modelManager = new LocalModelManager({ transport: this._aiService.transport, pullProgressStore });
        this._aiService.modelManager = this._modelManager;
        this._infrastructureMonitor = infrastructureMonitor;
        this._vectorRepository = vectorRepository;
    }

    setVectorRepository(vectorRepository) {
        this._vectorRepository = vectorRepository;
    }

    // Inference — direct forwards.
    generateCompletion(prompt, options) { return this._aiService.generateCompletion(prompt, options); }
    generateStreamingCompletion(prompt, options, onChunk) { return this._aiService.generateStreamingCompletion(prompt, options, onChunk); }
    ensureModelAvailable(model) { return this._aiService.ensureModelAvailable(model); }
    warmupModel(model) { return this._aiService.warmupModel(model); }
    keepAlive(model) { return this._aiService.keepAlive(model); }

    // Transport configuration.
    async configure(config = {}) {
        return this._aiService.configure(config);
    }

    async probeEndpoint(rawUrl, options = {}) {
        return this._aiService.probeEndpoint(rawUrl, options);
    }

    async getTransportMetadata() {
        const baseUrl = this._aiService.getBaseUrl();
        const observed = {
            llmAdapter: baseUrl,
            chromaAdapter: this._vectorRepository?.getOllamaUrl?.() ?? null,
        };

        const infrastructure = this._infrastructureMonitor
            ? await this._readInfrastructure()
            : null;

        return { baseUrl, observed, infrastructure };
    }

    async _readInfrastructure() {
        const monitor = this._infrastructureMonitor;
        const [containers, volumes, mongo] = await Promise.all([
            monitor.listContainers?.().catch((err) => ({ error: err.message })) ?? null,
            monitor.getVolumeStatus?.().catch((err) => ({ error: err.message })) ?? null,
            monitor.getMongoStatus?.().catch((err) => ({ error: err.message })) ?? null,
        ]);
        return { containers, volumes, mongo };
    }

    // Model catalog + pull progress in a single call. Pull progress is normalized to a
    // { [modelName]: state } map regardless of how the underlying store returns it.
    async listModels() {
        const [installed, rawProgress] = await Promise.all([
            this._modelManager.listInstalledModels(),
            this._modelManager.getPullProgress(),
        ]);

        const progress = {};
        if (Array.isArray(rawProgress)) {
            for (const entry of rawProgress) {
                if (entry?.model) progress[entry.model] = entry;
            }
        } else if (rawProgress && typeof rawProgress === 'object') {
            Object.assign(progress, rawProgress);
        }

        return { installed, progress };
    }

    // Adapter-level extras for admin lifecycle. Not part of IAIService — controllers in
    // adapters/web call these directly on the cohesive adapter instance.
    pullModel(modelName) { return this._modelManager.pullModelWithProgress(modelName); }
    removeModel(modelName) { return this._modelManager.removeModel(modelName); }
}
