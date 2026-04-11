export class PromptBuilder {    
    static build({ currentText, ragContext, feedbackFocus, customPrompt, currentChapterSummary, currentBeatSummary, storySummary, storySummaryShort, storySummaryLong }) {
        const baseInstructions = [
            'You are an expert Developmental Editor for novels. Your task is to analyze the provided manuscript draft and deliver actionable, structural critique.',
            'CRITICAL RULES:',
            '- DO NOT rewrite, edit, or continue the story. Critique only.',
            '- Be concise. Avoid conversational filler (e.g., do not say "Here is your feedback").',
            '- Ground your critique strictly in the requested focus area.'
        ];

        // Format focus using the upgraded switch statement
        const focusInstructions = [
            `FOCUS AREA: ${this._formatFocus(feedbackFocus)}`
        ];
        
        if (customPrompt) {
            focusInstructions.push(`ADDITIONAL INSTRUCTIONS: ${customPrompt}`);
        }

        // Build the prompt sections dynamically
        const promptParts = [
            ...baseInstructions,
            '', // Blank line
            ...focusInstructions,
            ''
        ];

        const chapterMemory = this._truncateForPrompt((currentChapterSummary || '').trim(), 700);
        const beatMemory = this._truncateForPrompt((currentBeatSummary || '').trim(), 900);
        const storyMemory = this._truncateForPrompt((storySummary || storySummaryShort || '').trim(), 1300);
        const longMemory = this._truncateForPrompt((storySummaryLong || '').trim(), 2200);
        const hasContext = ragContext && ragContext.trim().length > 0 && !ragContext.includes('No previous context');

        if (chapterMemory) {
            promptParts.push(
                'This is just a chapter summary, not the word for word text.',
                '<current_chapter_summary>',
                chapterMemory,
                '</current_chapter_summary>',
                ''
            );
        }

        if (beatMemory) {
            promptParts.push(
                'This is just a beat summary, not the word for word text.',
                '<current_beat_summary>',
                beatMemory,
                '</current_beat_summary>',
                ''
            );
        }

        if (storyMemory) {
            promptParts.push(
                'This is just a story summary, not the word for word text.',
                '<story_summary>',
                storyMemory,
                '</story_summary>',
                ''
            );
        }

        if (longMemory && !hasContext && !storyMemory) {
            promptParts.push(
                'This is just a long story memory, not the word for word text.',
                '<story_memory_long>',
                longMemory,
                '</story_memory_long>',
                ''
            );
        }

        // Only inject Context if valid
        if (hasContext) {
            const compactContext = this._truncateForPrompt(ragContext.trim(), 900);
            promptParts.push(
                '<previous_context>',
                compactContext,
                '</previous_context>',
                ''
            );
        }

        // Inject the draft text inside strict XML boundaries
        const latestDraftChunks = this._getLatestChunks(currentText.trim(), 1600, 200, 2);
        const draftToReview = latestDraftChunks.join('\n\n---\n\n');

        promptParts.push(
            '<draft_to_review>',
            draftToReview,
            '</draft_to_review>',
            '',
            'REQUIRED OUTPUT FORMAT:',
            'Present your critique as a markdown list. For each issue:',
            '1. Quote the problematic text briefly.',
            '2. Explain the issue based on the FOCUS AREA.',
            '3. Suggest an approach to fix it.'
        );

        // Logging the prompt. Get rid of this thing later.
        console.log('--- PromptBuilder Debug ---', promptParts.join('\n'), '--- End of Prompt ---');

        // Compresses multiple new lines into a single one.
        // It helps the model by reducing the token count.
        return promptParts.join('\n')
    }

    static _truncateForPrompt(text, maxChars) {
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

    static _getLatestChunks(text, chunkSize = 1600, overlap = 200, maxChunks = 2) {
        if (!text) return [''];
        if (text.length <= chunkSize) return [text];

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
            if (chunk) chunks.push(chunk);

            if (end >= text.length) break;
            start = Math.max(end - overlap, start + 1);
        }

        return chunks.slice(-maxChunks);
    }

    static _formatFocus(feedbackType) {
        switch ((feedbackType || '').toLowerCase()) {
            case 'emotion':
                return 'Analyze emotional resonance. Flag areas where the narrative "tells" rather than "shows" feelings. Highlight missed opportunities to deepen internal monologues, stakes, or atmospheric tone.';
            case 'believability':
                return 'Evaluate authenticity. Flag character actions or dialogue that feel unmotivated or out-of-character. Identify implausible interactions, broken world rules, or unrealistic reactions.';
            case 'logic':
            default:
                return 'Scrutinize logical consistency. Detect and explicitly flag chronological errors, timeline discrepancies, plot holes, or contradictions with previously established facts (see <previous_context> if provided).';
        }
    }
}