// Composition root for the Ollama adapter stack. Wires OllamaTransport, LocalAIService, and
// LocalModelManager together and exposes .aiService and .modelManager for dependency injection.
// Transport-level methods (setBaseUrl, getBaseUrl, probeEndpoint) are forwarded for OllamaEndpointService.

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

    setBaseUrl(url) { return this.transport.setBaseUrl(url); }
    getBaseUrl() { return this.transport.getBaseUrl(); }
    probeEndpoint(url, options) { return this.transport.probeEndpoint(url, options); }
    setDefaultParams(params) { return this.aiService.setDefaultParams(params); }
}