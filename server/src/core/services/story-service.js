import { richTextToPlainText } from '../../utils/rich-text-to-plain-text.js';

export class StoryService {
    constructor({ storyRepository, vectorRepository, aiService, summaryConfig }) {
        if (!storyRepository) {
            throw new Error('StoryService requires storyRepository');
        }

        this.storyRepository = storyRepository;
        this.vectorRepository = vectorRepository;
        this.aiService = aiService;
        this.summaryConfig = {
            maxSourceChars: 9000,
            maxTokens: 480,
            model: undefined,
            ...summaryConfig
        };
    }


    async createStory(data) {
        const summaryModel = process.env.SUMMARY_MODEL || "gemma2:2b";
        const { title, content, sections } = data;
        if (!title) throw new Error('title is required');

        const hasContent = typeof content === 'string' && content.trim().length > 0;
        const hasSections = Array.isArray(sections) && sections.length > 0;

        if (!hasContent && !hasSections) {
            throw new Error('content or sections are required');
        }

        const normalizedContent = hasContent ? content : this._buildContentFromSections(sections);
        this.aiService.ensureModelAvailable(summaryModel);
        this.aiService.warmupModel(summaryModel);
        const summaries = await this._buildStorySummaries(title, sections);

        
        const story = await this.storyRepository.createStory({
            ...data,
            content: normalizedContent,
            ...summaries
        });

        this._triggerIndexing(story.id, data);
        return story;
    }

