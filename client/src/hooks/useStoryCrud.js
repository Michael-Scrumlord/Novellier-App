import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storyService } from '../services/storyService.js';
import { DEFAULT_SECTION } from '../lib/storyTemplates.js';
import { buildStoryContent } from '../utils/storyContentUtils.js';

export function useStoryCrud({ token, clearTokenOnFailure, sections, setSections, resetSections }) {
    const navigate = useNavigate();

    const [stories, setStories] = useState([]);
    const [storiesLoaded, setStoriesLoaded] = useState(false);
    const [currentStory, setCurrentStory] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const activeStoryId = currentStory?.id ?? null;

    const loadStories = useCallback(async () => {
        if (!token) {
            setStories([]);
            setStoriesLoaded(true);
            return;
        }
        setStoriesLoaded(false);
        try {
            const response = await storyService.list(token);
            setStories(response.stories || []);
        } catch {
            clearTokenOnFailure?.();
        } finally {
            setStoriesLoaded(true);
        }
    }, [token, clearTokenOnFailure]);

    useEffect(() => { loadStories(); }, [loadStories]);

    const upsertStoryInList = useCallback((updated) => {
        setStories((prev) => {
            const exists = prev.some((s) => s.id === updated.id);
            return exists
                ? prev.map((s) => (s.id === updated.id ? updated : s))
                : [updated, ...prev];
        });
    }, []);

    const selectStory = useCallback((story) => {
        setCurrentStory(story);
        const initial = story.sections?.length
            ? story.sections
            : [{ ...DEFAULT_SECTION, content: story.content || '' }];
        setSections(initial);
        navigate(`/workspace/${story.id}`);
    }, [navigate, setSections]);

    const saveStory = useCallback(async (onStatusMessage) => {
        if (!token || !currentStory) return;
        const chapterHeadingHtml = currentStory.chapterHeadingHtml;
        const payload = {
            ...currentStory,
            content: buildStoryContent(sections, chapterHeadingHtml),
            sections,
        };

        setIsSaving(true);
        try {
            const response = activeStoryId
                ? await storyService.update(token, activeStoryId, payload)
                : await storyService.create(token, payload);
            onStatusMessage?.(activeStoryId ? 'Story updated.' : 'Story saved.');
            if (!activeStoryId) navigate(`/workspace/${response.story.id}`);

            setCurrentStory(response.story);
            upsertStoryInList(response.story);
        } catch {
            onStatusMessage?.('Unable to save story.');
        } finally {
            setIsSaving(false);
        }
    }, [token, currentStory, sections, activeStoryId, navigate, upsertStoryInList]);

    const deleteStory = useCallback(async (id) => {
        if (!token) return;
        await storyService.remove(token, id);
        setStories((prev) => prev.filter((s) => s.id !== id));
        if (activeStoryId === id) {
            setCurrentStory(null);
            resetSections();
            navigate('/home');
        }
    }, [token, activeStoryId, navigate, resetSections]);

    const updateStorySettings = useCallback(async (updated) => {
        if (!token) return;
        try {
            await storyService.update(token, updated.id, { title: updated.title, genre: updated.genre });
            setStories((prev) => prev.map((s) =>
                s.id === updated.id ? { ...s, title: updated.title, genre: updated.genre } : s
            ));
            if (activeStoryId === updated.id) {
                setCurrentStory((prev) => (prev ? { ...prev, ...updated } : prev));
            }
        } catch (err) {
            console.error('Failed to update story settings:', err);
        }
    }, [token, activeStoryId]);

    const updateStoryFacts = useCallback(async (facts) => {
        if (!token || !activeStoryId) return;
        try {
            await storyService.update(token, activeStoryId, { facts });
            setCurrentStory((prev) => (prev ? { ...prev, facts } : prev));
            setStories((prev) => prev.map((s) => (s.id === activeStoryId ? { ...s, facts } : s)));
        } catch (err) {
            console.error('Failed to update story facts:', err);
        }
    }, [token, activeStoryId]);

    const syncStoryFromServer = useCallback((story) => {
        if (!story?.id) return;
        setCurrentStory((prev) => (prev?.id === story.id ? { ...prev, ...story } : prev));
        setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, ...story } : s)));
    }, []);

    const createFromTemplate = useCallback(({ title, templateId, genre, sections: newSections }) => {
        setCurrentStory({ id: null, title, templateId, genre, sections: newSections });
        setSections(newSections);
        navigate('/workspace/new');
    }, [navigate, setSections]);

    return {
        stories, storiesLoaded, currentStory, isSaving, activeStoryId,
        setCurrentStory,
        loadStories, selectStory, saveStory, deleteStory,
        createFromTemplate,
        updateStorySettings, updateStoryFacts, syncStoryFromServer,
    };
}
