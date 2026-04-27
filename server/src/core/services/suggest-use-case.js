import crypto from 'crypto';
import { ISuggestionService } from '../ports/ISuggestionService.js';

// Wraps AISuggestionService with conversation persistence as a post-suggestion side effect.
// Controllers depend on ISuggestionService and receive this use-case with no knowledge of storage.
// AISuggestionService owns AI calls, RAG, tool execution, and streaming.
export class SuggestionUseCase extends ISuggestionService {
    constructor({ suggestionService, conversationService } = {}) {
        super();
        if (!suggestionService) throw new Error('SuggestionUseCase requires suggestionService');
        this.suggestionService = suggestionService;
        this.conversationService = conversationService || null;
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
                this.conversationService?.storeConversation({ ...options._meta, role: 'system' }, prompt, resp);
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
        await this.conversationService?.storeConversation({ ...options._meta, role: 'user' }, fullPrompt, storedResponse);

        return typeof result === 'string' ? result : (result?.content || '');
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
