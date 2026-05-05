import crypto from 'crypto';
import { ISuggestionService } from '../ports/ISuggestionService.js';

export class SuggestionUseCase extends ISuggestionService {
    constructor({ suggestionService, conversationRepository } = {}) {
        super();
        if (!suggestionService) throw new Error('SuggestionUseCase requires suggestionService');
        this.suggestionService = suggestionService;
        this.conversationRepository = conversationRepository || null;
    }

    getTelemetrySnapshot() {
        return this.suggestionService.getTelemetrySnapshot();
    }

    async getSuggestion(storyText, options = {}) {
        const originalOnChunk = options.onChunk;

        // Ensure every request has an ID so turns can be grouped into conversation threads.
        if (options._meta) {
            options._meta.interactionId = options._meta.interactionId || crypto.randomUUID();
        }

        let accumulatedResponse = '';
        let fullPrompt = storyText;

        const wrappedOptions = {
            ...options,
            onPromptBuilt: (prompt) => {
                fullPrompt = prompt;
            },
            logConversation: (prompt, resp) => {
                this.#persistConversation({ ...options._meta, role: 'system' }, prompt, resp);
            },
            ...(originalOnChunk && {
                onChunk: (chunk) => {
                    accumulatedResponse += chunk;
                    originalOnChunk(chunk);
                },
            }),
        };

        const result = await this.suggestionService.getSuggestion(storyText, wrappedOptions);

        const storedResponse = resolveStoredResponse(accumulatedResponse, originalOnChunk, result, options.mode);
        await this.#persistConversation({ ...options._meta, role: 'user' }, fullPrompt, storedResponse);

        return typeof result === 'string' ? result : (result?.content || '');
    }

    async #persistConversation(meta, prompt, response) {
        if (!this.conversationRepository || !meta) return;
        if (!response || !String(response).trim()) return;
        try {
            await this.conversationRepository.create({
                userId: meta.userId,
                interactionId: meta.interactionId,
                role: meta.role || 'user',
                storyId: meta.storyId,
                model: meta.model,
                feedbackType: meta.feedbackType,
                prompt,
                response,
            });
        } catch (error) {
            console.warn('[SuggestionUseCase] Failed to persist conversation:', error.message);
        }
    }
}

function resolveStoredResponse(accumulated, originalOnChunk, result, mode) {
    if (originalOnChunk && accumulated.trim()) return accumulated;
    if (typeof result === 'string') return result;
    if (result?.content?.trim()) return result.content;
    if (result?.toolCalls?.length) return JSON.stringify(result.toolCalls, null, 2);
    if (mode === 'tool') return '[Tool Execution Requested]';
    return '';
}