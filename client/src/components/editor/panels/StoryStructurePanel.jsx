import { useState } from 'react';
import { getWordCount } from '../../../utils/lexicalUtils.js';

function EditableLabel({ value, onCommit, placeholder, isEditing, onEndEdit, onSelect }) {
    const [draft, setDraft] = useState(value);

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== value) onCommit(trimmed);
        onEndEdit();
    };

    if (isEditing) {
        return (
            <input
                className="story-list__inline-input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') { setDraft(value); onEndEdit(); }
                }}
                placeholder={placeholder}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <span className="story-list__label" onClick={onSelect}>
            {value || placeholder}
        </span>
    );
}

function RowActions({ onEdit, onDelete }) {
    return (
        <div className="flex-row-end story-list__actions">
            <button
                type="button"
                className="story-list__icon-btn"
                title="Rename"
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
                ✎
            </button>
            {onDelete && (
                <button
                    type="button"
                    className="story-list__icon-btn story-list__icon-btn--danger"
                    title="Delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                    ✕
                </button>
            )}
        </div>
    );
}

function BeatRow({ beat, beatIndex, isActive, isExpanded, onSelect, onToggle, onRename }) {
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <div className={`beat-group__header row ${isActive ? 'beat-group__header--active' : ''}`}>
                <input
                    className="story-list__inline-input"
                    autoFocus
                    defaultValue={beat.title}
                    onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== beat.title) onRename(beatIndex, v);
                        setEditing(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                        if (e.key === 'Escape') setEditing(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    }

    return (
        <div
            className={`beat-group__header row ${isActive ? 'beat-group__header--active' : ''}`}
            onClick={() => onSelect(beatIndex, 0)}
            role="button"
            tabIndex={0}
        >
            <span className="beat-group__label">{beat.title || 'Untitled beat'}</span>

            <div className="beat-group__actions">
                <button
                    type="button"
                    className="story-list__icon-btn"
                    title="Rename"
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                >
                    ✎
                </button>
            </div>

            <span
                className={`beat-group__toggle ${
                    isExpanded ? 'beat-group__toggle--expanded' : 'beat-group__toggle--collapsed'
                }`}
                onClick={(e) => { e.stopPropagation(); onToggle(beatIndex); }}
                role="button"
                tabIndex={-1}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
                ▼
            </span>
        </div>
    );
}

function ChapterRow({ chapter, chapterIdx, beatIndex, isActive, canDelete, globalIndex, onSelect, onRename, onDelete }) {
    const [editing, setEditing] = useState(false);

    return (
        <div className={`story-list__item flex-row ${isActive ? 'story-list__item--active' : ''}`}>
            <div
                className="story-list__editable-item story-list__editable-item--chapter flex-col flex-1"
                onClick={() => onSelect(beatIndex, chapterIdx)}
                role="button"
                tabIndex={0}
            >
                <EditableLabel
                    value={chapter.title || `Chapter ${globalIndex}`}
                    onCommit={(v) => onRename(beatIndex, chapterIdx, v)}
                    placeholder={`Chapter ${globalIndex}`}
                    isEditing={editing}
                    onBeginEdit={() => setEditing(true)}
                    onEndEdit={() => setEditing(false)}
                    onSelect={() => onSelect(beatIndex, chapterIdx)}
                />
                <span className="story-list__meta">{getWordCount(chapter.content)} words</span>
            </div>
            <RowActions
                onEdit={() => setEditing(true)}
                onDelete={canDelete ? () => onDelete(beatIndex, chapterIdx) : undefined}
            />
        </div>
    );
}

export default function StoryStructurePanel({
    beats,
    selectedBeatIndex,
    selectedChapterIndex,
    addChapter,
    addBeat,
    deleteChapter,
    renameBeat,
    renameChapter,
    onSelectBeat,
}) {
    const [expandedBeats, setExpandedBeats] = useState(new Set([0]));

    const toggleBeat = (beatIndex) => {
        setExpandedBeats((prev) => {
            const next = new Set(prev);
            next.has(beatIndex) ? next.delete(beatIndex) : next.add(beatIndex);
            return next;
        });
    };

    const handleRenameBeat = (index, title) => renameBeat?.(index, title, beats);
    const handleRenameChapter = (bIndex, cIndex, title) => renameChapter?.(bIndex, cIndex, title, beats);
    const handleDeleteChapter = (bIndex, cIndex) => deleteChapter?.(bIndex, cIndex, beats);
    const handleAddChapter = (bIndex) => addChapter?.(bIndex, beats);

    return (
        <>
            <div className="story-list flex-col">
                {beats.map((beat, beatIndex) => {
                    const globalChapterStart = beats
                        .slice(0, beatIndex)
                        .reduce((sum, b) => sum + b.chapters.length, 1);
                    const isExpanded = expandedBeats.has(beatIndex);

                    return (
                        <div key={beat.beatKey} className="beat-group">
                            <BeatRow
                                beat={beat}
                                beatIndex={beatIndex}
                                isActive={selectedBeatIndex === beatIndex && selectedChapterIndex === 0}
                                isExpanded={isExpanded}
                                onSelect={onSelectBeat}
                                onToggle={toggleBeat}
                                onRename={handleRenameBeat}
                            />

                            {isExpanded && (
                                <div className="flex-col story-list__chapters">
                                    {beat.chapters.map((chapter, chapterIdx) => (
                                        <ChapterRow
                                            key={chapter.chapterKey ?? chapterIdx}
                                            chapter={chapter}
                                            chapterIdx={chapterIdx}
                                            beatIndex={beatIndex}
                                            isActive={selectedBeatIndex === beatIndex && selectedChapterIndex === chapterIdx}
                                            canDelete={beat.chapters.length > 1}
                                            globalIndex={globalChapterStart + chapterIdx}
                                            onSelect={onSelectBeat}
                                            onRename={handleRenameChapter}
                                            onDelete={handleDeleteChapter}
                                        />
                                    ))}

                                    <button
                                        className="btn btn--small story-list__add-chapter"
                                        onClick={() => handleAddChapter(beatIndex)}
                                    >
                                        + Add Chapter
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button className="btn story-list__add-beat full-width" onClick={addBeat}>
                + Add New Part
            </button>
        </>
    );
}
