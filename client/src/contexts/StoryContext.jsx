import { createContext, useCallback, useContext } from 'react';
import { buildTitleHtml, buildChapterHeadingHtml } from '../utils/storyContentUtils.js';
import { useStoryReducer } from '../hooks/useStoryReducer.js';
import { useStoryCrud } from '../hooks/useStoryCrud.js';
import { useAuthContext } from './AuthContext.jsx';

const StoryContext = createContext(null);

export function StoryProvider({ children }) {
    const { token, clearTokenOnFailure } = useAuthContext();
    const story = useStoryReducer();
    const crud = useStoryCrud({
        token,
        clearTokenOnFailure,
        sections: story.sections,
        setSections: story.setSections,
        resetSections: story.resetSections,
    });

    const { currentStory, setCurrentStory } = crud;
    const storyTitleHtml = currentStory?.titleHtml || buildTitleHtml(currentStory?.title || '');
    const chapterHeadingHtml = currentStory?.chapterHeadingHtml || buildChapterHeadingHtml();

    const patchStory = useCallback((patch) => {
        setCurrentStory((prev) => (prev ? { ...prev, ...patch } : prev));
    }, [setCurrentStory]);

    const value = {
        ...crud,
        sections: story.sections,
        setSections: story.setSections,
        addChapter: story.addChapter,
        addBeat: story.addBeat,
        deleteChapter: story.deleteChapter,
        setSectionContentAtIndex: story.setSectionContentAtIndex,
        renameBeat: story.renameBeat,
        renameChapter: story.renameChapter,

        storyTitleHtml,
        chapterHeadingHtml,
        setTitle: (t) => patchStory({ title: t }),
        setStoryTitleHtml: (html) => patchStory({ titleHtml: html }),
        setChapterHeadingHtml: (html) => patchStory({ chapterHeadingHtml: html }),
    };

    return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStoryContext() {
    const ctx = useContext(StoryContext);
    if (!ctx) throw new Error('useStoryContext must be used within StoryProvider');
    return ctx;
}