    async updateStory(id, updates, userId, userRole) {
        const story = await this._getStoryAndVerifyAccess(id, userId, userRole);
        const summaryModel = process.env.SUMMARY_MODEL || "gemma2:2b";

        const updatePayload = { ...updates };
        
            if (updates.content !== undefined) {
                updatePayload.content = updates.content;
            } else if (Array.isArray(updates.sections)) {
                updatePayload.content = this._buildContentFromSections(updates.sections);
            }

            this.aiService.ensureModelAvailable(summaryModel);
            this.aiService.warmupModel(summaryModel);

            if (Array.isArray(updates.sections)) {
                const summaries = await this._buildStorySummaries(
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
        if (this.vectorRepository?.deleteStoryContext) {
            await this.vectorRepository.deleteStoryContext(storyId);
        }

        const indexPromises = sections
              .map((section) => ({
                  ...section,
                  plainContent: richTextToPlainText(section.content)
              }))
              .filter(section => section.plainContent && section.plainContent.length > 0)
              .flatMap(section => {
                  const sectionKey = section.beatKey || section.id || 'section';
                  const sectionText = section.plainContent;
                  const chunks = this._chunkText(sectionText, 1600, 200);

                  return chunks.map((chunkText, chunkIndex) => {
                      const sectionId = `${storyId}__${sectionKey}__c${chunkIndex}`;
                      const fullText = section.title ? `${section.title}\n\n${chunkText}` : chunkText;

                      return this.vectorRepository.addContext(sectionId, fullText, {
                          storyId,
                          storyTitle: title,
                          genre: genre || 'unspecified',
                          templateId: templateId || null,
                          sectionId: section.id,
                          beatKey: section.beatKey,
                          sectionTitle: section.title,
                          sectionGuidance: section.guidance || '',
                          chunkIndex,
                          chunkCount: chunks.length,
                          timestamp: new Date().toISOString()
                      });
                  });
              });

        await Promise.allSettled(indexPromises);
    }

    _chunkText(text, chunkSize = 1600, overlap = 200) {
        if (!text || text.length <= chunkSize) {
            return [text || ''];
        }

        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = Math.min(start + chunkSize, text.length);

            if (end < text.length) {
                const boundary = Math.max(
                    text.lastIndexOf('\n', end),
                    text.lastIndexOf('. ', end),
                    text.lastIndexOf(' ', end)
                );
                if (boundary > start + Math.floor(chunkSize * 0.6)) {
                    end = boundary;
                }
            }

            const chunk = text.slice(start, end).trim();
            if (chunk) {
                chunks.push(chunk);
            }

            if (end >= text.length) {
                break;
            }

            start = Math.max(end - overlap, start + 1);
        }

        return chunks;
    }

    _buildContentFromSections(sections = []) {
        return sections
            .map((section) => `${section.title || 'Section'}\n${section.content || ''}`)
            .join('\n\n');
    }

    async _buildStorySummaries(title, sections = []) {
        const normalizedSections = sections
            .map((section) => {
                const plainContent = richTextToPlainText(section.content);
                if (!plainContent) return null;
                return {
                    id: section.id,
                    beatKey: section.beatKey,
                    title: section.title || 'Section',
                    content: plainContent
                };
            })
            .filter(Boolean);

        if (!normalizedSections.length) {
            return {
                chapterSummaries: [],
                beatSummaries: [],
                storySummary: '',
                storySummaryShort: '',
                storySummaryLong: ''
            };
        }

        const chapterSummaries = [];
        for (const section of normalizedSections) {
            const chapterSource = this._buildSummarySource(section.content);
            const chapterSummary = await this._summarizeText(
                [
                    'Summarize this chapter for continuity memory in 3-5 short sentences.',
                    'Focus on the key events, character changes, and unresolved threads.',
                    'Do not quote the source text or restate its opening words.',
                    '',
                    '<chapter>',
                    chapterSource,
                    '</chapter>'
                ].join('\n'),
                700,
                { maxTokens: 220 }
            );

            chapterSummaries.push({
                sectionId: section.id || null,
                beatKey: section.beatKey || null,
                chapterTitle: section.title,
                summary: chapterSummary || this._buildSimpleSummary(chapterSource, 3, 700)
            });
        }

        const beatGroups = new Map();
        for (const chapter of chapterSummaries) {
            const key = chapter.beatKey || 'unknown';
            if (!beatGroups.has(key)) {
                beatGroups.set(key, []);
            }
            beatGroups.get(key).push(chapter);
        }

        const beatSummaries = [];
        for (const [beatKey, chapters] of beatGroups.entries()) {
            const beatTitle = this._deriveBeatTitle(chapters[0]?.chapterTitle);
            const beatSource = chapters
                .map((chapter) => `${chapter.chapterTitle}: ${chapter.summary}`)
                .join('\n');

            const beatSummary = await this._summarizeText(
                [
                    'Summarize this beat from chapter summaries in 3-5 short sentences.',
                    'Focus on the beat-level progression across the chapters and the current narrative state.',
                    'Do not quote the chapter summaries verbatim.',
                    '',
                    '<beat>',
                    beatSource,
                    '</beat>'
                ].join('\n'),
                900,
                { maxTokens: 260 }
            );

            beatSummaries.push({
                beatKey,
                beatTitle,
                summary: beatSummary || this._buildSimpleSummary(beatSource, 4, 900)
            });
        }

        const storySource = beatSummaries.map((beat) => `${beat.beatTitle}: ${beat.summary}`).join('\n');
        const storySummary = await this._summarizeText(
            [
                'Summarize the entire story from the beat summaries in 4-6 short sentences.',
                'Focus on the main arc, the current situation, and unresolved conflicts.',
                'Do not quote the beat summaries or start with their opening wording.',
                '',
                '<story>',
                storySource,
                '</story>'
            ].join('\n'),
            1200,
            { maxTokens: 320 }
        );

        return {
            chapterSummaries,
            beatSummaries,
            storySummary,
            storySummaryShort: storySummary,
            storySummaryLong: storySummary
        };
    }

    async _summarizeText(sourceText, fallbackChars = 900, options = {}) {
        const normalizedSource = this._truncateAtBoundary(sourceText || '', this.summaryConfig.maxSourceChars);
        if (!normalizedSource) return '';

        if (!this.aiService || typeof this.aiService.generateCompletion !== 'function') {
            return this._truncateAtBoundary(normalizedSource, fallbackChars);
        }

        const prompt = [
            'Return only one XML block and nothing else:',
            '<summary>...</summary>',
            'Write a concise factual summary. Do not copy large spans verbatim.',
            '',
            '<source_text>',
            normalizedSource,
            '</source_text>'
        ].join('\n');

        try {
            const raw = await this.aiService.generateCompletion(prompt, {
                model: this.summaryConfig.model,
                maxTokens: options.maxTokens || this.summaryConfig.maxTokens,
                temperature: 0.2
            });

            const match = (raw || '').match(/<summary>\s*([\s\S]*?)\s*<\/summary>/i);
            const parsed = (match?.[1] || String(raw || '')).trim();
            return this._truncateAtBoundary(parsed, fallbackChars);
        } catch (error) {
            console.warn('[StoryService] Summary generation failed, using fallback summary:', error.message);
            return this._truncateAtBoundary(normalizedSource, fallbackChars);
        }
    }

    _buildSummarySource(text, maxChars = 2600) {
        const normalized = this._truncateAtBoundary(text || '', maxChars);
        if (!normalized) return '';

        const paragraphs = normalized
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean);

        if (paragraphs.length <= 3) {
            return normalized;
        }

        const midIndex = Math.floor(paragraphs.length / 2);
        const selected = [paragraphs[0], paragraphs[midIndex], paragraphs[paragraphs.length - 1]]
            .filter(Boolean)
            .join('\n\n');

        return this._truncateAtBoundary(selected, maxChars);
    }

