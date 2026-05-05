// Handles JSONL streaming from Ollama's /api/generate and /api/chat endpoints.
// Extracted from LocalAIService to isolate the two response shapes (plain text vs. tool-call chat)
// and the JSONL parse loop from the main service orchestration.

import { TIMEOUTS, KEEP_ALIVE } from './ollama-config.js';

export class OllamaStreamStrategy {
    constructor({ transport, hardwareOptions = {} }) {
        if (!transport) throw new Error('OllamaStreamStrategy requires transport');
        this.transport = transport;
        this.hardwareOptions = hardwareOptions;
    }

    async run({ prompt, options, onChunk, model, temperature, numPredict, abortSignal }) {
        const isChat = Boolean(options.tools || Array.isArray(prompt));
        const endpoint = isChat ? '/api/chat' : '/api/generate';

        const payload = {
            model,
            stream: true,
            keep_alive: KEEP_ALIVE,
            options: {
                temperature,
                num_predict: numPredict,
                ...this.hardwareOptions,
            },
        };

        if (isChat) {
            payload.messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
            if (options.tools) payload.tools = options.tools;
        } else {
            payload.prompt = prompt;
        }

        try {
            const res = await this.transport._post(endpoint, payload, {
                signal: abortSignal,
                timeoutMs: TIMEOUTS.STREAM,
            });
            return await this._consume(res, isChat, onChunk);
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                if (abortSignal?.aborted) throw new Error('Request aborted');
                throw new Error(
                    `Model ${model} failed to respond within ${TIMEOUTS.STREAM / 1000} seconds. Please try again or use a different model.`
                );
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

        if (successfulChunks === 0) {
            throw new Error('No valid responses received from Ollama');
        }
        return isChat ? { content: fullResponse, toolCalls } : fullResponse;
    }
}