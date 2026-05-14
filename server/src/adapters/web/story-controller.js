// The story controller handles HTTP requests related to story management.

import { CreateStorySchema, UpdateStorySchema, validate } from './validation.js';

export default class StoryController {
    constructor({ storyService, indexingService }) {
        if (!storyService) {
            throw new Error('StoryController requires storyService');
        }

        this.storyService = storyService;
        this.indexingService = indexingService || null;
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
        const data = validate(CreateStorySchema, req.body, res);
        if (!data) return;
        const { userId } = this._requestUser(req);
        const story = await this.storyService.createStory({ ...data, userId });
        return res.status(201).json({ story });
    }

    async updateStory(req, res) {
        const data = validate(UpdateStorySchema, req.body, res);
        if (!data) return;
        const { userId, userRole } = this._requestUser(req);
        const story = await this.storyService.updateStory(req.params.id, data, userId, userRole);
        return res.json({ story });
    }

    async deleteStory(req, res) {
        const { userId, userRole } = this._requestUser(req);
        await this.storyService.deleteStory(req.params.id, userId, userRole);
        return res.json({ status: 'deleted' });
    }

    async getIndexStatus(req, res) {
        const status = this.indexingService?.getIndexStatus(req.params.id) ?? null;
        return res.json({ status });
    }

    _requestUser(req) {
        return { userId: req.user.sub, userRole: req.user.role };
    }
}
