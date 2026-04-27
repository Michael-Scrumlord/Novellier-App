import { useCallback, useRef, useState } from 'react';
import { aiService } from '../services/aiService.js';
import { storyService } from '../services/storyService.js';
import { buildSuggestionPayload, toPlainSections } from '../utils/aiSuggestionPayload.js';
import { upsertToolEvent } from '../utils/toolEventReducer.js';

export function useSuggestionStream({ token, sections, activeStoryId, currentStory, activeSectionIndex, syncStoryFromServer }) {
    const [aiResponse, setAiResponse] = useState('');
    const [toolEvents, setToolEvents] = useState([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [progress, setProgress] = useState(null);
    const abortRef = useRef(null);

    const stop = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setIsSuggesting(false);
    }, []);

    const request = useCallback(async ({ feedbackType, aiMode, aiPrompt, promptOverride, onStatusMessage }) => {
        if (!token) return;
        if (isSuggesting) {
            stop();
            onStatusMessage?.('Analysis stopped.');
            return;
        }

        setIsSuggesting(true);
        setAiResponse('');
        setToolEvents([]);
        setProgress(null);
        abortRef.current = new AbortController();

        const payload = buildSuggestionPayload({
            sections,
            plainSections: toPlainSections(sections),
            activeSectionIndex,
            activeStoryId,
            currentStory,
            feedbackType,
            aiMode,
            aiPrompt,
            promptOverride,
        });

        try {
            await aiService.streamSuggestion(token, payload, {
                onChunk: (chunk) => setAiResponse((prev) => prev + chunk),
                onEvent: (event) => setToolEvents((prev) => upsertToolEvent(prev, event)),
                onProgress: setProgress,
                signal: abortRef.current.signal,
            });
            onStatusMessage?.('Insight delivered.');
        } catch (error) {
            console.error('AI Stream Error:', error);
            setAiResponse((prev) => prev + '\n\n[Analysis stopped]');
            onStatusMessage?.('Analysis stopped.');
        } finally {
            abortRef.current = null;
            setIsSuggesting(false);
            if (aiMode === 'tools' && activeStoryId) {
                storyService.get(token, activeStoryId)
                    .then((response) => syncStoryFromServer(response?.story))
                    .catch((err) => console.error(err));
            }
        }
    }, [token, sections, activeSectionIndex, activeStoryId, currentStory, isSuggesting, stop, syncStoryFromServer]);

    return { aiResponse, toolEvents, isSuggesting, progress, request, stop };
}
