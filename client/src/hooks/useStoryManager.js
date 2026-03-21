// src/hooks/useStoryManager.js
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

const defaultSections = () => [
  { ...DEFAULT_SECTION, content: '' }
];

export function useStoryManager(token, navigate) {
  const [stories, setStories] = useState([]);
  const [currentStory, setCurrentStory] = useState(null);
  const [sections, setSections] = useState(defaultSections());
  
  // UI State that directly relates to the story data
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);

  // Derived State (Optimization: useMemo prevents recalculation on every render)
  const activeStoryId = currentStory?.id ?? null;
  const title = currentStory?.title || '';
  const storyTitleHtml = currentStory?.titleHtml || buildTitleHtml(title);
  const chapterHeadingHtml = currentStory?.chapterHeadingHtml || buildChapterHeadingHtml();

  // --- API Actions ---
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

  // --- Data Manipulation ---
  
  // Optimization: A much cleaner way to group beats without recreating the logic multiple times
  const getGroupedBeats = useCallback((currentSections) => {
    const beatsMap = new Map();
    currentSections.forEach((section, index) => {
      if (!beatsMap.has(section.beatKey)) {
        beatsMap.set(section.beatKey, { ...section, chapters: [] });
      }
      beatsMap.get(section.beatKey).chapters.push({ index, section });
    });
    return Array.from(beatsMap.values());
  }, []);

  const addChapter = useCallback((beatIndex) => {
    setSections(prev => {
      const beats = getGroupedBeats(prev);
      const targetBeat = beats[beatIndex];
      if (!targetBeat) return prev;
      
      const newChapter = {
        ...DEFAULT_SECTION, // Base template
        id: `${targetBeat.beatKey}-ch${targetBeat.chapters.length + 1}`,
        beatKey: targetBeat.beatKey,
        title: targetBeat.title,
        guidance: targetBeat.guidance,
      };
      
      const lastIdx = targetBeat.chapters[targetBeat.chapters.length - 1]?.index ?? prev.length - 1;
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newChapter);
      return next;
    });
  }, [getGroupedBeats]);

  const updateSectionContent = useCallback((value) => {
    setSections(prev => {
      const beats = getGroupedBeats(prev);
      const targetBeat = beats[selectedBeatIndex];
      const targetChapter = targetBeat?.chapters[selectedChapterIndex];
      if (!targetChapter) return prev;
      
      return prev.map((s, idx) => idx === targetChapter.index ? { ...s, content: value } : s);
    });
  }, [getGroupedBeats, selectedBeatIndex, selectedChapterIndex]);

  const createFromTemplate = useCallback(({ title: newTitle, templateId, genre, sections: newSections }) => {
    const newStory = {
      id: null,
      title: newTitle,
      templateId,
      genre,
      sections: newSections
    };
    setCurrentStory(newStory);
    setSections(newSections);
    setSelectedBeatIndex(0);
    setSelectedChapterIndex(0);
    navigate('/workspace/new');
  }, [navigate]);

  const createExampleBook = useCallback(async (onStatusMessage) => {
    if (!token) return; // Hook already has access to token!
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
      console.error('Failed to update story:', err);
    }
  }, [token, activeStoryId]);

  return {
    stories, currentStory, sections, 
    selectedBeatIndex, selectedChapterIndex,
    isSaving, isIndexing,
    setSelectedBeatIndex, setSelectedChapterIndex, setCurrentStory, setSections,
    loadStories, selectStory, saveStory, deleteStory, 
    addChapter, updateSectionContent, getGroupedBeats,
    createFromTemplate, createExampleBook, updateStorySettings
  };
}