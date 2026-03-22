import LexicalEditor, { getWordCount } from './LexicalEditor';
//import TitleEditor from './TitleEditor';
//import ChapterHeadingEditor from './ChapterHeadingEditor';

export default function StoryEditor({
  storyCtx,
  modelCtx,
  aiCtx,
  models,
  onSave,
  onSuggest,
  onOpenBookView
}) {
const { 
    title, setTitle, 
    storyTitleHtml, setStoryTitleHtml,
    chapterHeadingHtml, setChapterHeadingHtml,
    sections, 
    setSectionContentAtIndex,
    selectedBeatIndex, selectedChapterIndex, editingMode,
    isSaving, isIndexing, getGroupedBeats
  } = storyCtx;

  const { selectedModel, setModel, modelPulling, modelPullStatus } = modelCtx;
  const { feedbackType, feedbackOptions, setFeedbackType, isSuggesting } = aiCtx;

  const beats = getGroupedBeats(sections);
  const currentBeat = beats[selectedBeatIndex];
  const currentChapter = currentBeat?.chapters[selectedChapterIndex];
  const sectionIndex = currentChapter?.index ?? 0;
  const currentSection = sections[sectionIndex];

  const wordCount = currentSection ? getWordCount(currentSection.content) : 0;

  // Determine the dynamic header text
  // There's some kind of bug here, make sure to check it out later. Raise an issue if you see it.
  const getHeaderText = () => {
    if (editingMode === 'title') return 'Story Title';
    if (editingMode === 'chapterHeading') return 'Chapter Heading Template';
    return currentBeat?.title || 'Draft';
  };

return (
  <section className="glass-window" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>      
      {/* The Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h3 className="text-heading" style={{ fontSize: '1.2rem' }}>Editing</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>{getHeaderText()}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn--glass" onClick={onOpenBookView} title="Fullscreen book view">
            Book View
          </button>
          <button className="btn btn--primary" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* The Editor Canvas */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', minHeight: 0, margin: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h4 className="text-heading">{currentSection?.title || 'Draft'}</h4>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>{currentSection?.guidance}</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {currentSection && (
            <LexicalEditor
              value={currentSection.content}
              onChange={(newContent) => setSectionContentAtIndex(sectionIndex, newContent)}
              placeholder="Draft this chapter..."
            />
          )}
        </div>
      </div>

      <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)' }}>
        <span>{editingMode === 'chapter' ? wordCount : 0} words</span>
        <span>{isIndexing ? 'Indexing memory...' : 'Memory synced'}</span>
      </div>
    </section>
  );
}