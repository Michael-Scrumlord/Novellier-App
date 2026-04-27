// HTTP adapter for conversation history (admin only).
// Translates list and delete requests into ConversationService calls.
export default class ConversationController {
    constructor({ conversationService }) {
        if (!conversationService) throw new Error('ConversationController requires conversationService');
        this.conversationService = conversationService;
    }

    async listConversations(req, res) {
        try {
            const limit = Number(req.query.limit || 100);
            const conversations = await this.conversationService.listConversations({ limit });
            return res.json({ conversations });
        } catch (error) {
            console.error('[ConversationController] ListConversations Error:', error.message);
            return res.status(500).json({ error: 'Failed to list conversations' });
        }
    }

    async deleteConversation(req, res) {
        try {
            await this.conversationService.deleteConversation(req.params.id);
            return res.json({ success: true });
        } catch (error) {
            console.error('[ConversationController] DeleteConversation Error:', error.message);
            return res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
}
