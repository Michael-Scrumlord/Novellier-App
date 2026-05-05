import { createContext, useContext, useMemo, useState } from 'react';
import { useStoryContext } from './StoryContext.jsx';
import { getActiveSectionIndex } from '../utils/storyContentUtils.js';
import { getGroupedBeats } from '../utils/storyStateUtils.js';

const EditorUIContext = createContext(null);

// EditorUIProvider is keyed on currentStory?.id in App.jsx so it remounts
// automatically when the active story changes, resetting selection to defaults.
export function EditorUIProvider({ children }) {
    const { sections } = useStoryContext();

    const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
    const [editingMode, setEditingMode] = useState('chapter');

    const activeSectionIndex = useMemo(
        () => getActiveSectionIndex(sections, selectedBeatIndex, selectedChapterIndex),
        [sections, selectedBeatIndex, selectedChapterIndex]
    );

    const groupedBeats = useMemo(() => getGroupedBeats(sections), [sections]);

    return (
        <EditorUIContext.Provider
            value={{
                selectedBeatIndex,
                selectedChapterIndex,
                editingMode,
                setSelectedBeatIndex,
                setSelectedChapterIndex,
                setEditingMode,
                activeSectionIndex,
                groupedBeats,
            }}
        >
            {children}
        </EditorUIContext.Provider>
    );
}

export function useEditorUIContext() {
    const ctx = useContext(EditorUIContext);
    if (!ctx) throw new Error('useEditorUIContext must be used within EditorUIProvider');
    return ctx;
}