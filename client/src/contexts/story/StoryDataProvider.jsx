/*

    StoryContext.jsx was absolutely massive so I'm decomposing the functionality related to story data management into a separate StoryDataProvider. 
    This file will be used for database operations and document text.
    
*/

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api.js';
import { useAuthContext } from './AuthContext.jsx';
import { DEFAULT_SECTION } from '../lib/storyTemplates.js';
import { buildTitleHtml, buildChapterHeadingHtml } from '../utils/storyContentUtils.js';

const StoryDataContext = createContext(null);

const getDefaultSections = () => [{
    id: DEFAULT_SECTION.key, beatKey: DEFAULT_SECTION.key, title: DEFAULT_SECTION.label, guidance: DEFAULT_SECTION.guidance, content: ''
}];

export function StoryDataProvider({ children }) {
    const { token, clearTokenOnFailure } = useAuthContext();

    const [stories, setStories] = useState([]);
    const [currentStory, setCurrentStory] = useState(null);
    const [sections, setSections] = useState(getDefaultSections());
    
    const [title, setTitle] = useState('');
    const [storyGenre, setStoryGenre] = useState(null);
    const [storyTemplateId, setStoryTemplateId] = useState(null);
    const [storyTitleHtml, setStoryTitleHtml] = useState('');
    const [chapterHeadingHtml, setChapterHeadingHtml] = useState(buildChapterHeadingHtml());
    
    const [isSaving, setIsSaving] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);

    const value = useMemo(() => ({
        stories, setStories,
        currentStory, setCurrentStory,
        sections, setSections,
        title, setTitle,
        storyGenre, setStoryGenre,
        storyTemplateId, setStoryTemplateId,
        storyTitleHtml, setStoryTitleHtml,
        chapterHeadingHtml, setChapterHeadingHtml,
        isSaving, setIsSaving,
        isIndexing, setIsIndexing,
        token, clearTokenOnFailure,
        getDefaultSections
    }), [stories, currentStory, sections, title, storyGenre, storyTemplateId, storyTitleHtml, chapterHeadingHtml, isSaving, isIndexing, token, clearTokenOnFailure]);

    return <StoryDataContext.Provider value={value}>{children}</StoryDataContext.Provider>;
}

export const useStoryData = () => useContext(StoryDataContext);