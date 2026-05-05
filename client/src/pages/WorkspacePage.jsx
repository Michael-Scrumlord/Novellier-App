import React, { useState, useEffect } from 'react';
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

export function WorkspacePage() {
    const { storyId } = useParams();
    const navigate = useNavigate();

    const storyCtx = useStoryContext();
    const { selectedModel } = useSelectedModel();
    const aiCtx = useAIContext();

    const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
    const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
    const [bookViewOpen, setBookViewOpen] = useState(false);
    const [settingsStory, setSettingsStory] = useState(null);

    useEffect(() => {
        if (!storyId || storyId === 'new') return;

        const found = storyCtx.stories.find((s) => s.id === storyId);
        if (!found) {
            navigate('/home', { replace: true });
            return;
        }
        if (storyCtx.currentStory?.id !== storyId) {
            storyCtx.selectStory(found);
        }
    }, [storyId, storyCtx.stories, storyCtx.currentStory?.id]);

    const handleToggleLibrary = () => setIsLibraryCollapsed((prev) => !prev);
    const handleTogglePrompt = () => setIsPromptCollapsed((prev) => !prev);
    const handleBackToHome = () => navigate('/home');
    const handleOpenSettings = () => setSettingsStory(storyCtx.currentStory);
    const handleCloseSettings = () => setSettingsStory(null);
    const handleOpenBookView = () => setBookViewOpen(true);
    const handleCloseBookView = () => setBookViewOpen(false);
    const handleSuggest = () => aiCtx.requestSuggestion();
    const handleSave = () => storyCtx.saveStory();

    const showBookView =
        bookViewOpen && storyCtx.currentStory && storyCtx.sections.length > 0;

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
                    <StoryEditor onSave={handleSave} onOpenBookView={handleOpenBookView} />
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