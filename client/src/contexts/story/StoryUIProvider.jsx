import React, { createContext, useContext, useState, useMemo } from 'react';

const StoryUIContext = createContext(null);

export function StoryUIProvider({ children }) {
    const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
    const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
    const [editingMode, setEditingMode] = useState('chapter');
    const [settingsStory, setSettingsStory] = useState(null);
    const [templateWizardOpen, setTemplateWizardOpen] = useState(false);
    const [bookViewOpen, setBookViewOpen] = useState(false);

    const value = useMemo(() => ({
        selectedBeatIndex, setSelectedBeatIndex,
        selectedChapterIndex, setSelectedChapterIndex,
        editingMode, setEditingMode,
        settingsStory, setSettingsStory,
        templateWizardOpen, setTemplateWizardOpen,
        bookViewOpen, setBookViewOpen
    }), [selectedBeatIndex, selectedChapterIndex, editingMode, settingsStory, templateWizardOpen, bookViewOpen]);

    return <StoryUIContext.Provider value={value}>{children}</StoryUIContext.Provider>;
}

export const useStoryUI = () => useContext(StoryUIContext);