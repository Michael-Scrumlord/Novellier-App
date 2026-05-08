import { createContext, useCallback, useContext, useMemo } from 'react';
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

    const storyTitleHtml = useMemo(
        () => currentStory?.titleHtml || buildTitleHtml(currentStory?.title || ''),
        [currentStory]
    );
    const chapterHeadingHtml = useMemo(
        () => currentStory?.chapterHeadingHtml || buildChapterHeadingHtml(),
        [currentStory]
    );

    const patchStory = useCallback((patch) => {
        setCurrentStory((prev) => (prev ? { ...prev, ...patch } : prev));
    }, [setCurrentStory]);

    const setTitle = useCallback((t) => patchStory({ title: t }), [patchStory]);
    const setStoryTitleHtml = useCallback((html) => patchStory({ titleHtml: html }), [patchStory]);
    const setChapterHeadingHtml = useCallback((html) => patchStory({ chapterHeadingHtml: html }), [patchStory]);

    const value = useMemo(() => ({
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
        setTitle,
        setStoryTitleHtml,
        setChapterHeadingHtml,
    }), [
        crud.stories, crud.storiesLoaded, crud.currentStory, crud.isSaving, crud.activeStoryId,
        crud.setCurrentStory, crud.loadStories, crud.selectStory, crud.saveStory, crud.deleteStory,
        crud.createFromTemplate, crud.updateStorySettings, crud.updateStoryFacts, crud.syncStoryFromServer,
        story.sections, story.setSections, story.addChapter, story.addBeat, story.deleteChapter,
        story.setSectionContentAtIndex, story.renameBeat, story.renameChapter,
        storyTitleHtml, chapterHeadingHtml, setTitle, setStoryTitleHtml, setChapterHeadingHtml,
    ]);

    return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStoryContext() {
    const ctx = useContext(StoryContext);
    if (!ctx) throw new Error('useStoryContext must be used within StoryProvider');
    return ctx;
}