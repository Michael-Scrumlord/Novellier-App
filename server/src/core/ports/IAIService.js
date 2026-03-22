/**
 * Port interface for AI text generation service.
 * It should provide methods for generating completions, streaming responses, and managing model availability.
 */
export class IAIService { // Defines the contract for AI services, including methods for generating completions, streaming responses, and managing model availability.
  async generateCompletion(prompt, options = {}) {
    throw new Error('Not implemented');
  }

  async ensureModelAvailable(model) { // Checks if the specified model is available and ready to use, pulling it if necessary
    throw new Error('Not implemented');
  }

  async generateStreamingCompletion(prompt, options = {}, onChunk) { // Accepts arguments for prompt, generation options (like model, maxTokens), and a callback to handle each chunk of the streaming response.
    throw new Error('Not implemented');
  }

  async warmupModel(modelName) { // Starts the model with a minimal prompt to reduce latency for subsequent requests
    throw new Error('Not implemented');
  }

  async keepAlive(modelName) { // Holds the model in memory with minimal pings to prevent unloading during inactivity
    throw new Error('Not implemented');
  }
}
