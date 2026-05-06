// Composition root for the Ollama adapter stack. Wires LocalAIService and LocalModelManager
// together and exposes .aiService and .modelManager for dependency injection.
// Transport-level methods (setBaseUrl, getBaseUrl, probeEndpoint) are forwarded from LocalAIService.

import { DEFAULT_BASE_URL } from './ollama/ollama-config.js';
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

        this.aiService = new LocalAIService({ baseUrl, model, temperature, numPredict, hardwareOptions, streamingSemaphore });
        this.modelManager = new LocalModelManager({ transport: this.aiService.transport, pullProgressStore });
        this.aiService.modelManager = this.modelManager;
    }

    setBaseUrl(url) { return this.aiService.setBaseUrl(url); }
    getBaseUrl() { return this.aiService.getBaseUrl(); }
    probeEndpoint(url, options) { return this.aiService.probeEndpoint(url, options); }
    setDefaultParams(params) { return this.aiService.setDefaultParams(params); }
}
