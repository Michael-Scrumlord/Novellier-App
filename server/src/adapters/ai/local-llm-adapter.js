// Facade pattern for composing the Ollama transport
// Implementation lives in ./ollama/
// Public shape (default export LocalLLMAdapter, exposing .aiService / 
// .modelManager / transport-level passthroughs) 
// is unchanged so the composition root and tests keep working without modification.

import { DEFAULT_BASE_URL } from './ollama/ollama-config.js';
import { OllamaTransport } from './ollama/ollama-transport.js';
import { OllamaStreamStrategy } from './ollama/ollama-stream-strategy.js';
import { LocalAIService } from './ollama/local-ai-service.js';
import { LocalModelManager } from './ollama/local-model-manager.js';

export { LocalAIService, LocalModelManager };

export default class LocalLLMAdapter {
    constructor({
        baseUrl = DEFAULT_BASE_URL,
        model = null,
        temperature = 0.8,
        numPredict = 150,
        hardwareOptions,
        pullProgressStore,
        streamingSemaphore,
    } = {}) {
        if (!pullProgressStore) throw new Error('LocalLLMAdapter requires pullProgressStore');

        this.transport = new OllamaTransport({ baseUrl });
        this.modelManager = new LocalModelManager({
            transport: this.transport,
            pullProgressStore,
        });
        const streamStrategy = new OllamaStreamStrategy({
            transport: this.transport,
            hardwareOptions: hardwareOptions || {},
        });
        this.aiService = new LocalAIService({
            transport: this.transport,
            modelManager: this.modelManager,
            streamingSemaphore,
            streamStrategy,
            model,
            temperature,
            numPredict,
            hardwareOptions,
        });
    }

    /* Transport-level (consumed by OllamaEndpointService) */
    setBaseUrl(url) { return this.transport.setBaseUrl(url); }
    getBaseUrl() { return this.transport.getBaseUrl(); }
    probeEndpoint(url, options) { return this.transport.probeEndpoint(url, options); }

    /* IAIService passthroughs */
    generateCompletion(prompt, options) { return this.aiService.generateCompletion(prompt, options); }
    ensureModelAvailable(name) { return this.aiService.ensureModelAvailable(name); }
    generateStreamingCompletion(prompt, options, onChunk) {
        return this.aiService.generateStreamingCompletion(prompt, options, onChunk);
    }
    warmupModel(name) { return this.aiService.warmupModel(name); }
    keepAlive(name) { return this.aiService.keepAlive(name); }

    /* IModelManager passthroughs */
    listInstalledModels() { return this.modelManager.listInstalledModels(); }
    pullModelWithProgress(name) { return this.modelManager.pullModelWithProgress(name); }
    removeModel(name) { return this.modelManager.removeModel(name); }
    getPullProgress(name) { return this.modelManager.getPullProgress(name); }
}
