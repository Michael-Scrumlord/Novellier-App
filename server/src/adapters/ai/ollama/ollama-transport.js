import { DEFAULT_BASE_URL, TIMEOUTS } from './ollama-config.js';

// Pure HTTP transport for the Ollama server. Composes caller and timeout signals via AbortSignal.any
// so a hung Ollama process can't block the caller. probeEndpoint accepts an arbitrary URL so
// OllamaEndpointService can validate a candidate URL before committing it as the active baseUrl.
export class OllamaTransport {
    constructor({ baseUrl = DEFAULT_BASE_URL } = {}) {
        this.baseUrl = baseUrl;
        this._lastLoggedUrl = null;
    }

    setBaseUrl(url) {
        const trimmed = typeof url === 'string' ? url.trim() : '';
        if (!trimmed) throw new Error('Ollama URL cannot be empty');
        const next = trimmed.replace(/\/+$/, '');
        if (next !== this.baseUrl) {
            console.log(`[OllamaTransport] baseUrl changed: ${this.baseUrl} -> ${next}`);
            this._lastLoggedUrl = null;
        }
        this.baseUrl = next;
    }

    getBaseUrl() {
        return this.baseUrl;
    }

    _logFirstUse(endpoint) {
        if (this._lastLoggedUrl === this.baseUrl) return;
        console.log(`[OllamaTransport] First request to ${this.baseUrl}${endpoint}`);
        this._lastLoggedUrl = this.baseUrl;
    }

    _composeSignal(callerSignal, timeoutMs) {
        const signals = [];
        if (callerSignal) signals.push(callerSignal);
        if (timeoutMs && timeoutMs > 0) signals.push(AbortSignal.timeout(timeoutMs));
        if (signals.length === 0) return undefined;
        if (signals.length === 1) return signals[0];
        return AbortSignal.any(signals);
    }

    async _post(path, body, { signal, timeoutMs = TIMEOUTS.UNARY } = {}) {
        this._logFirstUse(path);
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: this._composeSignal(signal, timeoutMs),
        });
        if (!res.ok) throw new Error(`Ollama ${res.status} ${res.statusText}`);
        return res;
    }

    async _get(path, { signal, timeoutMs = TIMEOUTS.UNARY } = {}) {
        this._logFirstUse(path);
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'GET',
            signal: this._composeSignal(signal, timeoutMs),
        });
        if (!res.ok) throw new Error(`Ollama ${res.status} ${res.statusText}`);
        return res;
    }

    async probeEndpoint(rawUrl, { timeoutMs = TIMEOUTS.PROBE } = {}) {
        if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
            return { ok: false, url: rawUrl, error: 'Invalid URL' };
        }
        const url = rawUrl.trim().replace(/\/+$/, '');
        try {
            const res = await fetch(`${url}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!res.ok) {
                return { ok: false, url, status: res.status, error: `HTTP ${res.status}` };
            }
            const data = await res.json();
            const modelCount = Array.isArray(data?.models) ? data.models.length : 0;
            return { ok: true, url, status: 200, modelCount };
        } catch (error) {
            const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
            const message = isTimeout ? `Connection timed out after ${timeoutMs}ms` : error.message;
            return { ok: false, url, error: message };
        }
    }
}
