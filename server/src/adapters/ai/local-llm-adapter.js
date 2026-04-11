import { IAIService } from '../../core/ports/IAIService.js';

export default class LocalLLMAdapter extends IAIService {
    constructor({ baseUrl = 'http://ollama:11434', model = 'phi3', temperature = 0.8, numPredict = 150, hardwareOptions } = {}) {
        super();
        this.baseUrl = baseUrl;
        this.model = model;
        this.defaultTemperature = temperature;
        this.defaultNumPredict = numPredict;
    }

    /** POSTs JSON to Ollama */
    async _post(path, body, options = {}) {
        const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal
        });
        if (!res.ok) throw new Error(`Ollama ${res.status} ${res.statusText}`);
        return res;
    }

    async generateCompletion(prompt, options = {}) {
        const model = options.model || this.model;
        const temperature = Number(options.temperature || this.defaultTemperature);
        const numPredict = Number(options.maxTokens || this.defaultNumPredict);

        try {
        const res = await this._post('/api/generate', {
            model,
            prompt,
            stream: false,
            keep_alive: '30m',
            options: {
            temperature,
            num_predict: numPredict,
            ...this.hardwareOptions
            }
        }, {
            signal: options.abortSignal || AbortSignal.timeout(180000)
        });

        const data = await res.json();
        const content = data?.response;
        if (!content) {
            throw new Error('Unexpected local LLM response');
        }

        return content;
        } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            if (options.abortSignal?.aborted) throw new Error('Request aborted');
            throw new Error(`Model ${model} failed to respond within 180 seconds. Please try again or use a different model.`);
        }
        throw error;
        }
    }

    async ensureModelAvailable(modelName) {
        const model = modelName || this.model;

        try {
        await this._post('/api/show', { name: model });
        return { model, status: 'ready' };
        } catch (error) {
        if (!error.message.includes('404')) {
            throw error;
        }
        }

        await this._post('/api/pull', { name: model });
        return { model, status: 'pulled' };
    }

    /**
     * Warm up the model by loading it into memory with a minimal prompt
     * This significantly reduces the first-request latency
     */
    async warmupModel(modelName) {
        const model = modelName || this.model;
        console.log(`[Warmup] Pre-loading model: ${model}`);
        
        try {
        const startTime = Date.now();
        
        await this._post('/api/generate', {
            model,
            prompt: 'Hello',
            stream: false,
            keep_alive: '30m',
            options: {
            num_predict: 1,
            ...this.hardwareOptions
            }
        }, {
            signal: AbortSignal.timeout(120000)
        });
        
        const duration = Date.now() - startTime;
        console.log(`[Warmup] Model ${model} loaded successfully in ${duration}ms`);
        return { model, status: 'warmed', duration };
        } catch (error) {
        console.error(`[Warmup] Failed to warm up model ${model}:`, error.message);
        return { model, status: 'warmup_failed', error: error.message };
        }
    }

    /**
     * Keep the model active in memory by periodically sending minimal requests
     */
    async keepAlive(modelName) {
        const model = modelName || this.model;
        
        try {
        await this._post('/api/generate', {
            model,
            prompt: '',
            keep_alive: '30m',
            stream: false
        });
        
        return { model, status: 'kept_alive' };
        } catch (error) {
        console.error(`[KeepAlive] Failed for model ${model}:`, error.message);
        return { model, status: 'keepalive_failed' };
        }
    }

    async generateStreamingCompletion(prompt, options = {}, onChunk) {
        const model = options.model || this.model;
        const temperature = Number(options.temperature || this.defaultTemperature);
        const numPredict = Number(options.maxTokens || this.defaultNumPredict);

        const abortSignal = options.abortSignal;

        try {
        const res = await this._post('/api/generate', {
            model,
            prompt,
            stream: true,
            keep_alive: '30m',
            options: {
            temperature,
            num_predict: numPredict,
            ...this.hardwareOptions
            }
        }, {
            signal: abortSignal || AbortSignal.timeout(180000)
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let successfulChunks = 0;
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                fullResponse += parsed.response;
                successfulChunks++;
                onChunk(parsed.response);
                }
                if (parsed.done) {
                return fullResponse;
                }
            } catch {
                // Skip invalid JSON lines
            }
            }
        }

        if (successfulChunks === 0) {
            throw new Error('No valid responses received from Ollama');
        }
        return fullResponse;
        } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            if (abortSignal?.aborted) throw new Error('Request aborted');
            throw new Error(`Model ${model} failed to respond within 180 seconds. Please try again or use a different model.`);
        }
        throw new Error(`Ollama connection failed for model ${model}: ${error.message}`);
        }
    }
}
