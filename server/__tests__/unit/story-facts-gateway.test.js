import { describe, it, expect } from 'vitest';
import { AISuggestionService } from '../../src/core/services/ai-suggestion-service.js';
import { IStoryFactsGateway } from '../../src/core/ports/IStoryFactsGateway.js';

const fakeAiService = {
    generateCompletion: async () => 'response',
    generateStreamingCompletion: async () => 'stream',
    ensureModelAvailable: async () => ({ supportsTools: false }),
};

const fakeVectorRepo = {
    searchContext: async () => '',
};

class FakeFactsGateway extends IStoryFactsGateway {
    constructor(initialFacts = []) {
        super();
        this.facts = [...initialFacts];
        this.savedFacts = null;
    }
    async getFacts() { return this.facts; }
    async saveFacts(_storyId, facts) {
        this.savedFacts = facts;
        this.facts = facts;
    }
}

describe('IStoryFactsGateway port contract', () => {
    it('AISuggestionService accepts a gateway without needing a concrete StoryService', () => {
        const gateway = new FakeFactsGateway(['Alice is the hero']);
        const service = new AISuggestionService({
            aiService: fakeAiService,
            vectorRepository: fakeVectorRepo,
            storyFactsGateway: gateway,
        });
        expect(service.storyFactsPort).toBe(gateway);
    });

    it('AISuggestionService accepts no gateway and degrades gracefully', () => {
        const service = new AISuggestionService({
            aiService: fakeAiService,
            vectorRepository: fakeVectorRepo,
        });
        expect(service.storyFactsPort).toBeNull();
    });

    it('FakeFactsGateway satisfies the IStoryFactsGateway contract', async () => {
        const gateway = new FakeFactsGateway(['Fact one', 'Fact two']);
        const facts = await gateway.getFacts('story-1', { userId: 'u1', role: 'user' });
        expect(facts).toEqual(['Fact one', 'Fact two']);

        await gateway.saveFacts('story-1', ['Fact one', 'Fact two', 'Fact three'], { userId: 'u1', role: 'user' });
        expect(gateway.savedFacts).toHaveLength(3);
    });
});
