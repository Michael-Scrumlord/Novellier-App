import React from 'react';
import './StoryList.css';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

export default function StoryList({
  stories,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isCollapsed,
  onToggle
}) {
  return (
    <aside
      className={`spatial-sidebar ${isCollapsed ? 'spatial-sidebar--collapsed' : ''}`}
      aria-label="Story Library"
    >
      <div className="spatial-sidebar__header">
        {!isCollapsed && (
          <div className="spatial-sidebar__title-group">
            <h3>Library</h3>
          </div>
        )}
        
        <div className="spatial-sidebar__actions">
          {!isCollapsed && (
            <button 
              className="btn btn--glass btn--small" 
              type="button" 
              onClick={onCreate}
            >
              + New
            </button>
          )}
          <button
            className="btn btn--glass btn--icon sidebar-toggle"
            type="button"
            onClick={onToggle}
            aria-label={isCollapsed ? 'Expand library' : 'Collapse library'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▹' : '◃'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="spatial-sidebar__scroll-area">
          {stories.length === 0 ? (
            <div className="spatial-sidebar__empty">
              <p>No stories yet.</p>
              <span className="muted-text">Start your first draft.</span>
            </div>
          ) : (
            <nav className="story-list">
              {stories.map((story) => {
                const isActive = story.id === activeId;
                
                return (
                  <div
                    key={story.id}
                    className={`story-list__item ${isActive ? 'story-list__item--active' : ''}`}
                  >
                    <button 
                      type="button" 
                      className="story-list__target"
                      onClick={() => onSelect(story)}
                    >
                      <span className="story-list__title">{story.title}</span>
                      <span className="story-list__meta">
                        {story.genre ? <span className="meta-genre">{story.genre}</span> : null}
                        {dateFormatter.format(new Date(story.updatedAt))}
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      className="story-list__delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(story.id);
                      }}
                      title="Delete story"
                      aria-label={`Delete ${story.title}`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </aside>
  );
}