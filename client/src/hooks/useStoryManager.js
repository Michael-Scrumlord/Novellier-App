import { useState, useCallback, useMemo } from 'react';
import { api } from '../lib/api.js';
import { DEFAULT_SECTION, STORY_TEMPLATES } from '../lib/storyTemplates.js';
import { EXAMPLE_WORDS_PER_PAGE } from '../constants/models.js';
import {
    buildTitleHtml,
    buildChapterHeadingHtml,
    buildStoryContent,
    getActiveSectionIndex,
    buildHorrorChapterContent
} from '../utils/storyContentUtils.js';

const defaultSections = () => [{ 
    ...DEFAULT_SECTION, 
    id: `part-${Date.now()}-ch-1`,
    beatKey: `part-${Date.now()}`,
    title: 'Part 1 - Chapter 1',
    content: '' 
}];
export function useStoryManager(token, navigate) {
    const [stories, setStories] = useState([]);
    const [currentStory, setCurrentStory] = useState(null);
    const [sections, setSections] = useState(defaultSections());
    
    const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
    const [editingMode, setEditingMode] = useState('chapter'); 
    
    const [isSaving, setIsSaving] = useState(false);
    const [isIndexing, setIsIndexing] = useState(false);

    const activeStoryId = currentStory?.id ?? null;
    const title = currentStory?.title || '';
    const storyTitleHtml = currentStory?.titleHtml || buildTitleHtml(title);
    const chapterHeadingHtml = currentStory?.chapterHeadingHtml || buildChapterHeadingHtml();

    const getGroupedBeats = useCallback((sectionsList) => {
        const beatGroups = {};
        sectionsList.forEach((section, index) => {
            if (!beatGroups[section.beatKey]) {               
                const safeTitle = section.title || 'Untitled Chapter';
                
                const beatTitle = safeTitle.replace(/\s*-\s*Chapter\s+\d+\s*$/i, '');
                
                beatGroups[section.beatKey] = {
                    beatKey: section.beatKey,
                    title: beatTitle,
                    guidance: section.guidance || '',
                    chapters: []
                };
            }
            beatGroups[section.beatKey].chapters.push({
                index,
                chapterIdx: beatGroups[section.beatKey].chapters.length,
                content: section.content || '',
                id: section.id || `temp-id-${index}`
            });
        });
        return Object.values(beatGroups);
    }, []);

const addChapter = useCallback((beatIndex) => {
    setSections(prev => {
        const beats = getGroupedBeats(prev);
        const targetBeat = beats[beatIndex];
        if (!targetBeat) return prev;
        
        const newChapterNum = targetBeat.chapters.length + 1;
        const newChapter = {
            ...DEFAULT_SECTION,
            id: `${targetBeat.beatKey}-ch${newChapterNum}`,
            beatKey: targetBeat.beatKey,
            title: `${targetBeat.title} - Chapter ${newChapterNum}`,
            guidance: targetBeat.guidance,
        };
        
        const lastIdx = targetBeat.chapters[targetBeat.chapters.length - 1]?.index ?? prev.length - 1;
        const next = [...prev];
        next.splice(lastIdx + 1, 0, newChapter);
        return next;
    });
    }, [getGroupedBeats]);

  const addBeat = useCallback(() => {
      setSections(prev => {
          const beats = getGroupedBeats(prev);
          const newBeatNum = beats.length + 1;
          const newBeatKey = `part-${Date.now()}`; 

          const newChapter = {
              ...DEFAULT_SECTION,
              id: `${newBeatKey}-ch-1`,
              beatKey: newBeatKey,
              title: `Part ${newBeatNum} - Chapter 1`,
              guidance: '',
              content: ''
          };
          return [...prev, newChapter];
      });
  }, [getGroupedBeats]);

    const deleteChapter = useCallback((beatIndex, chapterIdx) => {
        setSections((prev) => {
            const beats = getGroupedBeats(prev);
            const targetBeat = beats[beatIndex];
            if (!targetBeat || targetBeat.chapters.length <= 1) return prev; 
            
            const sectionIndexToRemove = targetBeat.chapters[chapterIdx].index;
            const next = [...prev];
            next.splice(sectionIndexToRemove, 1);
            return next;
        });

        if (selectedBeatIndex === beatIndex && selectedChapterIndex >= chapterIdx) {
            setSelectedChapterIndex((prev) => Math.max(0, prev - 1));
        }
    }, [getGroupedBeats, selectedBeatIndex, selectedChapterIndex]);

    const updateActiveSectionContent = useCallback((content) => {
        setSections((prev) => {
            const newSections = [...prev];
            const activeIdx = getActiveSectionIndex(newSections, selectedBeatIndex, selectedChapterIndex);
            if (activeIdx >= 0 && newSections[activeIdx]) {
                newSections[activeIdx] = { ...newSections[activeIdx], content };
            }
                return newSections;
        });
    }, [selectedBeatIndex, selectedChapterIndex]);

    const setSectionContentAtIndex = useCallback((index, content) => {
        setSections((prev) => {
            const newSections = [...prev];
            if (newSections[index]) {
                newSections[index] = { ...newSections[index], content };
            }
            return newSections;
        });
    }, []);

    const getCurrentActiveSectionIndex = useCallback((currentSections) => {
        return getActiveSectionIndex(currentSections, selectedBeatIndex, selectedChapterIndex);
    }, [selectedBeatIndex, selectedChapterIndex]);

    const loadStories = useCallback(async () => {
        if (!token) return;
        const response = await api.listStories(token);
        setStories(response.stories || []);
    }, [token]);

    const selectStory = useCallback((story) => {
        setCurrentStory(story);
        setSections(story.sections?.length ? story.sections : [{ ...DEFAULT_SECTION, content: story.content || '' }]);
        setSelectedBeatIndex(0);
        setSelectedChapterIndex(0);
        setEditingMode('chapter');
        navigate(`/workspace/${story.id}`);
    }, [navigate]);

    const saveStory = useCallback(async (onStatusMessage) => {
        if (!token || !currentStory) return;
        const content = buildStoryContent(sections, chapterHeadingHtml);
      
        setIsSaving(true);
        setIsIndexing(false);
      
        try {
            const payload = { ...currentStory, content, sections, titleHtml: storyTitleHtml, chapterHeadingHtml };
            let response;
            
            if (activeStoryId) {
                response = await api.updateStory(token, activeStoryId, payload);
                onStatusMessage?.('Story updated. Indexing context...');
            } else {
                response = await api.createStory(token, payload);
                onStatusMessage?.('Story saved. Indexing context...');
                navigate(`/workspace/${response.story.id}`);
            }
            
            const updatedStory = response.story;
            setCurrentStory(updatedStory);
            setStories(prev => {
                const exists = prev.some(s => s.id === updatedStory.id);
                return exists ? prev.map(s => s.id === updatedStory.id ? updatedStory : s) : [updatedStory, ...prev];
            });

            setIsIndexing(true);
            setTimeout(() => setIsIndexing(false), 5000);
        } catch (err) {
            onStatusMessage?.('Unable to save story.');
        } finally {
            setIsSaving(false);
        }
    }, [token, currentStory, sections, chapterHeadingHtml, storyTitleHtml, activeStoryId, navigate]);

    const deleteStory = useCallback(async (id) => {
        if (!token) return;
        await api.deleteStory(token, id);
        setStories(prev => prev.filter(s => s.id !== id));
        if (activeStoryId === id) {
            setCurrentStory(null);
            setSections(defaultSections());
            navigate('/home');
        }
    }, [token, activeStoryId, navigate]);

    const updateStorySettings = useCallback(async (updatedStory) => {
        if (!token) return;
        try {
            await api.updateStory(token, updatedStory.id, {
                title: updatedStory.title,
                genre: updatedStory.genre
            });
            setStories((prev) =>
                prev.map((s) => (s.id === updatedStory.id ? { ...s, title: updatedStory.title, genre: updatedStory.genre } : s))
            );
            if (activeStoryId === updatedStory.id) {
                setCurrentStory((prev) => (prev ? { ...prev, ...updatedStory } : prev));
            }
        } catch (err) {
            console.error('Failed to update story settings:', err);
        }
    }, [token, activeStoryId]);

    const createFromTemplate = useCallback(({ title: newTitle, templateId, genre, sections: newSections }) => {
        const newStory = { id: null, title: newTitle, templateId, genre, sections: newSections };
        setCurrentStory(newStory);
        setSections(newSections);
        setSelectedBeatIndex(0);
        setSelectedChapterIndex(0);
        setEditingMode('chapter');
        navigate('/workspace/new');
    }, [navigate]);

    const createExampleBook = useCallback(async (onStatusMessage) => {
        if (!token) return;
        const template = STORY_TEMPLATES.find((t) => t.genre === 'Horror');
        if (!template) return onStatusMessage?.('Horror template not found.');

        const newSections = template.beats.flatMap((beat) =>
            [0, 1].map((chapterOffset) => {
                const chapterNumber = chapterOffset + 1;
                return {
                    id: `${beat.key}-ch-${chapterNumber}`,
                    beatKey: beat.key,
                    title: `${beat.label} - Chapter ${chapterNumber}`,
                    guidance: beat.guidance,
                    content: buildHorrorChapterContent(beat.label, chapterNumber, EXAMPLE_WORDS_PER_PAGE * 3)
                };
            })
        );

        const content = buildStoryContent(newSections, buildChapterHeadingHtml());
        onStatusMessage?.('Creating example horror book...');

        try {
          const response = await api.createStory(token, {
              title: 'Horror: The Fullerton Signal',
              titleHtml: buildTitleHtml('Horror: The Fullerton Signal'),
              chapterHeadingHtml: buildChapterHeadingHtml(),
              content,
              sections: newSections,
              genre: 'Horror',
              templateId: template.id
          });
              setStories((prev) => [response.story, ...prev]);
              selectStory(response.story);
              onStatusMessage?.('Example horror book created.');
        } catch (err) {
              console.error('Example book creation failed:', err);
              onStatusMessage?.('Unable to create example horror book.');
        }
    }, [token, selectStory]);

    return {
        // State
        stories, currentStory, sections, 
        selectedBeatIndex, selectedChapterIndex, editingMode,
        isSaving, isIndexing, title, storyTitleHtml, chapterHeadingHtml,
        
        // Setters
        setSelectedBeatIndex, setSelectedChapterIndex, setEditingMode, 
        setCurrentStory, setSections,
        
        // Remote Actions
        loadStories, selectStory, saveStory, deleteStory, 
        createFromTemplate, createExampleBook, updateStorySettings,
        
        // Local Mutations
        addChapter, deleteChapter, 
        updateActiveSectionContent, setSectionContentAtIndex,
        addBeat,
        
        // Helpers
        getGroupedBeats, getActiveSectionIndex: getCurrentActiveSectionIndex
    };
}