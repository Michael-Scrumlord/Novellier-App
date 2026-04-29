import { useStoryContext } from '../../contexts/StoryContext.jsx';
import { useEditorUIContext } from '../../contexts/EditorUIContext.jsx';
import AppearancePanel from './panels/AppearancePanel.jsx';
import FactsPanel from './panels/FactsPanel.jsx';
import StoryStructurePanel from './panels/StoryStructurePanel.jsx';
import './BeatNavigation.css';

export default function BeatNavigation({
    onBackToHome,
    onOpenSettings,
    isCollapsed,
    onToggle,
}) {
    const {
        currentStory,
        addChapter,
        addBeat,
        deleteChapter,
        renameBeat,
        renameChapter,
        setTitle,
        setStoryTitleHtml,
        setChapterHeadingHtml,
        updateStoryFacts,
    } = useStoryContext();

    const {
        selectedBeatIndex,
        selectedChapterIndex,
        editingMode,
        groupedBeats,
        setEditingMode,
        setSelectedBeatIndex,
        setSelectedChapterIndex,
    } = useEditorUIContext();

    const beats = groupedBeats || [];
    const storyFacts = currentStory?.facts || [];

    const handleSelectBeat = (beatIdx, chapterIdx) => {
        setEditingMode('chapter');
        setSelectedBeatIndex(beatIdx);
        setSelectedChapterIndex(chapterIdx);
    };

    const handleDeleteChapter = (beatIndex, chapterIdx, beatsList) => {
        const nextIdx = deleteChapter(
            beatIndex, chapterIdx,
            selectedBeatIndex, selectedChapterIndex,
            beatsList,
        );
        if (nextIdx !== selectedChapterIndex) {
            setSelectedChapterIndex(nextIdx);
        }
    };

    return (
        <aside className={`spatial-sidebar col-fill-w ${isCollapsed ? 'spatial-sidebar--collapsed' : ''}`}>
            <div className="spatial-sidebar__header row-between">
                {!isCollapsed && (
                    <div className="spatial-sidebar__title-group flex-col gap-1">
                        <h3 className="text-heading">
                            {currentStory?.title || 'Untitled'}
                        </h3>
                        <p className="text-muted">
                            Navigate beats & chapters
                        </p>
                    </div>
                )}
                <div className="flex-row sidebar-header__controls">
                    {!isCollapsed && currentStory && onOpenSettings && (
                        <button
                            className="btn btn--glass btn--icon"
                            onClick={onOpenSettings}
                            title="Story Settings"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                    )}
                    <button
                        className="btn btn--glass btn--icon sidebar-toggle"
                        onClick={onToggle}
                        title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
                    >
                        {isCollapsed ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    <div className="beat-nav__quick-links">
                        <button
                            className="btn btn--glass full-width"
                            onClick={onBackToHome}
                        >
                            ← Back to Library
                        </button>
                    </div>

                    <div className="spatial-sidebar__scroll-area scroll-area">
                        <div className="beat-nav__panels flex-col">
                            <AppearancePanel
                                editingMode={editingMode}
                                titleValue={currentStory?.title || ''}
                                setTitle={setTitle}
                                setStoryTitleHtml={setStoryTitleHtml}
                                setChapterHeadingHtml={setChapterHeadingHtml}
                                onSelectMode={setEditingMode}
                            />

                            <FactsPanel facts={storyFacts} onUpdateFacts={updateStoryFacts} />
                        </div>

                        <StoryStructurePanel
                            beats={beats}
                            selectedBeatIndex={selectedBeatIndex}
                            selectedChapterIndex={selectedChapterIndex}
                            addChapter={addChapter}
                            addBeat={addBeat}
                            deleteChapter={handleDeleteChapter}
                            renameBeat={renameBeat}
                            renameChapter={renameChapter}
                            onSelectBeat={handleSelectBeat}
                        />
                    </div>
                </>
            )}
        </aside>
    );
}
