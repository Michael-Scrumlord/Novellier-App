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
    constructor({ runtimeConfigRepository, llmAdapter, vectorRepository, envFallbackUrl, logger } = {}) {
        if (!runtimeConfigRepository) throw new Error('OllamaEndpointService requires runtimeConfigRepository');
        if (!llmAdapter) throw new Error('OllamaEndpointService requires llmAdapter');
        this.repo = runtimeConfigRepository;
        this.llmAdapter = llmAdapter;
        this.vectorRepository = vectorRepository || null;
        this.envFallbackUrl = envFallbackUrl || DEFAULT_FALLBACK_URL;
        this.logger = logger || console;
        this.currentUrl = this.envFallbackUrl;
        this.source = 'env';
    }

    async hydrate() {
        try {
            const stored = await this.repo.getOllamaEndpoint();
            const persistedUrl = normalizeUrl(stored?.url);
            const url = persistedUrl || this.envFallbackUrl;
            this.source = persistedUrl ? 'db' : 'env';
            this._applyToAdapters(url, { phase: 'hydrate' });
            this.currentUrl = url;
            this.logger.log(`[OllamaEndpoint] Hydrated URL: ${url} (source: ${this.source}, envFallback: ${this.envFallbackUrl})`);
        } catch (error) {
            this.logger.warn(`[OllamaEndpoint] Hydration failed, using env default: ${error.message}`);
            this._applyToAdapters(this.envFallbackUrl, { phase: 'hydrate_fallback' });
            this.currentUrl = this.envFallbackUrl;
            this.source = 'env';
        }
    }

    /**
     * Returns the current state with observed adapter URLs so the UI can detect drift.
     */
    getEndpoint() {
        const adapterUrl = this.llmAdapter.getBaseUrl ? this.llmAdapter.getBaseUrl() : null;
        const chromaAdapterUrl = this.vectorRepository?.getOllamaUrl
            ? this.vectorRepository.getOllamaUrl()
            : null;
        const inSync = adapterUrl === this.currentUrl && (chromaAdapterUrl === null || chromaAdapterUrl === this.currentUrl);

        return {
            url: this.currentUrl,
            fallbackUrl: this.envFallbackUrl,
            source: this.source,
            observed: {
                llmAdapter: adapterUrl,
                chromaAdapter: chromaAdapterUrl,
            },
            inSync,
        };
    }

    async setEndpoint(rawUrl) {
        const url = normalizeUrl(rawUrl);
        if (!url) throw new Error('Invalid URL. Must be a valid http:// or https:// URL.');

        this.logger.log(`[OllamaEndpoint] setEndpoint begin: "${rawUrl}" -> "${url}"`);

        await this.repo.saveOllamaEndpoint({ url });
        this._applyToAdapters(url, { phase: 'set' });
        this.currentUrl = url;
        this.source = 'db';

        const state = this.getEndpoint();
        if (!state.inSync) {
            this.logger.warn(`[OllamaEndpoint] Adapter drift detected after save: ${JSON.stringify(state)}`);
        }
        this.logger.log(`[OllamaEndpoint] setEndpoint complete. observed=${JSON.stringify(state.observed)}`);
        return state;
    }

    async resetToEnvDefault() {
        await this.repo.saveOllamaEndpoint({ url: null });
        this._applyToAdapters(this.envFallbackUrl, { phase: 'reset' });
        this.currentUrl = this.envFallbackUrl;
        this.source = 'env';
        return this.getEndpoint();
    }

    async testConnection(rawUrl) {
        const url = rawUrl ? normalizeUrl(rawUrl) : this.currentUrl;
        if (!url) throw new Error('Invalid URL');
        return this.llmAdapter.probeEndpoint(url, { timeoutMs: 5000 });
    }

    _applyToAdapters(url, { phase } = {}) {
        const beforeLlm = this.llmAdapter.getBaseUrl ? this.llmAdapter.getBaseUrl() : null;
        this.llmAdapter.setBaseUrl(url);
        const afterLlm = this.llmAdapter.getBaseUrl ? this.llmAdapter.getBaseUrl() : null;

        let beforeChroma = null;
        let afterChroma = null;
        if (this.vectorRepository?.setOllamaUrl) {
            beforeChroma = this.vectorRepository.getOllamaUrl ? this.vectorRepository.getOllamaUrl() : null;
            this.vectorRepository.setOllamaUrl(url);
            afterChroma = this.vectorRepository.getOllamaUrl ? this.vectorRepository.getOllamaUrl() : null;
        }

        this.logger.log(
            `[OllamaEndpoint] _applyToAdapters[${phase || 'manual'}] llm=${beforeLlm}→${afterLlm} chroma=${beforeChroma}→${afterChroma}`
        );
    }
}
