import { PromptBuilder } from '../../core/domain/PromptBuilder.js';

export class AISuggestionService {
  constructor({ aiService, vectorRepository, logger, config }) {
    if (!aiService || !vectorRepository) {
      throw new Error('AISuggestionService requires aiService and vectorRepository');
    }
    this.aiService = aiService;
    this.vectorRepository = vectorRepository;
    this.logger = logger || console;
    this.config = config || { maxActiveChars: 1200, maxTokens: 150 };
  }

  async getSuggestion(storyText, options = {}) {
    if (typeof storyText !== 'string' || storyText.trim().length === 0) {
      throw new Error('storyText is required');
    }

    const clippedStory = this.clipText(storyText, this.config.maxActiveChars);
    let relevantContext = '';

    // Fetch external data (Vector Port)
    if (options.storyId) {
      try {
        relevantContext = await this.vectorRepository.searchContext(clippedStory, {
          storyId: options.storyId,
          limit: null
        });
      } catch (error) {
        this.logger.warn(`[RAG] Context search failed: ${error.message}`);
      }
    }

    // Execute Domain Logic (Prompt Builder)
    const prompt = PromptBuilder.build({
      currentText: clippedStory,
      ragContext: relevantContext,
      feedbackFocus: options.feedbackType,
      customPrompt: options.customPrompt
    });

    // Send to external system (AI Port)
    const aiOptions = { 
      maxTokens: options.maxTokens || this.config.maxTokens, 
      model: options.model, 
      abortSignal: options.abortSignal 
    };

    if (options.onChunk && typeof this.aiService.generateStreamingCompletion === 'function') {
      return this.aiService.generateStreamingCompletion(prompt, aiOptions, options.onChunk);
    } 
    
    return this.aiService.generateCompletion(prompt, aiOptions);
  }

  clipText(text, maxChars) {
    if (!text || text.length <= maxChars) return text;
    
    const sliced = text.slice(0, maxChars);
    const lastSpaceIndex = sliced.lastIndexOf(' ');
    const safeSlice = lastSpaceIndex > 0 ? sliced.slice(0, lastSpaceIndex) : sliced;
    
    return `${safeSlice.trim()}...`;
  }
}