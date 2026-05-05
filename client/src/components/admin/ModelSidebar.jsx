function hasAnyActiveRole(entry) {
    return Boolean(entry.active.suggestion || entry.active.summary || entry.active.embedding);
}

function DownloadedBadge({ downloaded }) {
    if (downloaded) {
        return <span className="vision-badge vision-badge--small">Downloaded</span>;
    }
    return <span className="vision-badge vision-badge--outline vision-badge--small">Cloud</span>;
}

function ModelEntry({ entry, isSelected, onSelect }) {
    const className = `surface-card vision-conversation-item ${isSelected ? 'active' : ''}`;

    return (
        <button
            className={className}
            type="button"
            onClick={() => onSelect(entry.family)}
        >
            <div className="vision-sidebar-item-header">
                <strong>{entry.displayName}</strong>
                <DownloadedBadge downloaded={entry.downloaded} />
            </div>
            <span className="vision-sidebar-item-desc">{entry.description}</span>

            <div className="vision-sidebar-item-tags">
                {hasAnyActiveRole(entry) && (
                    <span className="vision-badge vision-badge--active vision-badge--small">Active Role</span>
                )}
                {entry.sizeTags.map((sizeTag) => (
                    <small key={`${entry.family}-${sizeTag}`}>{sizeTag}</small>
                ))}
            </div>
        </button>
    );
}

export default function ModelSidebar({ visibleModels, selectedFamily, setSelectedFamily }) {
    if (!visibleModels.length) {
        return (
            <aside className="vision-conversation-list">
                <div className="vision-empty-state vision-empty-state--compact">
                    <p>No models matched the search.</p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="vision-conversation-list">
            {visibleModels.map((entry) => (
                <ModelEntry
                    key={entry.family}
                    entry={entry}
                    isSelected={entry.family === selectedFamily}
                    onSelect={setSelectedFamily}
                />
            ))}
        </aside>
    );
}
