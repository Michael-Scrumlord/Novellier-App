import { useMemo } from 'react';
import { useStoryContext } from '../../contexts/StoryContext.jsx';
import { useEditorUIContext } from '../../contexts/EditorUIContext.jsx';
import { useBookPagination } from '../../hooks/useBookPagination.js';
import { useModalKeybindings } from '../../hooks/useModalKeybindings.js';
import './PagedBookViewEditor.css';

function PageContent({ blocks }) {
    return (
        <div className="paged-book-page-content">
            {(blocks || []).map((block, idx) => (
                <div
                    key={idx}
                    dangerouslySetInnerHTML={{ __html: block }}
                    className="paged-book-block"
                />
            ))}
        </div>
    );
}

export default function PagedBookViewEditor({ onClose }) {
    const {
        sections,
        currentStory,
        storyTitleHtml,
        chapterHeadingHtml,
        saveStory,
        isSaving,
    } = useStoryContext();
    const { activeSectionIndex } = useEditorUIContext();

    const storyTitle = currentStory?.title || 'Untitled';
    const selectedSectionIndex = activeSectionIndex ?? 0;

    const {
        pages,
        currentPageNumber,
        goToNextPage,
        goToPreviousPage,
        jumpToSection,
    } = useBookPagination({
        sections,
        storyTitle,
        storyTitleHtml,
        chapterHeadingHtml,
        initialSectionIndex: selectedSectionIndex,
    });

    const handleSave = () => saveStory();
    const handleChapterJump = (event) => jumpToSection(Number(event.target.value));

    const keybindings = useMemo(
        () => [
            { key: 'Escape', handler: onClose },
            { key: ['ArrowRight', 'PageDown'], handler: goToNextPage },
            { key: ['ArrowLeft', 'PageUp'], handler: goToPreviousPage },
            { key: 's', withMeta: true, handler: handleSave },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onClose, goToNextPage, goToPreviousPage, saveStory]
    );
    useModalKeybindings(keybindings);

    const currentLeftPage = pages[currentPageNumber];
    const currentRightPage = pages[currentPageNumber + 1];

    return (
        <div className="modal-shell paged-book-modal">
            <div className="modal-overlay" onClick={onClose} />
            <div className="glass-window paged-book-window">
                <div className="paged-book-header">
                    <div>
                        <h2 className="text-heading paged-book-title">{storyTitle}</h2>
                        <p className="text-muted paged-book-subtitle">Reading View</p>
                    </div>
                    <div className="paged-book-actions">
                        <select
                            className="spatial-select spatial-select--small"
                            onChange={handleChapterJump}
                            value={selectedSectionIndex}
                        >
                            {sections.map((section, index) => (
                                <option key={index} value={index}>
                                    {section.title || `Chapter ${index + 1}`}
                                </option>
                            ))}
                        </select>
                        <button className="btn btn--glass btn--icon" onClick={onClose} title="Close (ESC)">
                            X
                        </button>
                    </div>
                </div>

                <div className="paged-book-content">
                    <div className="paged-book-page paged-book-page--left">
                        <div className="paged-book-scroll-area">
                            {currentLeftPage && <PageContent blocks={currentLeftPage.blocks} />}
                        </div>
                        <div className="text-muted paged-book-page-num">{currentPageNumber + 1}</div>
                    </div>
                    <div className="paged-book-page">
                        <div className="paged-book-scroll-area">
                            {currentRightPage ? (
                                <PageContent blocks={currentRightPage.blocks} />
                            ) : (
                                <p className="text-muted paged-book-end-msg">End of story</p>
                            )}
                        </div>
                        <div className="text-muted paged-book-page-num">{currentPageNumber + 2}</div>
                    </div>
                </div>

                <div className="paged-book-footer">
                    <button
                        className="btn btn--glass"
                        onClick={goToPreviousPage}
                        disabled={currentPageNumber === 0}
                    >
                        ← Previous
                    </button>
                    <span className="text-muted">
                        Page <strong>{currentPageNumber + 1}</strong> -{' '}
                        <strong>{currentPageNumber + 2}</strong> of <strong>{pages.length}</strong>
                    </span>
                    <div className="paged-book-footer-actions">
                        <button className="btn btn--primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Progress'}
                        </button>
                        <button
                            className="btn btn--glass"
                            onClick={goToNextPage}
                            disabled={currentPageNumber + 2 >= pages.length}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
