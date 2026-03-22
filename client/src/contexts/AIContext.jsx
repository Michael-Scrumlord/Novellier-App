import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { FEEDBACK_KEY } from '../constants/storage.js';
import { FEEDBACK_OPTIONS } from '../constants/models.js';
import { htmlToPlainText } from '../utils/textUtils.js';
import { useAuthContext } from './AuthContext.jsx';
import { useModelContext } from './ModelContext.jsx';
import { useStoryContext } from './StoryContext.jsx';
import { getActiveSectionIndex } from '../utils/storyContentUtils.js';

const AIContext = createContext(null);

export function AIProvider({ children }) {
    const { token } = useAuthContext();
    const { selectedModel } = useModelContext();
    const { sections, selectedBeatIndex, selectedChapterIndex, activeStoryId } = useStoryContext();

    const [aiResponse, setAiResponse] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    
    // FYI: Lazy Initialization - this only reads localStorage on the first render
    const [feedbackType, setFeedbackType] = useState(() => 
        localStorage.getItem(FEEDBACK_KEY) || FEEDBACK_OPTIONS[0].value
    );

    const abortControllerRef = useRef(null);

    // Handlers
    const setFeedbackTypeAndPersist = useCallback((value) => {
        setFeedbackType(value);
        localStorage.setItem(FEEDBACK_KEY, value);
    }, []);

    const stopSuggestion = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsSuggesting(false);
    }, []);

    const requestSuggestion = useCallback(async (onStatusMessage) => {
        if (!token) return;
        // Toggle off
        if (isSuggesting) {
            stopSuggestion();
            onStatusMessage?.('Analysis stopped.');
            return;
        }

        setIsSuggesting(true);
        setAiResponse('');
        abortControllerRef.current = new AbortController();

        const plainSections = sections.map((s) => ({
            beatKey: s.beatKey,
            title: s.title,
            content: htmlToPlainText(s.content || '')
        }));
        
        const activeSectionIdx = getActiveSectionIndex(sections, selectedBeatIndex, selectedChapterIndex);

        try {
            await api.getSuggestionStream(
                token,
                {
                    storyId: activeStoryId,
                    model: selectedModel,
                    feedbackType,
                    customPrompt: aiPrompt,
                    activeSectionIndex: activeSectionIdx,
                    storyText: plainSections[activeSectionIdx]?.content || '',
                    sections: plainSections,
                },
                (chunk) => setAiResponse((prev) => prev + chunk),
                abortControllerRef.current.signal
            );
            onStatusMessage?.('Insight delivered.');
        } catch (error) {
          if (error.name === 'AbortError') {
              setAiResponse((prev) => prev + '\n\n[Analysis stopped]');
              onStatusMessage?.('Analysis stopped.');
          } else {
              console.error('AI Stream Error:', error);
              setAiResponse('Unable to reach AI right now.');
          }
        } finally {
            abortControllerRef.current = null;
            setIsSuggesting(false);
        }
    }, [
        token, sections, selectedBeatIndex, selectedChapterIndex, activeStoryId,
        selectedModel, feedbackType, aiPrompt, isSuggesting, stopSuggestion
    ]);

    return (
        <AIContext.Provider value={{
            // State
            aiResponse,
            isSuggesting,
            aiPrompt,
            feedbackType,
            feedbackOptions: FEEDBACK_OPTIONS,
            
            // Actions
            setAiPrompt,
            setFeedbackType: setFeedbackTypeAndPersist,
            requestSuggestion,
            stopSuggestion
        }}>
            {children}
        </AIContext.Provider>
    );
}

export function useAIContext() {
    const ctx = useContext(AIContext);
    if (!ctx) throw new Error('useAIContext must be used within an AIProvider');
    return ctx;
}