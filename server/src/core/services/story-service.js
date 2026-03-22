export class StoryService {
    constructor({ storyRepository, vectorRepository }) {
        if (!storyRepository) {
            throw new Error('StoryService requires storyRepository');
        }

        this.storyRepository = storyRepository;
        this.vectorRepository = vectorRepository;
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
        
        const story = await this.storyRepository.createStory({
            ...data,
            content: normalizedContent
        });

        this._triggerIndexing(story.id, data);
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

            const updatedStory = await this.storyRepository.updateStory(id, updatePayload);

            if (updates.content || updates.sections) {
                this._triggerIndexing(id, { ...story, ...updates });
            }

            return updatedStory;
    }

      async deleteStory(id, userId, userRole) {
          await this._getStoryAndVerifyAccess(id, userId, userRole);

          if (this.vectorRepository) {
              this.vectorRepository.deleteStoryContext(id).catch((err) => {
                  console.error('[RAG] Failed to delete story context:', err.message);
              });
          }

          return this.storyRepository.deleteStory(id);
      }

      async getStoryById(id, userId, userRole) {
          return this._getStoryAndVerifyAccess(id, userId, userRole, false);
      }

      async listStories(userId, userRole) {
          return this.storyRepository.listStories(userRole === 'admin' ? undefined : { userId });
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

    _triggerIndexing(storyId, metadata) {
        if (!this.vectorRepository || !metadata.sections?.length) return;

        this._indexStoryContent(storyId, metadata).catch((err) => {
            console.error('[RAG] Failed to index story content:', err.message);
        });
    }

    async _indexStoryContent(storyId, { title, genre, templateId, sections }) {
        const indexPromises = sections
              .filter(section => section.content && section.content.trim().length > 0)
              .map(section => {
                  const sectionId = `${storyId}__${section.beatKey || section.id}`;
                  const sectionText = section.content.trim();
                  const fullText = section.title ? `${section.title}\n\n${sectionText}` : sectionText;

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

    _buildContentFromSections(sections = []) {
        return sections
            .map((section) => `${section.title || 'Section'}\n${section.content || ''}`)
            .join('\n\n');
    }
}