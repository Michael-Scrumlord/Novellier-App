// Driving port for AI Suggestion Generation. Consumed by SuggestionController (web adapter). 
// Implemented by AISuggestionService (raw AI + RAG orchestration) and SuggestionUseCase (wraps AISuggestionService with conversation storage).
export class ISuggestionService {
    async getSuggestion(storyText, options = {}) {
        throw new Error('Not implemented');
    }

    getTelemetrySnapshot() {
        throw new Error('Not implemented');
    }
}
