// Ollama implementation of IAIService. Handles text generation (streaming and non-streaming),
// model warmup, keep-alive, and availability checks via the Ollama HTTP API.
// Delegates streaming to OllamaStreamStrategy; uses an optional semaphore to cap concurrent streams.

import { IAIService } from '../../../core/ports/IAIService.js';
import { TIMEOUTS, KEEP_ALIVE } from './ollama-config.js';
import { OllamaStreamStrategy } from './ollama-stream-strategy.js';

export class LocalAIService extends IAIService {
    constructor({
        transport,
        modelManager,
        streamingSemaphore,
        streamStrategy,
        model,
        temperature,
        numPredict,
        hardwareOptions,
    } = {}) {
        super();
        if (!transport) throw new Error('LocalAIService requires transport');
        if (!modelManager) throw new Error('LocalAIService requires modelManager');
        this.transport = transport;
        this.modelManager = modelManager;
        this.streamingSemaphore = streamingSemaphore || null;
        this.streamStrategy = streamStrategy || new OllamaStreamStrategy({
            transport,
            hardwareOptions: hardwareOptions || {},
        });
        this.model = model || null;
        this.defaultTemperature = temperature ?? 0.8;
        this.defaultNumPredict = numPredict ?? 150;
        this.hardwareOptions = hardwareOptions || {};
    }

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
                    options: {
                        temperature,
                        num_predict: numPredict,
                        ...this.hardwareOptions,
                    },
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
                throw new Error(
                    `Model ${model} failed to respond within ${TIMEOUTS.GENERATE / 1000} seconds. Please try again or use a different model.`
                );
            }
            throw error;
        }
    }

    async ensureModelAvailable(modelName) {
        const model = modelName || this.model;

        try {
            const res = await this.transport._post(
                '/api/show',
                { name: model },
                { timeoutMs: TIMEOUTS.UNARY }
            );
            const data = await res.json();
            const template = data?.template || '';
            const supportsTools = template.includes('.Tools') || template.includes('.ToolCalls');
            return { model, status: 'ready', supportsTools };
        } catch (error) {
            if (!error.message.includes('404')) throw error;
        }

        await this.transport._post(
            '/api/pull',
            { name: model, stream: false },
            { timeoutMs: TIMEOUTS.PULL }
        );
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
                {
                    model,
                    prompt: 'Hello',
                    stream: false,
                    keep_alive: KEEP_ALIVE,
                    options: {
                        num_predict: 1,
                        ...this.hardwareOptions,
                    },
                },
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
            Object.assign(this.streamStrategy.hardwareOptions, hardwareOverrides);
        }
    }

    async generateStreamingCompletion(prompt, options = {}, onChunk) {
        const model = options.model || this.model;
        if (!model) throw new Error('No model configured. Assign an active model via Admin > AI Models.');
        const temperature = Number(options.temperature || this.defaultTemperature);
        const numPredict = Number(options.maxTokens || this.defaultNumPredict);

        const abortSignal = options.abortSignal;
        const runArgs = { prompt, options, onChunk, model, temperature, numPredict, abortSignal };

        if (this.streamingSemaphore) {
            return this.streamingSemaphore.withPermit(abortSignal, () => this.streamStrategy.run(runArgs));
        }
        return this.streamStrategy.run(runArgs);
    }
}