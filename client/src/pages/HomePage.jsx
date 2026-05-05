import React, { useState } from 'react';
import HomePageView from '../components/home/HomePage.jsx';
import TemplateWizard from '../components/story/TemplateWizard.jsx';
import StorySettingsModal from '../components/story/StorySettingsModal.jsx';

import { useStoryContext } from '../contexts/StoryContext.jsx';
import { STORY_TEMPLATES } from '../lib/storyTemplates.js';

export function HomePage() {
    const {
        stories,
        selectStory,
        createFromTemplate,
        updateStorySettings,
        deleteStory,
    } = useStoryContext();

    const [isTemplateWizardOpen, setIsTemplateWizardOpen] = useState(false);
    const [settingsStory, setSettingsStory] = useState(null);

    const openTemplateWizard = () => setIsTemplateWizardOpen(true);
    const closeTemplateWizard = () => setIsTemplateWizardOpen(false);
    const closeSettings = () => setSettingsStory(null);

    const handleCreateFromTemplate = (opts) => {
        createFromTemplate(opts);
        closeTemplateWizard();
    };

    return (
        <div id="home">
            <HomePageView
                stories={stories}
                onStorySelect={selectStory}
                onCreate={openTemplateWizard}
                onOpenStorySettings={setSettingsStory}
            />

            <TemplateWizard
                isOpen={isTemplateWizardOpen}
                templates={STORY_TEMPLATES}
                onClose={closeTemplateWizard}
                onCreate={handleCreateFromTemplate}
            />

            <StorySettingsModal
                story={settingsStory}
                isOpen={Boolean(settingsStory)}
                onClose={closeSettings}
                onSave={updateStorySettings}
                onDelete={deleteStory}
            />
        </div>
    );
}