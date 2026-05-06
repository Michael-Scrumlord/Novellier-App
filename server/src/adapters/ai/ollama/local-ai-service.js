// Ollama implementation of IAIService. OllamaTransport is defined in this module as a
// module-private class. Streaming logic (formerly OllamaStreamStrategy) is inlined as
// private methods _runStream / _consume to eliminate the intermediate file boundary.

import { IAIService } from '../../../core/ports/IAIService.js';
import { DEFAULT_BASE_URL, TIMEOUTS, KEEP_ALIVE } from './ollama-config.js';

// Module-private HTTP transport for the Ollama server. Composes caller and timeout signals
// via AbortSignal.any so a hung Ollama process can't block the caller.
// probeEndpoint accepts an arbitrary URL so OllamaEndpointService can validate a candidate
// URL before committing it as the active baseUrl.
class OllamaTransport {
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
            if (!res.ok) return { ok: false, url, status: res.status, error: `HTTP ${res.status}` };
            const data = await res.json();
            const modelCount = Array.isArray(data?.models) ? data.models.length : 0;
            return { ok: true, url, status: 200, modelCount };
        } catch (error) {
            const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
            return { ok: false, url, error: isTimeout ? `Connection timed out after ${timeoutMs}ms` : error.message };
        }
    }
}

export class LocalAIService extends IAIService {
    constructor({
        baseUrl,
        modelManager,
        streamingSemaphore,
        model,
        temperature,
        numPredict,
        hardwareOptions,
    } = {}) {
        super();
        this.transport = new OllamaTransport({ baseUrl });
        this.modelManager = modelManager || null;
        this.streamingSemaphore = streamingSemaphore || null;
        this.model = model || null;
        this.defaultTemperature = temperature ?? 0.8;
        this.defaultNumPredict = numPredict ?? 150;
        this.hardwareOptions = hardwareOptions || {};
    }

    setBaseUrl(url) { return this.transport.setBaseUrl(url); }
    getBaseUrl() { return this.transport.getBaseUrl(); }
    probeEndpoint(url, options) { return this.transport.probeEndpoint(url, options); }

