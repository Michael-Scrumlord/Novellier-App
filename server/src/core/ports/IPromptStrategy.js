// This is the port for domain-specific prompt construction.
// Implemented by NovelPromptStrategy, which builds prompts for story generation.
// Consumed by AISuggestionService.
export class IPromptStrategy {
    buildPrompt(inputs) {
        throw new Error('Not implemented');
    }
}
