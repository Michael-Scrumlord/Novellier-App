import './StoryList.css';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

function StoryListItem({ story, isActive, onSelect, onDelete }) {
    const itemClass = isActive ? 'story-list__item story-list__item--active' : 'story-list__item';

    const handleDeleteClick = (event) => {
        event.stopPropagation();
        onDelete(story.id);
    };

    return (
        <div className={itemClass}>
            <button type="button" className="story-list__target" onClick={() => onSelect(story)}>
                <span className="story-list__title">{story.title}</span>
                <span className="story-list__meta">
                    {story.genre && <span className="meta-genre">{story.genre}</span>}
                    {DATE_FORMATTER.format(new Date(story.updatedAt))}
                </span>
            </button>

            <button
                type="button"
                className="story-list__delete"
                onClick={handleDeleteClick}
                title="Delete story"
                aria-label={`Delete ${story.title}`}
            >
                ✕
            </button>
        </div>
    );
}

function SidebarHeader({ isCollapsed, onCreate, onToggle }) {
    const toggleLabel = isCollapsed ? 'Expand library' : 'Collapse library';
    const toggleTitle = isCollapsed ? 'Expand' : 'Collapse';
    const toggleIcon = isCollapsed ? '▹' : '◃';

    return (
        <div className="spatial-sidebar__header">
            {!isCollapsed && (
                <div className="spatial-sidebar__title-group">
                    <h3>Library</h3>
                </div>
            )}

            <div className="spatial-sidebar__actions">
                {!isCollapsed && (
                    <button className="btn btn--glass btn--small" type="button" onClick={onCreate}>
                        + New
                    </button>
                )}
                <button
                    className="btn btn--glass btn--icon sidebar-toggle"
                    type="button"
                    onClick={onToggle}
                    aria-label={toggleLabel}
                    title={toggleTitle}
                >
                    {toggleIcon}
                </button>
            </div>
        </div>
    );
}

function EmptyLibraryMessage() {
    return (
        <div className="spatial-sidebar__empty">
            <p>No stories yet.</p>
            <span className="muted-text">Start your first draft.</span>
        </div>
    );
}

export default function StoryList({
    stories,
    activeId,
    onSelect,
    onCreate,
    onDelete,
    isCollapsed,
    onToggle,
}) {
    const sidebarClass = isCollapsed
        ? 'spatial-sidebar spatial-sidebar--collapsed'
        : 'spatial-sidebar';

    return (
        <aside className={sidebarClass} aria-label="Story Library">
            <SidebarHeader isCollapsed={isCollapsed} onCreate={onCreate} onToggle={onToggle} />

            {!isCollapsed && (
                <div className="spatial-sidebar__scroll-area">
                    {stories.length === 0 ? (
                        <EmptyLibraryMessage />
                    ) : (
                        <nav className="story-list">
                            {stories.map((story) => (
                                <StoryListItem
                                    key={story.id}
                                    story={story}
                                    isActive={story.id === activeId}
                                    onSelect={onSelect}
                                    onDelete={onDelete}
                                />
                            ))}
                        </nav>
                    )}
                </div>
            )}
        </aside>
    );
}
