// Port interface for AI text generation. Defines the contract for streaming and non-streaming
// completion, model warmup, and availability checks. Implemented by LocalAIService.
export class IAIService {
    async generateCompletion(prompt, options = {}) {
        throw new Error('Not implemented');
    }

    async ensureModelAvailable(model) {
        throw new Error('Not implemented');
    }

    async generateStreamingCompletion(prompt, options = {}, onChunk) {
        throw new Error('Not implemented');
    }

    async warmupModel(modelName) {
        throw new Error('Not implemented');
    }

    async keepAlive(modelName) {
        throw new Error('Not implemented');
    }
}
