// HTTP adapter for conversation history (admin only).
export default class ConversationController {
    constructor({ conversationRepository }) {
        if (!conversationRepository) throw new Error('ConversationController requires conversationRepository');
        this.conversationRepository = conversationRepository;
    }

    async listConversations(req, res) {
        try {
            const limit = Number(req.query.limit || 100);
            const safeLimit = Number.isFinite(limit) ? limit : 100;
            const rows = await this.conversationRepository.list({ limit: safeLimit });
            const conversations = rows.map((row) => ({
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
            return res.json({ conversations });
        } catch (error) {
            console.error('[ConversationController] ListConversations Error:', error.message);
            return res.status(500).json({ error: 'Failed to list conversations' });
        }
    }

    async deleteConversation(req, res) {
        try {
            await this.conversationRepository.delete(req.params.id);
            return res.json({ success: true });
        } catch (error) {
            console.error('[ConversationController] DeleteConversation Error:', error.message);
            return res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
}