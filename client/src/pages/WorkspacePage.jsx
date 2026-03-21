// src/pages/WorkspacePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Layout & UI Components
import WorkspaceLayout from '../components/layout/WorkspaceLayout.jsx';
// import BeatNavigation from '../components/editor/BeatNavigation.jsx';
// import StoryEditor from '../components/editor/StoryEditor.jsx';
// import PromptPanel from '../components/editor/PromptPanel.jsx';
import StorySettingsModal from '../components/story/StorySettingsModal.jsx';
import TemplateWizard from '../components/story/TemplateWizard.jsx';

// Contexts
import { useAuthContext } from '../contexts/AuthContext.jsx';
import { useStoryContext } from '../contexts/StoryContext.jsx';
import { useModelContext } from '../contexts/ModelContext.jsx';
//import { useAIContext } from '../contexts/AIContext.jsx';
import { STORY_TEMPLATES } from '../lib/storyTemplates.js';

export function WorkspacePage() {
  const { storyId } = useParams();
  const navigate = useNavigate();
  
  const { token } = useAuthContext();
  const storyCtx = useStoryContext();
  const modelCtx = useModelContext();
  //const aiCtx = useAIContext();

  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);

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

  return (
    <>
      <WorkspaceLayout 
        isLeftCollapsed={isLibraryCollapsed}
        isRightCollapsed={isPromptCollapsed}
        
        leftPanel={
          <div className="glass-card" style={{ margin: '1rem 0 1rem 1rem' }}>
            <button className="btn btn--glass" onClick={() => setIsLibraryCollapsed(!isLibraryCollapsed)}>
              {isLibraryCollapsed ? '▶' : '◀ Collapse Navigation'}
            </button>
          </div>
          // Future: <BeatNavigation storyCtx={storyCtx} onToggle={() => setIsLibraryCollapsed(!isLibraryCollapsed)} />
        }
        
        centerPanel={
          <div className="glass-window" style={{ margin: '1rem', height: '100%', display: 'grid', placeItems: 'center' }}>
            <h2 className="text-muted">Editor Component Placeholder</h2>
          </div>
          // Future: <StoryEditor storyCtx={storyCtx} modelCtx={modelCtx} aiCtx={aiCtx} />
        }
        
        rightPanel={
          <div className="glass-card" style={{ margin: '1rem 1rem 1rem 0' }}>
            <button className="btn btn--glass" onClick={() => setIsPromptCollapsed(!isPromptCollapsed)}>
              {isPromptCollapsed ? '◀' : 'Collapse AI Panel ▶'}
            </button>
          </div>
          // Future: <PromptPanel aiCtx={aiCtx} onToggle={() => setIsPromptCollapsed(!isPromptCollapsed)} />
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
        onSave={(updatedStory) => storyCtx.updateStorySettings(token, updatedStory)}
        onDelete={(id) => storyCtx.deleteStory(token, id)}
      />
    </>
  );
}