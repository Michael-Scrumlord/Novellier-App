// src/contexts/StoryContext.jsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from './AuthContext.jsx';
import { useStoryManager } from '../hooks/useStoryManager.js';
import { getActiveSectionIndex } from '../utils/storyContentUtils.js';

const StoryContext = createContext(null);

export function StoryProvider({ children }) {
  const navigate = useNavigate();
  const { token, clearTokenOnFailure } = useAuthContext();
  
  // Consume our optimized logic hook
  const storyManager = useStoryManager(token, navigate);

  // Simple UI State (Modals, Views)
  const [editingMode, setEditingMode] = useState('chapter');
  const [settingsStory, setSettingsStory] = useState(null);
  const [templateWizardOpen, setTemplateWizardOpen] = useState(false);
  const [bookViewOpen, setBookViewOpen] = useState(false);

  // Initial Load
  useEffect(() => {
    if (!token) {
      storyManager.setCurrentStory(null);
      return;
    }
    storyManager.loadStories().catch(() => clearTokenOnFailure?.());
  }, [token, storyManager.loadStories, clearTokenOnFailure]);

  // Derived calculations optimized with useMemo
  const activeStoryId = storyManager.currentStory?.id ?? null;
  const activeSectionIndex = useMemo(() => 
    getActiveSectionIndex(storyManager.sections, storyManager.selectedBeatIndex, storyManager.selectedChapterIndex),
    [storyManager.sections, storyManager.selectedBeatIndex, storyManager.selectedChapterIndex]
  );

  const value = {
    // Spread the manager to expose all data and functions
    ...storyManager, 
    
    // Explicitly add UI state and derived values
    activeStoryId,
    activeSectionIndex,
    editingMode, setEditingMode,
    settingsStory, setSettingsStory,
    templateWizardOpen, setTemplateWizardOpen,
    bookViewOpen, setBookViewOpen,
    
    // Quick Actions
    openStorySettings: (story) => setSettingsStory(story),
    closeStorySettings: () => setSettingsStory(null),
    openTemplateWizard: () => setTemplateWizardOpen(true),
    closeTemplateWizard: () => setTemplateWizardOpen(false),
  };

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStoryContext() {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStoryContext must be used within StoryProvider');
  return ctx;
}