    async generateCompletion(prompt, options = {}) {
        const model = options.model || this.model;
        if (!model) throw new Error('No model configured. Assign an active model via Admin > AI Models.');
        const temperature = Number(options.temperature || this.defaultTemperature);
        const numPredict = Number(options.maxTokens || this.defaultNumPredict);

        try {
            const res = await this.transport._post(
                '/api/generate',
                {
                    model,
                    prompt,
                    stream: false,
                    keep_alive: KEEP_ALIVE,
                    options: { temperature, num_predict: numPredict, ...this.hardwareOptions },
                },
                { signal: options.abortSignal, timeoutMs: TIMEOUTS.GENERATE }
            );
            const data = await res.json();
            const content = data?.response;
            if (!content) throw new Error('Unexpected local LLM response');
            return content;
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                if (options.abortSignal?.aborted) throw new Error('Request aborted');
                throw new Error(`Model ${model} failed to respond within ${TIMEOUTS.GENERATE / 1000} seconds. Please try again or use a different model.`);
            }
            throw error;
        }
    }

    async ensureModelAvailable(modelName) {
        const model = modelName || this.model;

        try {
            const res = await this.transport._post('/api/show', { name: model }, { timeoutMs: TIMEOUTS.UNARY });
            const data = await res.json();
            const template = data?.template || '';
            const supportsTools = template.includes('.Tools') || template.includes('.ToolCalls');
            return { model, status: 'ready', supportsTools };
        } catch (error) {
            if (!error.message.includes('404')) throw error;
        }

        await this.transport._post('/api/pull', { name: model, stream: false }, { timeoutMs: TIMEOUTS.PULL });
        await this.modelManager._markReady(model);
        return { model, status: 'pulled' };
    }

    async warmupModel(modelName) {
        const model = modelName || this.model;
        console.log(`[Warmup] Pre-loading model: ${model}`);

        try {
            const startTime = Date.now();
            await this.transport._post(
                '/api/generate',
                { model, prompt: 'Hello', stream: false, keep_alive: KEEP_ALIVE, options: { num_predict: 1, ...this.hardwareOptions } },
                { timeoutMs: TIMEOUTS.WARMUP }
            );
            const duration = Date.now() - startTime;
            console.log(`[Warmup] Model ${model} loaded successfully in ${duration}ms`);
            return { model, status: 'warmed', duration };
        } catch (error) {
            console.error(`[Warmup] Failed to warm up model ${model}:`, error.message);
            return { model, status: 'warmup_failed', error: error.message };
        }
    }

    async keepAlive(modelName) {
        const model = modelName || this.model;
        try {
            await this.transport._post(
                '/api/generate',
                { model, prompt: '', keep_alive: KEEP_ALIVE, stream: false },
                { timeoutMs: TIMEOUTS.UNARY }
            );
            return { model, status: 'kept_alive' };
        } catch (error) {
            console.error(`[KeepAlive] Failed for model ${model}:`, error.message);
            return { model, status: 'keepalive_failed' };
        }
    }

    setDefaultParams({ temperature, numPredict, ...hardwareOverrides }) {
        if (temperature != null) this.defaultTemperature = temperature;
        if (numPredict != null) this.defaultNumPredict = numPredict;
        if (Object.keys(hardwareOverrides).length > 0) {
            Object.assign(this.hardwareOptions, hardwareOverrides);
        }
    }

    async generateStreamingCompletion(prompt, options = {}, onChunk) {
        const model = options.model || this.model;
        if (!model) throw new Error('No model configured. Assign an active model via Admin > AI Models.');
        const temperature = Number(options.temperature || this.defaultTemperature);
        const numPredict = Number(options.maxTokens || this.defaultNumPredict);
        const runArgs = { prompt, options, onChunk, model, temperature, numPredict, abortSignal: options.abortSignal };

        if (this.streamingSemaphore) {
            return this.streamingSemaphore.withPermit(options.abortSignal, () => this._runStream(runArgs));
        }
        return this._runStream(runArgs);
    }

    async _runStream({ prompt, options, onChunk, model, temperature, numPredict, abortSignal }) {
        const isChat = Boolean(options.tools || Array.isArray(prompt));
        const endpoint = isChat ? '/api/chat' : '/api/generate';

        const payload = {
            model,
            stream: true,
            keep_alive: KEEP_ALIVE,
            options: { temperature, num_predict: numPredict, ...this.hardwareOptions },
        };

        if (isChat) {
            payload.messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
            if (options.tools) payload.tools = options.tools;
        } else {
            payload.prompt = prompt;
        }

        try {
            const res = await this.transport._post(endpoint, payload, { signal: abortSignal, timeoutMs: TIMEOUTS.STREAM });
            return await this._consume(res, isChat, onChunk);
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                if (abortSignal?.aborted) throw new Error('Request aborted');
                throw new Error(`Model ${model} failed to respond within ${TIMEOUTS.STREAM / 1000} seconds. Please try again or use a different model.`);
            }
            throw new Error(`Ollama connection failed for model ${model}: ${error.message}`);
        }
    }

    async _consume(res, isChat, onChunk) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let successfulChunks = 0;
        let buffer = '';
        let toolCalls = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const parsed = JSON.parse(line);

                    if (parsed.message) {
                        if (parsed.message.content) {
                            fullResponse += parsed.message.content;
                            successfulChunks++;
                            onChunk(parsed.message.content);
                        }
                        if (parsed.message.tool_calls) {
                            toolCalls = parsed.message.tool_calls;
                            successfulChunks++;
                        }
                    } else if (parsed.response) {
                        fullResponse += parsed.response;
                        successfulChunks++;
                        onChunk(parsed.response);
                    }

                    if (parsed.done) {
                        return isChat ? { content: fullResponse, toolCalls } : fullResponse;
                    }
                } catch {
                    // Skip invalid JSON lines.
                }
            }
        }

        if (successfulChunks === 0) throw new Error('No valid responses received from Ollama');
        return isChat ? { content: fullResponse, toolCalls } : fullResponse;
    }
}
