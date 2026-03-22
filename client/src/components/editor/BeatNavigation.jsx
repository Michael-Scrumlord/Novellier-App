import { useState } from 'react';
import { getWordCount } from './LexicalEditor';
import './BeatNavigation.css';

export default function BeatNavigation({
    storyCtx,
    onSelectBeat,
    onBackToHome,
    isCollapsed,
    onToggle
}) {
    const {
        currentStory,
        sections,
        selectedBeatIndex,
        selectedChapterIndex,
        editingMode,
        addChapter,
        addBeat,
        deleteChapter,
        getGroupedBeats
    } = storyCtx;

    const [expandedBeats, setExpandedBeats] = useState(new Set([0]));

    const toggleBeat = (beatIndex) => {
        setExpandedBeats((prev) => {
            const next = new Set(prev);
            next.has(beatIndex) ? next.delete(beatIndex) : next.add(beatIndex);
            return next;
        });
    };

    const beats = getGroupedBeats(sections);

    return (
        <aside className={`spatial-sidebar ${isCollapsed ? 'spatial-sidebar--collapsed' : ''}`}>
          
            <div className="spatial-sidebar__header">
                {!isCollapsed && (
                  <div className="spatial-sidebar__title-group">
                    <h3 className="text-heading" style={{fontSize: '1rem'}}>{currentStory?.title || 'Untitled'}</h3>
                    <p className="text-muted" style={{fontSize: '0.8rem'}}>Navigate beats & chapters</p>
                  </div>
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

          {!isCollapsed && (
              <>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <button className="btn btn--glass" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={onBackToHome}>
                         ← Back to Library
                      </button>
                  </div>

                  <div className="spatial-sidebar__scroll-area">
                      <div className="story-list" style={{ marginBottom: '1.5rem' }}>
                          <button className={`story-list__target ${editingMode === 'title' ? 'story-list__item--active' : ''}`} onClick={() => onSelectBeat('title')}>
                              <span className="story-list__title">📖 Story Title</span>
                          </button>
                          <button className={`story-list__target ${editingMode === 'chapterHeading' ? 'story-list__item--active' : ''}`} onClick={() => onSelectBeat('chapterHeading')}>
                              <span className="story-list__title">📖 Chapter Heading</span>
                          </button>
                      </div>

                      <div className="story-list">
                        {beats.map((beat, beatIndex) => {
                          const globalChapterStart = beats.slice(0, beatIndex).reduce((sum, b) => sum + b.chapters.length, 1);

                          return (
                            <div key={beat.beatKey} className="beat-group" style={{ marginBottom: '1rem' }}>
                              
                              <button 
                                className="story-list__target" 
                                onClick={() => toggleBeat(beatIndex)}
                                style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}
                              >
                                <span className="story-list__title">
                                  {expandedBeats.has(beatIndex) ? '▼' : '▶'} {beat.title}
                                </span>
                              </button>

                              {expandedBeats.has(beatIndex) && (
                                <div style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  {beat.chapters.map((chapter, chapterIdx) => (
                                    <div key={chapter.index} className={`story-list__item ${selectedBeatIndex === beatIndex && selectedChapterIndex === chapterIdx ? 'story-list__item--active' : ''}`}>
                                      <button className="story-list__target" onClick={() => onSelectBeat(beatIndex, chapterIdx)}>
                                        <span className="story-list__title">Chapter {globalChapterStart + chapterIdx}</span>
                                        <span className="story-list__meta">{getWordCount(chapter.content)} words</span>
                                      </button>
                                      
                                      {beat.chapters.length > 1 && (
                                        <button className="story-list__delete" onClick={() => deleteChapter(beatIndex, chapterIdx)} title="Delete chapter">✕</button>
                                      )}
                                    </div>
                                  ))}
                                  
                                  <button className="btn btn--glass btn--small" style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }} onClick={() => addChapter(beatIndex)}>
                                    + Add Chapter
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        className="btn btn--glass" 
                        onClick={addBeat}
                        style={{ 
                          width: '100%', 
                          marginTop: '1.5rem', 
                          border: '1px dashed var(--border-subtle)',
                          background: 'transparent',
                          color: 'var(--muted)',
                          justifyContent: 'center'
                          }} 
                        >
                        + Add New Part
                      </button>            
                  </div>
              </>
          )}
        </aside>
    );
}