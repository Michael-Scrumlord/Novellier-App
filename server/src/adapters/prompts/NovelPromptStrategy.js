import { truncateAtBoundary, chunkText } from '../../core/domain/TextUtils.js';
import { IPromptStrategy } from '../../core/ports/IPromptStrategy.js';

const FOCUS_LOGIC = 'Scrutinize logical consistency. Detect and explicitly flag chronological errors, timeline discrepancies, plot holes, or contradictions with previously established facts (see <previous_context> if provided).';
const FOCUS_EMOTION = 'Analyze emotional resonance. Flag areas where the narrative "tells" rather than "shows" feelings. Highlight missed opportunities to deepen internal monologues, stakes, or atmospheric tone.';
const FOCUS_BELIEVABILITY = 'Evaluate authenticity. Flag character actions or dialogue that feel unmotivated or out-of-character. Identify implausible interactions, broken world rules, or unrealistic reactions.';

export class NovelPromptStrategy extends IPromptStrategy {
    buildPrompt(inputs) {
        return inputs.mode === 'tools'
            ? this._buildToolsPrompt(inputs)
            : this._buildCritiquePrompt(inputs);
    }

    _buildToolsPrompt({ storyFacts, customPrompt }) {
        const parts = [
            'You are an agentic AI operating directly within a system backend. Your purpose is to manage a living continuity database.',
            'You have been equipped with system tools to modify this database. Use them when requested to add or remove facts.',
            'If asked to list, check, or summarize facts, simply answer the user in natural language using the ESTABLISHED CONTINUITY FACTS provided below.',
            'CRITICAL RULES:',
            '- You must invoke the integrated function-calling mechanism natively when using tools.',
            '- UNDER NO CIRCUMSTANCES should you output a JSON or list of tools when answering a question. NEVER invent or hallucinate new facts if you were not explicitly instructed to add them.',
            '- DO NOT critique the user or the story draft.',
            '- DO NOT rewrite the story.',
            '',
        ];

        if (customPrompt) {
            parts.push(`Consider the following user request FIRST when responding: ${customPrompt}`, '');
        }

        if (Array.isArray(storyFacts) && storyFacts.length > 0) {
            parts.push(
                '=== ESTABLISHED CONTINUITY FACTS ===',
                'You must strictly adhere to the objective facts listed below, as they form the fundamental truth of the universe:',
                ...storyFacts.map((fact) => `- ${fact}`),
                ''
            );
        }

        return parts.join('\n');
    }

    _buildCritiquePrompt({ currentText, ragContext, feedbackFocus, customPrompt, contextSummaries = {}, storyFacts }) {
        const { local: currentChapterSummary, mid: currentBeatSummary, global: storySummary } = contextSummaries;

        const parts = [
            'You are an expert Developmental Editor for novels. Your task is to analyze the provided manuscript draft and deliver actionable, structural critique.',
            'CRITICAL RULES:',
            '- DO NOT rewrite, edit, or continue the story. Critique only.',
            '- Be concise. Avoid conversational filler (e.g., do not say "Here is your feedback").',
            '- Ground your critique strictly in the requested focus area.',
            '',
            `FOCUS AREA: ${this._formatFocus(feedbackFocus)}`,
        ];

        if (customPrompt) {
            parts.push(`Consider the following user request FIRST when responding: ${customPrompt}`);
        }
        parts.push('');

        if (Array.isArray(storyFacts) && storyFacts.length > 0) {
            parts.push(
                '=== ESTABLISHED CONTINUITY FACTS ===',
                'You must strictly adhere to the objective facts listed below, as they form the fundamental truth of the universe:',
                ...storyFacts.map((fact) => `- ${fact}`),
                ''
            );
        }

        const chapterMemory = truncateAtBoundary((currentChapterSummary || '').trim(), 700);
        const beatMemory = truncateAtBoundary((currentBeatSummary || '').trim(), 900);
        const storyMemory = truncateAtBoundary((storySummary || '').trim(), 1300);

        if (chapterMemory) {
            parts.push(
                'This is just a chapter summary, not the word for word text.',
                '<current_chapter_summary>',
                chapterMemory,
                '</current_chapter_summary>',
                ''
            );
        }

        if (beatMemory) {
            parts.push(
                'This is just a beat summary, not the word for word text.',
                '<current_beat_summary>',
                beatMemory,
                '</current_beat_summary>',
                ''
            );
        }

        if (storyMemory) {
            parts.push(
                'This is just a story summary, not the word for word text.',
                '<story_summary>',
                storyMemory,
                '</story_summary>',
                ''
            );
        }

        if (ragContext?.trim()) {
            const compactContext = truncateAtBoundary(ragContext.trim(), 900);
            parts.push('<previous_context>', compactContext, '</previous_context>', '');
        }

        const draftToReview = chunkText(currentText.trim(), 1600, 200).slice(-2).join('\n\n---\n\n');
        parts.push(
            '<draft_to_review>',
            draftToReview,
            '</draft_to_review>',
            ''
        );

        parts.push(
            'REQUIRED OUTPUT FORMAT:',
            'Present your critique as a markdown list. For each issue:',
            '1. Quote the problematic text briefly.',
            '2. Explain the issue based on the FOCUS AREA.',
            '3. Suggest an approach to fix it.'
        );

        return parts.join('\n');
    }

    _formatFocus(feedbackType) {
        switch ((feedbackType || '').toLowerCase()) {
            case 'emotion': return FOCUS_EMOTION;
            case 'believability': return FOCUS_BELIEVABILITY;
            default: return FOCUS_LOGIC;
        }
    }
}
