import { buildContentFromSections } from '../domain/RichText.js';

export class StoryService {
    constructor({ storyRepository, summarizationService, indexingService }) {
        if (!storyRepository) {
            throw new Error('StoryService requires storyRepository');
        }

        this.storyRepository = storyRepository;
        this.summarizationService = summarizationService || null;
        this.indexingService = indexingService || null;
    }

    async createStory(data) {
        const { title, content, sections } = data;
        if (!title) throw new Error('title is required');

        const hasContent = typeof content === 'string' && content.trim().length > 0;
        const hasSections = Array.isArray(sections) && sections.length > 0;

        if (!hasContent && !hasSections) {
            throw new Error('content or sections are required');
        }

        const normalizedContent = hasContent ? content : buildContentFromSections(sections);

        // Summaries are generated at write time so read paths stay sort of lightweight.
        await this.summarizationService?.ensureSummaryModelReady();
        const summaries = this.summarizationService
            ? await this.summarizationService.buildStorySummaries(title, sections)
            : {};

        const story = await this.storyRepository.createStory({
            ...data,
            content: normalizedContent,
            ...summaries,
        });

        this.indexingService?.triggerIndexing(story.id, data);
        return story;
    }

    async updateStory(id, updates, userId, userRole) {
        const story = await this._getStoryAndVerifyAccess(id, userId, userRole);
        const updatePayload = { ...updates };

        if (Array.isArray(updates.sections)) {
            if (updates.content === undefined) {
                updatePayload.content = buildContentFromSections(updates.sections);
            }

            await this.summarizationService?.ensureSummaryModelReady();

            if (this.summarizationService) {
                const { chapterSummaries, beatSummaries, storySummary } =
                    await this.summarizationService.buildStorySummaries(
                        updates.title || story.title,
                        updates.sections
                    );
                Object.assign(updatePayload, { chapterSummaries, beatSummaries, storySummary });
            }
        }

        const updatedStory = await this.storyRepository.updateStory(id, updatePayload);

        if (updates.content !== undefined || Array.isArray(updates.sections)) {
            this.indexingService?.triggerIndexing(id, { ...story, ...updates });
        }

        return updatedStory;
    }

    async deleteStory(id, userId, userRole) {
        await this._getStoryAndVerifyAccess(id, userId, userRole);
        this.indexingService?.deleteStoryContext(id);
        return this.storyRepository.deleteStory(id);
    }

    async getStoryById(id, userId, userRole) {
        return this._getStoryAndVerifyAccess(id, userId, userRole, false);
    }

    async listStories(userId, userRole) {
        return this.storyRepository.listStories(userRole === 'admin' ? undefined : { userId });
    }

    async getFacts(storyId, actor) {
        const story = await this._getStoryAndVerifyAccess(storyId, actor.userId, actor.role, false);
        return story?.facts || [];
    }

    async saveFacts(storyId, facts, actor) {
        await this._getStoryAndVerifyAccess(storyId, actor.userId, actor.role);
        await this.storyRepository.updateStory(storyId, { facts });
    }

    async _getStoryAndVerifyAccess(id, userId, userRole, throwOnNotFound = true) {
        if (!id) throw new Error('id is required');

        const story = await this.storyRepository.getStoryById(id);

        if (!story) {
            if (throwOnNotFound) throw new Error('Story not found');
            return null;
        }

        if (userRole !== 'admin' && story.userId !== userId) {
            throw new Error('Forbidden');
        }

        return story;
    }
}