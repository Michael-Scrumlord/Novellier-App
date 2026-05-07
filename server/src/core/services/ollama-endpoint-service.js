const ENDPOINT_SETTING_KEY = 'ollama_endpoint';
const DEFAULT_FALLBACK_URL = 'http://ollama:11434';

function normalizeUrl(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch {
        return null;
    }
}

export class OllamaEndpointService {
    constructor({ aiService, vectorRepository, infrastructureRepository, envFallbackUrl, logger } = {}) {
        if (!aiService) throw new Error('OllamaEndpointService requires aiService');
        if (!infrastructureRepository) throw new Error('OllamaEndpointService requires infrastructureRepository');
        this.aiService = aiService;
        this.vectorRepository = vectorRepository || null;
        this.infrastructureRepository = infrastructureRepository;
        this.envFallbackUrl = envFallbackUrl || DEFAULT_FALLBACK_URL;
        this.logger = logger || console;
        this.currentUrl = this.envFallbackUrl;
        this.source = 'env';
    }

    async hydrate() {
        try {
            const stored = await this.infrastructureRepository.getSetting(ENDPOINT_SETTING_KEY);
            const persistedUrl = normalizeUrl(stored?.url);
            const url = persistedUrl || this.envFallbackUrl;
            this.source = persistedUrl ? 'db' : 'env';
            await this._applyToAdapters(url);
            this.currentUrl = url;
            this.logger.log(`[OllamaEndpoint] Hydrated URL: ${url} (source: ${this.source}, envFallback: ${this.envFallbackUrl})`);
        } catch (error) {
            this.logger.warn(`[OllamaEndpoint] Hydration failed, using env default: ${error.message}`);
            await this._applyToAdapters(this.envFallbackUrl);
            this.currentUrl = this.envFallbackUrl;
            this.source = 'env';
        }
    }

    async getEndpoint() {
        const meta = await this.aiService.getTransportMetadata();
        const inSync =
            meta.observed?.llmAdapter === this.currentUrl &&
            (meta.observed?.chromaAdapter == null || meta.observed.chromaAdapter === this.currentUrl);

        return {
            url: this.currentUrl,
            fallbackUrl: this.envFallbackUrl,
            source: this.source,
            observed: meta.observed,
            inSync,
        };
    }

    async setEndpoint(rawUrl) {
        const url = normalizeUrl(rawUrl);
        if (!url) throw new Error('Invalid URL. Must be a valid http:// or https:// URL.');

        await this.infrastructureRepository.saveSetting(ENDPOINT_SETTING_KEY, { url });
        await this._applyToAdapters(url);
        this.currentUrl = url;
        this.source = 'db';

        return this.getEndpoint();
    }

    async resetToEnvDefault() {
        await this.infrastructureRepository.saveSetting(ENDPOINT_SETTING_KEY, { url: null });
        await this._applyToAdapters(this.envFallbackUrl);
        this.currentUrl = this.envFallbackUrl;
        this.source = 'env';
        return this.getEndpoint();
    }

    async testConnection(rawUrl) {
        const url = rawUrl ? normalizeUrl(rawUrl) : this.currentUrl;
        if (!url) throw new Error('Invalid URL');
        return this.aiService.probeEndpoint(url, { timeoutMs: 5000 });
    }

    async _applyToAdapters(url) {
        await this.aiService.configure({ baseUrl: url });
        if (this.vectorRepository?.updateTransport) {
            this.vectorRepository.updateTransport({ baseUrl: url });
        }
    }
}
