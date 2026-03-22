export class StoryService {
  constructor({ storyRepository, vectorRepository }) {
    if (!storyRepository) {
      throw new Error('StoryService requires storyRepository');
    }

    this.storyRepository = storyRepository;
    this.vectorRepository = vectorRepository;
  }

  async createStory({ title, titleHtml, chapterHeadingHtml, content, sections, genre, templateId, userId }) {
    if (!title) {
      throw new Error('title is required');
    }

    const hasContent = typeof content === 'string' && content.trim().length > 0;
    const hasSections = Array.isArray(sections) && sections.length > 0;

    if (!hasContent && !hasSections) {
      throw new Error('content or sections are required');
    }

    const normalizedContent = hasContent ? content : this.buildContentFromSections(sections);

    const story = await this.storyRepository.createStory({
      title,
      titleHtml,
      chapterHeadingHtml,
      content: normalizedContent,
      sections,
      genre,
      templateId,
      userId
    });

    if (this.vectorRepository && story.id && Array.isArray(sections)) {
      this.indexStoryContent(story.id, {
        title,
        genre,
        templateId,
        sections
      }).catch((err) => {
        console.error('Failed to index story content:', err.message);
      });
    }

    return story;
  }

  async updateStory(id, updates, userId, userRole) {
    if (!id) {
      throw new Error('id is required');
    }

    const story = await this.storyRepository.getStoryById(id);
    if (!story) {
      throw new Error('Story not found');
    }

    if (userRole !== 'admin' && story.userId !== userId) {
      throw new Error('Forbidden');
    }

    const updatePayload = { ...updates };

    if (updates.content !== undefined) {
      updatePayload.content = updates.content;
    } else if (Array.isArray(updates.sections)) {
      updatePayload.content = this.buildContentFromSections(updates.sections);
    }

    const updatedStory = await this.storyRepository.updateStory(id, updatePayload);

    if (this.vectorRepository && (updates.content || updates.sections)) {
      const sections = updates.sections || story.sections || [];
      this.indexStoryContent(id, {
        title: updates.title || story.title,
        genre: updates.genre || story.genre,
        templateId: updates.templateId || story.templateId,
        sections
      }).catch((err) => {
        console.error('Failed to re-index story content:', err.message);
      });
    }

    return updatedStory;
  }

  async deleteStory(id, userId, userRole) {
    if (!id) {
      throw new Error('id is required');
    }

    const story = await this.storyRepository.getStoryById(id);
    if (!story) {
      throw new Error('Story not found');
    }

    if (userRole !== 'admin' && story.userId !== userId) {
      throw new Error('Forbidden');
    }

    if (this.vectorRepository) {
      await this.vectorRepository.deleteStoryContext(id).catch((err) => {
        console.error('Failed to delete story context:', err.message);
      });
    }

    return this.storyRepository.deleteStory(id);
  }

  async getStoryById(id, userId, userRole) {
    if (!id) {
      throw new Error('id is required');
    }

    const story = await this.storyRepository.getStoryById(id);
    if (!story) {
      return null;
    }

    if (userRole !== 'admin' && story.userId !== userId) {
      throw new Error('Forbidden');
    }

    return story;
  }

  async listStories(userId, userRole) {
    if (userRole === 'admin') {
      return this.storyRepository.listStories();
    }

    return this.storyRepository.listStories({ userId });
  }

  async indexStoryContent(storyId, storyMetadata) {
    if (!this.vectorRepository || !storyMetadata) {
      return;
    }

    const { title, genre, templateId, sections } = storyMetadata;
    
    if (!Array.isArray(sections) || sections.length === 0) {
      return;
    }

    const indexPromises = sections.map(async (section) => {
      if (!section.content || section.content.trim().length === 0) {
        return;
      }

      const sectionId = `${storyId}__${section.beatKey || section.id}`;
      const sectionText = section.content.trim();

      const fullText = section.title 
        ? `${section.title}\n\n${sectionText}`
        : sectionText;

      return this.vectorRepository.addContext(sectionId, fullText, {
        storyId,
        storyTitle: title,
        genre: genre || 'unspecified',
        templateId: templateId || null,
        sectionId: section.id,
        beatKey: section.beatKey,
        sectionTitle: section.title,
        sectionGuidance: section.guidance || '',
        timestamp: new Date().toISOString()
      });
    });

    await Promise.allSettled(indexPromises);
  }

  buildContentFromSections(sections = []) {
    return sections
      .map((section) => `${section.title || 'Section'}\n${section.content || ''}`)
      .join('\n\n');
  }
}
