// This is the port for domain-specific prompt construction.
// Implemented by NovelPromptStrategy and YouTrackPromptStrategy, which build prompts for their respective domains (story generation and project management advice).
// Consumed by AISuggestionService
export class IPromptStrategy {
    buildPrompt(inputs) {
        throw new Error('Not implemented');
    }
}
