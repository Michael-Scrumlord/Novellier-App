import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkspaceLayout from '../components/layout/WorkspaceLayout.jsx';
import BeatNavigation from '../components/editor/BeatNavigation.jsx';
import StoryEditor from '../components/editor/StoryEditor.jsx';
import PromptPanel from '../components/editor/PromptPanel.jsx';
import PagedBookViewEditor from '../components/editor/PagedBookViewEditor.jsx';
import StorySettingsModal from '../components/story/StorySettingsModal.jsx';
import TemplateWizard from '../components/story/TemplateWizard.jsx';

// Contexts & Constants
import { useAuthContext } from '../contexts/AuthContext.jsx';
import { useStoryContext } from '../contexts/StoryContext.jsx';
import { useModelContext } from '../contexts/ModelContext.jsx';
import { useAIContext } from '../contexts/AIContext.jsx';
import { STORY_TEMPLATES } from '../lib/storyTemplates.js';
import { MODEL_OPTIONS } from '../constants/models.js';

export function WorkspacePage() {
    const { storyId } = useParams();
    const navigate = useNavigate();
    
    const { token } = useAuthContext();
    const storyCtx = useStoryContext();
    const modelCtx = useModelContext();
    const aiCtx = useAIContext();

    const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
    const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);

    // Sync URL to Context
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
    }, [storyId, storyCtx.stories, storyCtx.currentStory?.id, storyCtx, navigate]);

    // Handle navigation between Title, Chapter Heading, and actual Chapters
    const handleSelectBeat = (beatIdxOrMode, chapterIdx) => {
        if (typeof beatIdxOrMode === 'string') {
            storyCtx.setEditingMode(beatIdxOrMode);
        } else {
            storyCtx.setEditingMode('chapter');
            storyCtx.setSelectedBeatIndex(beatIdxOrMode);
            storyCtx.setSelectedChapterIndex(chapterIdx);
        }
    };

    const activeSectionIndex = storyCtx.getActiveSectionIndex ? storyCtx.getActiveSectionIndex(storyCtx.sections) : 0;

    return (
        <>
            <WorkspaceLayout 
                isLeftCollapsed={isLibraryCollapsed}
                isRightCollapsed={isPromptCollapsed}
                
                leftPanel={
                    <BeatNavigation 
                        storyCtx={storyCtx} 
                        isCollapsed={isLibraryCollapsed}
                        onToggle={() => setIsLibraryCollapsed(!isLibraryCollapsed)}
                        onSelectBeat={handleSelectBeat}
                        onBackToHome={() => navigate('/home')}
                    />
                }
                
                centerPanel={
                    <StoryEditor 
                        storyCtx={storyCtx} 
                        modelCtx={modelCtx} 
                        aiCtx={aiCtx}
                        models={MODEL_OPTIONS}
                        onSave={() => storyCtx.saveStory()} 
                        onSuggest={() => aiCtx.requestSuggestion()} 
                        onOpenBookView={() => storyCtx.setBookViewOpen(true)}
                    />
                }
                
                rightPanel={
                    <PromptPanel 
                        aiCtx={aiCtx}
                        modelCtx={modelCtx}
                        models={MODEL_OPTIONS}
                        isCollapsed={isPromptCollapsed} 
                        onToggle={() => setIsPromptCollapsed(!isPromptCollapsed)}
                        onSuggest={() => aiCtx.requestSuggestion()}
                    />
                }
            />

            <TemplateWizard
                isOpen={storyCtx.templateWizardOpen}
                templates={STORY_TEMPLATES}
                onClose={storyCtx.closeTemplateWizard}
                onCreate={storyCtx.createFromTemplate}
            />

            <StorySettingsModal
                story={storyCtx.settingsStory}
                isOpen={Boolean(storyCtx.settingsStory)}
                onClose={storyCtx.closeStorySettings}
                onSave={(updatedStory) => storyCtx.updateStorySettings(updatedStory)}
                onDelete={(id) => storyCtx.deleteStory(id)}
            />

            {/* TODO: This is a little buggy.. */}
            {storyCtx.bookViewOpen && storyCtx.currentStory && storyCtx.sections.length > 0 && (
                <PagedBookViewEditor
                    storyCtx={storyCtx}
                    sections={storyCtx.sections}
                    storyTitle={storyCtx.currentStory.title}
                    storyTitleHtml={storyCtx.storyTitleHtml}
                    chapterHeadingHtml={storyCtx.chapterHeadingHtml}
                    selectedSectionIndex={activeSectionIndex}
                    onClose={() => storyCtx.setBookViewOpen(false)}
                    onChange={(value) => storyCtx.setSectionContentAtIndex(activeSectionIndex, value)}
                    onSave={() => storyCtx.saveStory()}
                />
            )}
        </>
    );
}