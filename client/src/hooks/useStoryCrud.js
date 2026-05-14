import { useCallback, useEffect, useRef, useState } from 'react';
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

    // Latest-value ref for sections.
    //
    // StoryEditor.handleSave does:
    //     flushSync(() => setSectionContentAtIndex(idx, contentRef.current));
    //     saveStory();
    // flushSync updates the reducer state synchronously, but the currently
    // executing handleSave still has the OLD `saveStory` captured in its
    // closure (useCallback only swaps the reference for the NEXT render).
    // If saveStory reads `sections` from its closure, it sees the pre-flushSync
    // value and the most recent edit is dropped from the save payload —
    // server stores empty content, UI looks fine until refresh, then the text
    // is gone. Reading from the ref bypasses the closure entirely.
    const sectionsRef = useRef(sections);
    sectionsRef.current = sections;

    // currentStory has the same problem when patched via setCurrentStory inside
    // the same event handler that triggers a save.
    const currentStoryRef = useRef(currentStory);
    currentStoryRef.current = currentStory;

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
        if (!token) return;
        // Read from refs, not closure — see comment above sectionsRef for why.
        const latestStory = currentStoryRef.current;
        const latestSections = sectionsRef.current;
        if (!latestStory) return;

        const latestStoryId = latestStory.id ?? null;
        const chapterHeadingHtml = latestStory.chapterHeadingHtml;
        const payload = {
            ...latestStory,
            content: buildStoryContent(latestSections, chapterHeadingHtml),
            sections: latestSections,
        };

        setIsSaving(true);
        try {
            const response = latestStoryId
                ? await storyService.update(token, latestStoryId, payload)
                : await storyService.create(token, payload);
            onStatusMessage?.(latestStoryId ? 'Story updated.' : 'Story saved.');
            if (!latestStoryId) navigate(`/workspace/${response.story.id}`);

            setCurrentStory(response.story);
            upsertStoryInList(response.story);
        } catch (err) {
            console.error('[saveStory] failed:', err.message);
            onStatusMessage?.('Unable to save story.');
        } finally {
            setIsSaving(false);
        }
    }, [token, navigate, upsertStoryInList]);

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
