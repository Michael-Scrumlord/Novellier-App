import React from 'react';
import HomePageView from '../components/home/HomePage.jsx'; 
import TemplateWizard from '../components/story/TemplateWizard.jsx'; 
import StorySettingsModal from '../components/story/StorySettingsModal.jsx'; 

import { useStoryContext } from '../contexts/StoryContext.jsx';
import { STORY_TEMPLATES } from '../lib/storyTemplates.js'; 

export function HomePage() {
  const {
    stories,
    selectStory,
    openTemplateWizard,
    closeTemplateWizard,
    templateWizardOpen,
    createFromTemplate,
    createExampleBook,
    openStorySettings,
    
    settingsStory,
    closeStorySettings,
    updateStorySettings,
    deleteStory
  } = useStoryContext();

  return (
    <div id="home">
      <HomePageView
        stories={stories}
        onStorySelect={selectStory}
        onCreate={openTemplateWizard}
        onCreateExample={() => createExampleBook()} 
        onOpenStorySettings={openStorySettings}
      />

      <TemplateWizard
        isOpen={templateWizardOpen}
        templates={STORY_TEMPLATES}
        onClose={closeTemplateWizard}
        onCreate={createFromTemplate}
      />

      <StorySettingsModal
        story={settingsStory}
        isOpen={Boolean(settingsStory)}
        onClose={closeStorySettings}
        onSave={updateStorySettings} 
        onDelete={deleteStory}       
      />
    </div>
  );
}