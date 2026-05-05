// YouTrack demo — prompt strategy for the YouTrack advisor integration.
import { IPromptStrategy } from '../../core/ports/IPromptStrategy.js';
import { truncateAtBoundary } from '../../core/domain/TextUtils.js';

export class YouTrackPromptStrategy extends IPromptStrategy {
    buildPrompt({
        currentText,
        ragContext,
        customPrompt,
        contextSummaries = {},
        storyFacts,
        mode,
    }) {
        const { local: completedStory, mid: epicSummary, global: projectSummary } = contextSummaries;

        const toolsBaseInstructions = [
            'You are an agentic AI operating within a project management system. Your purpose is to manage a living requirements database.',
            'You have been equipped with system tools to modify this database. Use them when requested to add or remove requirements.',
            'If asked to list, check, or summarize requirements, simply answer the user in natural language using the ESTABLISHED REQUIREMENTS provided below.',
            'CRITICAL RULES:',
            '- You must invoke the integrated function-calling mechanism natively when using tools.',
            '- UNDER NO CIRCUMSTANCES should you output a JSON or list of tools when answering a question.',
            '- NEVER invent requirements that were not explicitly derived from the provided User Stories or Epics.',
            '- DO NOT critique the user\'s project decisions.',
        ];

        const baseInstructions = mode === 'tools'
            ? toolsBaseInstructions
            : [
                'You are an expert Agile Project Advisor embedded in an active development workspace.',
                'Your task is to review the most recently completed User Story and suggest clear, actionable next steps for the upcoming story.',
                'CRITICAL RULES:',
                '- Lead your response with: "Since you just completed [story title], ..."',
                '- Be direct and specific. Avoid conversational filler.',
                '- Ground all suggestions in the project context and requirements provided.',
                '- Do not speculate beyond what the provided context supports.',
            ];

        const promptParts = [...baseInstructions, ''];

        if (Array.isArray(storyFacts) && storyFacts.length > 0) {
            promptParts.push(
                '=== ESTABLISHED REQUIREMENTS ===',
                'The following functional and non-functional requirements are derived facts of this project:',
                ...storyFacts.map(req => `- ${req}`),
                ''
            );
        }

        const projectMemory = truncateAtBoundary((projectSummary || '').trim(), 800);
        const epicMemory = truncateAtBoundary((epicSummary || '').trim(), 600);
        const completedMemory = truncateAtBoundary((completedStory || '').trim(), 700);

        if (projectMemory) {
            promptParts.push('<project_summary>', projectMemory, '</project_summary>', '');
        }
        if (epicMemory) {
            promptParts.push('<current_epic>', epicMemory, '</current_epic>', '');
        }
        if (completedMemory) {
            promptParts.push('<completed_user_story>', completedMemory, '</completed_user_story>', '');
        }

        if (mode !== 'tools') {
            if (ragContext?.trim()) {
                const compactContext = truncateAtBoundary(ragContext.trim(), 600);
                promptParts.push('<related_context>', compactContext, '</related_context>', '');
            }

            const upcomingStory = truncateAtBoundary((currentText || '').trim(), 900);
            if (upcomingStory) {
                promptParts.push('<upcoming_user_story>', upcomingStory, '</upcoming_user_story>', '');
            }

            if (customPrompt) {
                promptParts.push(`Consider the following user request: ${customPrompt}`, '');
            }

            promptParts.push(
                'REQUIRED OUTPUT FORMAT:',
                'Begin with: "Since you just completed [completed story title], ..."',
                'Follow with 2-3 sentences on what the upcoming story entails and what needs to happen first.',
                'Close with a "Tips:" section containing 3-5 concrete, actionable bullet points.',
                'Invite the user to ask follow-up questions at the end.'
            );
        } else if (customPrompt) {
            promptParts.push(`Consider the following user request: ${customPrompt}`, '');
        }

        return promptParts.join('\n');
    }
}