import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkspaceLayout from '../components/layout/WorkspaceLayout.jsx';
import BeatNavigation from '../components/editor/BeatNavigation.jsx';
import StoryEditor from '../components/editor/StoryEditor.jsx';
import PromptPanel from '../components/editor/PromptPanel.jsx';
import PagedBookViewEditor from '../components/editor/PagedBookViewEditor.jsx';
import StorySettingsModal from '../components/story/StorySettingsModal.jsx';

import { useStoryContext } from '../contexts/StoryContext.jsx';
import { useSelectedModel } from '../hooks/useSelectedModel.js';
import { useAIContext } from '../contexts/AIContext.jsx';
import { useIndexStatus } from '../hooks/useIndexStatus.js';
import { useAuthContext } from '../contexts/AuthContext.jsx';

function indexStatusLabel(status, error) {
    if (status === 'pending' || status === 'running') return 'Embedding in progress…';
    if (status === 'error') {
        const lower = (error || '').toLowerCase();
        if (lower.includes('model') || lower.includes('pull') || lower.includes('not found')) {
            return 'Embedding model unavailable — check Admin > AI Models';
        }
        return 'Embedding failed — check server logs';
    }
    return null;
}

export function WorkspacePage() {
    const { storyId } = useParams();
    const navigate = useNavigate();

    const storyCtx = useStoryContext();
    const { token } = useAuthContext();
    const { selectedModel } = useSelectedModel();
    const aiCtx = useAIContext();

    const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
    const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
    const [bookViewOpen, setBookViewOpen] = useState(false);
    const [settingsStory, setSettingsStory] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');
    const [indexPollEnabled, setIndexPollEnabled] = useState(false);
    const saveStatusTimer = useRef(null);

    const { indexStatus, indexError } = useIndexStatus({
        token,
        storyId: storyCtx.activeStoryId,
        enabled: indexPollEnabled,
    });

    // Stop triggering a new poll once the current one resolves.
    useEffect(() => {
        if (indexStatus === 'done' || indexStatus === 'error') {
            setIndexPollEnabled(false);
        }
    }, [indexStatus]);

    const showSaveStatus = useCallback((msg) => {
        setSaveStatus(msg);
        clearTimeout(saveStatusTimer.current);
        saveStatusTimer.current = setTimeout(() => setSaveStatus(''), 3000);
        if (msg === 'Story updated.' || msg === 'Story saved.') {
            setIndexPollEnabled(true);
        }
    }, []);

    useEffect(() => {
        if (!storyId || storyId === 'new') return;
        if (!storyCtx.storiesLoaded) return;

        const found = storyCtx.stories.find((s) => s.id === storyId);
        if (!found) {
            navigate('/home', { replace: true });
            return;
        }
        if (storyCtx.currentStory?.id !== storyId) {
            storyCtx.selectStory(found);
        }
    }, [storyId, storyCtx.stories, storyCtx.storiesLoaded, storyCtx.currentStory?.id, storyCtx.selectStory]);

    const handleToggleLibrary = () => setIsLibraryCollapsed((prev) => !prev);
    const handleTogglePrompt = () => setIsPromptCollapsed((prev) => !prev);
    const handleBackToHome = () => navigate('/home');
    const handleOpenSettings = () => setSettingsStory(storyCtx.currentStory);
    const handleCloseSettings = () => setSettingsStory(null);
    const handleOpenBookView = () => setBookViewOpen(true);
    const handleCloseBookView = () => setBookViewOpen(false);
    const handleSuggest = () => aiCtx.requestSuggestion(showSaveStatus);
    const handleSave = () => storyCtx.saveStory(showSaveStatus);

    const showBookView =
        bookViewOpen && storyCtx.currentStory && storyCtx.sections.length > 0;

    // Compose status bar text: transient save message > embedding progress > default
    const statusBarText = saveStatus || indexStatusLabel(indexStatus, indexError) || null;

    return (
        <>
            <WorkspaceLayout
                isLeftCollapsed={isLibraryCollapsed}
                isRightCollapsed={isPromptCollapsed}
                leftPanel={
                    <BeatNavigation
                        isCollapsed={isLibraryCollapsed}
                        onToggle={handleToggleLibrary}
                        onBackToHome={handleBackToHome}
                        onOpenSettings={handleOpenSettings}
                    />
                }
                centerPanel={
                    <StoryEditor onSave={handleSave} onOpenBookView={handleOpenBookView} saveStatus={statusBarText} />
                }
                rightPanel={
                    <PromptPanel
                        aiCtx={aiCtx}
                        selectedModel={selectedModel}
                        isCollapsed={isPromptCollapsed}
                        onToggle={handleTogglePrompt}
                        onSuggest={handleSuggest}
                    />
                }
            />

            <StorySettingsModal
                story={settingsStory}
                isOpen={Boolean(settingsStory)}
                onClose={handleCloseSettings}
                onSave={storyCtx.updateStorySettings}
                onDelete={storyCtx.deleteStory}
            />

            {showBookView && <PagedBookViewEditor onClose={handleCloseBookView} />}
        </>
    );
}