    _buildSimpleSummary(text, maxSentences = 3, fallbackChars = 900) {
        const normalized = this._truncateAtBoundary(text || '', this.summaryConfig.maxSourceChars);
        if (!normalized) return '';

        const sentences = normalized
            .split(/(?<=[.!?])\s+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);

        if (sentences.length > 0) {
            return this._truncateAtBoundary(sentences.slice(0, maxSentences).join(' '), fallbackChars);
        }

        return this._truncateAtBoundary(normalized, fallbackChars);
    }

    _deriveBeatTitle(chapterTitle = '') {
        if (!chapterTitle) return 'Beat';
        return chapterTitle.replace(/\s*-\s*Chapter\s+\d+\s*$/i, '').trim() || chapterTitle;
    }

    _buildExtractiveSummaries(title, normalizedSections = []) {
        if (!normalizedSections.length) {
            return {
                storySummaryShort: '',
                storySummaryLong: ''
            };
        }

        const longSummary = this._truncateAtBoundary(
            normalizedSections
                .map((section) => `${section.title}: ${section.content}`)
                .join('\n\n'),
            4000
        );

        const shortCandidates = normalizedSections
            .slice(0, 6)
            .map((section) => `${section.title}: ${section.content}`)
            .join(' ');

        const shortSummary = this._truncateAtBoundary(shortCandidates, 900);

        return {
            storySummaryShort: title ? `${title}. ${shortSummary}`.trim() : shortSummary,
            storySummaryLong: longSummary
        };
    }

    _parseAiSummary(rawSummary) {
        const text = (rawSummary || '').trim();
        if (!text) {
            return {
                storySummaryShort: '',
                storySummaryLong: ''
            };
        }

        const xmlShortMatch = text.match(/<short_summary>\s*([\s\S]*?)\s*<\/short_summary>/i);
        const xmlLongMatch = text.match(/<long_summary>\s*([\s\S]*?)\s*<\/long_summary>/i);

        if (xmlShortMatch || xmlLongMatch) {
            return {
                storySummaryShort: this._truncateAtBoundary((xmlShortMatch?.[1] || '').trim(), 900),
                storySummaryLong: this._truncateAtBoundary((xmlLongMatch?.[1] || '').trim(), 2200)
            };
        }

        const shortMatch = text.match(/SHORT\s*:\s*([\s\S]*?)(?:\n\s*LONG\s*:|$)/i);
        const longMatch = text.match(/LONG\s*:\s*([\s\S]*)$/i);

        if (shortMatch || longMatch) {
            return {
                storySummaryShort: this._truncateAtBoundary((shortMatch?.[1] || '').trim(), 900),
                storySummaryLong: this._truncateAtBoundary((longMatch?.[1] || '').trim(), 2200)
            };
        }

        // If the model returns untagged but useful summary text, keep it instead of falling back
        // to extractive story truncation.
        const normalized = text.replace(/\s+/g, ' ').trim();
        const shortCandidate = this._truncateAtBoundary(normalized, 900);
        const longCandidate = this._truncateAtBoundary(text, 2200);

        return {
            storySummaryShort: shortCandidate,
            storySummaryLong: longCandidate
        };
    }

    _truncateAtBoundary(text, maxChars) {
        if (!text || text.length <= maxChars) return text || '';

        const sliced = text.slice(0, maxChars);
        const lastBoundary = Math.max(
            sliced.lastIndexOf('. '),
            sliced.lastIndexOf('\n'),
            sliced.lastIndexOf(' ')
        );

        if (lastBoundary <= 0) return `${sliced.trim()}...`;
        return `${sliced.slice(0, lastBoundary).trim()}...`;
    }
}