export default class StoryController {
    constructor({ storyService }) {
        if (!storyService) {
            throw new Error('StoryController requires storyService');
        }

        this.storyService = storyService;
    }

    async listStories(req, res) {
        const { userId, userRole } = this._requestUser(req);
        const stories = await this.storyService.listStories(userId, userRole);
        return res.json({ stories });
    }

    async getStory(req, res) {
        const { userId, userRole } = this._requestUser(req);
        const story = await this.storyService.getStoryById(req.params.id, userId, userRole);
        if (!story) {
            return res.status(404).json({ error: 'Story not found' });
        }
        return res.json({ story });
    }

    async createStory(req, res) {
        const { title, titleHtml, chapterHeadingHtml, content, sections, genre, templateId } = req.body || {};
        const { userId } = this._requestUser(req);
        const story = await this.storyService.createStory({
            title,
            titleHtml,
            chapterHeadingHtml,
            content,
            sections,
            genre,
            templateId,
            userId
        });
        return res.status(201).json({ story });
    }

    async updateStory(req, res) {
        const { userId, userRole } = this._requestUser(req);
        const story = await this.storyService.updateStory(
          req.params.id,
          req.body || {},
          userId,
          userRole
        );
        return res.json({ story });
    }

    async deleteStory(req, res) {
        const { userId, userRole } = this._requestUser(req);
        await this.storyService.deleteStory(req.params.id, userId, userRole);
        return res.json({ status: 'deleted' });
    }

    _requestUser(req) {
        return { userId: req.user.sub, userRole: req.user.role };
    }
}
