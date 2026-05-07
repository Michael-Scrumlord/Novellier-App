// Port interface for AI text generation and transport-level configuration. Implemented by
// LocalLLMAdapter as a single cohesive adapter. Includes both inference operations
// (generateCompletion, generateStreamingCompletion, ensureModelAvailable, warmupModel,
// keepAlive) and adapter-state operations (configure, getTransportMetadata, listModels,
// probeEndpoint) so application services do not need to reach into adapter internals.
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

    // Apply transport-level configuration. Accepts { baseUrl, params } where params is a
    // partial set of generation defaults (temperature, numPredict, plus hardware overrides).
    async configure(config = {}) {
        throw new Error('Not implemented');
    }

    // Returns aggregated transport state for the AI stack: current baseUrl, source,
    // adapter drift indicators, plus infrastructure observations (containers, volumes,
    // database health) when an infrastructure monitor is wired in.
    async getTransportMetadata() {
        throw new Error('Not implemented');
    }

    // Returns { installed: [...], progress: { [model]: {status, percent, ...} } } so a
    // single round trip covers both catalog and pull-progress queries.
    async listModels() {
        throw new Error('Not implemented');
    }

    // Probe a candidate baseUrl without committing it. Returns { ok, url, modelCount } or
    // { ok: false, url, error }.
    async probeEndpoint(rawUrl, options = {}) {
        throw new Error('Not implemented');
    }
}
