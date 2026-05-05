import { createContext, useCallback, useContext, useState } from 'react';
import { FEEDBACK_KEY } from '../constants/storage.js';
import { FEEDBACK_OPTIONS } from '../constants/ai.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useSuggestionStream } from '../hooks/useSuggestionStream.js';
import { useAuthContext } from './AuthContext.jsx';
import { useStoryContext } from './StoryContext.jsx';
import { useEditorUIContext } from './EditorUIContext.jsx';

const AIContext = createContext(null);

export function AIProvider({ children }) {
    const { token } = useAuthContext();
    const { sections, activeStoryId, currentStory, syncStoryFromServer } = useStoryContext();
    const { activeSectionIndex } = useEditorUIContext();

    const [aiPrompt, setAiPrompt] = useState('');
    const [aiMode, setAiMode] = useState('copilot');
    const [feedbackType, setFeedbackType] = useLocalStorage(FEEDBACK_KEY, FEEDBACK_OPTIONS[0].value);

    const stream = useSuggestionStream({
        token, sections, activeStoryId, currentStory, activeSectionIndex, syncStoryFromServer,
    });

    const requestSuggestion = useCallback((onStatusMessage, promptOverride) =>
        stream.request({ feedbackType, aiMode, aiPrompt, promptOverride, onStatusMessage }),
        [stream, feedbackType, aiMode, aiPrompt]);

    const value = {
        aiResponse: stream.aiResponse,
        toolEvents: stream.toolEvents,
        isSuggesting: stream.isSuggesting,
        progress: stream.progress,
        aiPrompt, setAiPrompt,
        aiMode, setAiMode,
        feedbackType, setFeedbackType,
        requestSuggestion,
        stopSuggestion: stream.stop,
    };

    return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAIContext() {
    const ctx = useContext(AIContext);
    if (!ctx) throw new Error('useAIContext must be used within an AIProvider');
    return ctx;
}