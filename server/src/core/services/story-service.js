// Story service
// Its responsibilities include: enforcing story ownership and auth rules, normalizing story content, delegating AI summary to story summarization service, 
// delegating vector indexing to story indexing service, and implementing IStoryFactsGateway for AISuggestionService to read/write facts through a narrow, explicitly declared port.
import { IStoryFactsGateway } from '../ports/IStoryFactsGateway.js';

export class StoryService extends IStoryFactsGateway {
    constructor({ storyRepository, summarizationService, indexingService }) {
        super();
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

        const normalizedContent = hasContent ? content : this._buildContentFromSections(sections);

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
        if (updates.content !== undefined) {
            updatePayload.content = updates.content;
        } else if (Array.isArray(updates.sections)) {
            updatePayload.content = this._buildContentFromSections(updates.sections);
        }

        await this.summarizationService?.ensureSummaryModelReady();

        if (Array.isArray(updates.sections) && this.summarizationService) {
            const summaries = await this.summarizationService.buildStorySummaries(
                updates.title || story.title,
                updates.sections
            );
            updatePayload.chapterSummaries = summaries.chapterSummaries;
            updatePayload.beatSummaries = summaries.beatSummaries;
            updatePayload.storySummary = summaries.storySummary;
            updatePayload.storySummaryShort = summaries.storySummaryShort;
            updatePayload.storySummaryLong = summaries.storySummaryLong;
        }

        const updatedStory = await this.storyRepository.updateStory(id, updatePayload);

        if (updates.content || updates.sections) {
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

    _buildContentFromSections(sections = []) {
        return sections
            .map((section) => `${section.title || 'Section'}\n${section.content || ''}`)
            .join('\n\n');
    }
}
