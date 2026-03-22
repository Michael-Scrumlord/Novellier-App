export class PromptBuilder {

    // Builds a structured prompt.
    // For generalizability, it accepts the current text, RAG context, feedback focus, and any custom prompt instructions.
    static build({ currentText, ragContext, feedbackFocus, customPrompt }) {
        const baseInstructions = `You are a professional story editor. Your task is to analyze the text and provide 3 specific, actionable improvements.
            CRITICAL RULES:
            - DO NOT rewrite the story. Only provide critique.
            - Keep each point strictly under 2 sentences.
            - Base your critique heavily on the requested focus area.`;

        const focusSection = `FOCUS AREA: ${this._formatFocus(feedbackFocus)}${customPrompt ? `\nADDITIONAL NOTES: ${customPrompt}` : ''}`;

        const hasContext = ragContext && ragContext.trim().length > 0 && !ragContext.includes('No previous context');

        return `${baseInstructions}
            ${hasContext ? `### PREVIOUS STORY CONTEXT\n${ragContext}\n` : ''}
            ### CURRENT DRAFT TO REVIEW
            ${currentText}

            ### ${focusSection}

            ### REQUIRED OUTPUT FORMAT
            Provide your response exactly like this:
            1. [First improvement regarding ${hasContext ? 'continuity or ' : ''}the focus area]
            2. [Second improvement]
            3. [Third improvement]`;
    }

    // Provides a mechanism to format the feedback focus into more detailed instructions for the AI, ensuring the critique is aligned with the user's intent.
    static _formatFocus(feedbackType) {
        switch ((feedbackType || '').toLowerCase()) {
        case 'emotion':
            return 'Emotional impact: highlight where feeling, stakes, or tone could deepen.';
        case 'believability':
            return 'Believability: flag implausible actions, world rules, or continuity breaks.';
        case 'logic':
        default:
            return 'Logical consistency: detect contradictions, timeline issues, and plot gaps.';
        }
    }
}