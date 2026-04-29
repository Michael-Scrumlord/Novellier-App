import { useStoryContext } from '../../contexts/StoryContext.jsx';
import { useEditorUIContext } from '../../contexts/EditorUIContext.jsx';
import LexicalEditor, { getWordCount } from './LexicalEditor';
import './StoryEditor.css';

function getEyebrowText(editingMode, currentBeat) {
    if (editingMode === 'title') return 'Editing · Story Title';
    if (editingMode === 'chapterHeading') return 'Editing · Chapter Heading Template';
    if (currentBeat?.title) return `Editing · ${currentBeat.title}`;
    return 'Editing · Draft';
}

function emphasizeMidWord(title) {
    if (!title || typeof title !== 'string') return title;
    const tokens = title.trim().split(/\s+/);
    if (tokens.length < 3) return title;

    const middleIndex = Math.floor(tokens.length / 2);
    return tokens.map((token, idx) => {
        if (idx === middleIndex) {
            return <em key={idx}>{token}</em>;
        }
        if (idx === 0) return token;
        return ` ${token}`;
    }).reduce((acc, node, idx) => {
        if (idx === 0) return [node];
        if (typeof node === 'string') return [...acc, node];
        return [...acc, ' ', node];
    }, []);
}

function EditorHeader({ eyebrow, title, sub, onOpenBookView, onSave, isSaving }) {
    return (
        <header className="story-editor__head row-between">
            <div className="flex-col gap-1">
                <div className="story-editor__eyebrow">{eyebrow}</div>
                <h1 className="story-editor__title">{title}</h1>
                {sub && <div className="story-editor__sub">{sub}</div>}
            </div>

            <div className="story-editor__actions row">
                <button className="btn btn--glass" onClick={onOpenBookView} title="Fullscreen book view">
                    Book View
                </button>
                <button className="btn btn--primary" onClick={onSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </header>
    );
}

function ChapterMeta({ chapterLabel, badgeLabel, hint }) {
    return (
        <>
            <div className="story-editor__chapter-row">
                <h2>{chapterLabel}</h2>
                {badgeLabel && <span className="story-editor__badge">{badgeLabel}</span>}
            </div>
            {hint && <p className="story-editor__hint">{hint}</p>}
        </>
    );
}

export default function StoryEditor({ onSave, onOpenBookView }) {
    const {
        sections,
        setSectionContentAtIndex,
        isSaving,
        saveStory,
        currentStory,
    } = useStoryContext();
    const {
        selectedBeatIndex,
        selectedChapterIndex,
        editingMode,
        groupedBeats,
    } = useEditorUIContext();

    const beats = groupedBeats || [];
    const currentBeat = beats[selectedBeatIndex];
    const currentChapter = currentBeat?.chapters[selectedChapterIndex];
    const sectionIndex = currentChapter?.index ?? 0;
    const currentSection = sections[sectionIndex];

    const eyebrow = getEyebrowText(editingMode, currentBeat);
    const headerTitle = emphasizeMidWord(currentStory?.title || 'Untitled');

    const chapterNumber = (currentChapter?.indexInBeat ?? selectedChapterIndex) + 1;
    const chapterLabel = currentChapter?.title || `Chapter ${chapterNumber}`;
    const badgeLabel = 'Draft';

    let headerContext = null;
    if (editingMode === 'chapter' && currentBeat?.title) {
        headerContext = `${currentBeat.title} · Chapter ${chapterNumber}`;
    } else if (editingMode === 'title') {
        headerContext = 'Story Title';
    } else if (editingMode === 'chapterHeading') {
        headerContext = 'Chapter Heading';
    }

    const handleSave = onSave || (() => saveStory());

    const wordCount = getWordCount(currentSection?.content);

    return (
        <section className="spatial-sidebar story-editor">
            <EditorHeader
                eyebrow={eyebrow}
                title={headerTitle}
                sub={headerContext}
                onOpenBookView={onOpenBookView}
                onSave={handleSave}
                isSaving={isSaving}
            />

            <div className="story-editor__writing-area">
                <div className="story-editor__writing-content">
                    <ChapterMeta
                        chapterLabel={chapterLabel}
                        badgeLabel={badgeLabel}
                        hint={currentSection?.guidance}
                    />

                    <div className="story-editor__canvas col-fill">
                        {currentSection && (
                            <LexicalEditor
                                value={currentSection.content}
                                onChange={(newContent) => setSectionContentAtIndex(sectionIndex, newContent)}
                                placeholder="Draft this chapter..."
                            />
                        )}
                    </div>
                </div>

                <div className="story-editor__status">
                    <span className="story-editor__status-word-count">{wordCount} words</span>
                    <span className="story-editor__status-save">
                        {isSaving ? 'Saving…' : 'Memory synced'}
                    </span>
                </div>
            </div>
        </section>
    );
}
