// Driving port for AI conversation persistence and retrieval.
// Implementors: ConversationService. Consumers: SuggestionUseCase, ConversationController.
export class IConversationService {
    async storeConversation(meta, prompt, response) {
        throw new Error('Not implemented');
    }

    async listConversations(options = {}) {
        throw new Error('Not implemented');
    }

    async deleteConversation(id) {
        throw new Error('Not implemented');
    }
}
