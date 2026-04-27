import { IConversationService } from '../ports/IConversationService.js';

// Application service for AI conversation persistence.
// Stores prompt and response records after each suggestion and exposes them for admin review.
// Persistence failures are non-fatal — they must never break an already-delivered suggestion response.
export class ConversationService extends IConversationService {
    constructor({ conversationRepository }) {
        super();
        this.conversationRepository = conversationRepository || null;
    }

    async storeConversation(meta, prompt, response) {
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
            console.warn('[ConversationService] Failed to store conversation:', error.message);
        }
    }

    async listConversations({ limit = 100 } = {}) {
        if (!this.conversationRepository) return [];

        const safeLimit = Number.isFinite(+limit) ? +limit : 100;
        const rows = await this.conversationRepository.list({ limit: safeLimit });

        return rows.map((row) => ({
            id: row._id?.toString() || null,
            interactionId: row.interactionId || null,
            role: row.role || 'user',
            storyId: row.storyId || null,
            userId: row.userId || null,
            model: row.model || null,
            feedbackType: row.feedbackType || null,
            prompt: row.prompt || '',
            response: row.response || '',
            createdAt: row.createdAt || null,
        }));
    }

    async deleteConversation(id) {
        if (!this.conversationRepository || !id) return;
        await this.conversationRepository.delete(id);
    }
}
