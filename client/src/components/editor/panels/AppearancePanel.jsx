import { useState } from 'react';
import AppearanceInspector from '../AppearanceInspector.jsx';
import { escapeHtml } from '../../../utils/stringUtils.js';

const DEFAULT_TITLE_STYLE = {
    font: 'Cormorant Garamond, serif',
    size: '2.5rem',
    color: '#f5f2e8',
    imageUrl: '',
};

const DEFAULT_HEADING_STYLE = {
    font: 'Cormorant Garamond, serif',
    size: '1.8rem',
    color: '#f5f2e8',
    imageUrl: '',
};

function buildTitleTemplate(titleValue, style) {
    const safeTitle = escapeHtml(titleValue || 'Untitled draft');
    const safeFont = escapeHtml(style.font || 'serif');
    const safeSize = escapeHtml(style.size || '2.5rem');
    const safeColor = escapeHtml(style.color || '#f5f2e8');
    const background = style.imageUrl
        ? `background-image:url('${encodeURI(style.imageUrl)}');background-size:cover;background-position:center;`
        : '';
    return `<h1 class="book-title" style="font-family:${safeFont};font-size:${safeSize};color:${safeColor};${background}padding:1rem;border-radius:12px;">${safeTitle}</h1>`;
}

function buildHeadingTemplate(style) {
    const safeFont = escapeHtml(style.font || 'serif');
    const safeSize = escapeHtml(style.size || '1.8rem');
    const safeColor = escapeHtml(style.color || '#f5f2e8');
    const background = style.imageUrl
        ? `background-image:url('${encodeURI(style.imageUrl)}');background-size:cover;background-position:center;`
        : '';
    return `<h2 class="chapter-heading" style="font-family:${safeFont};font-size:${safeSize};color:${safeColor};${background}padding:0.4rem 0.8rem;border-radius:10px;">Chapter {{number}}: {{title}}</h2>`;
}

export default function AppearancePanel({
    editingMode,
    titleValue,
    setTitle,
    setStoryTitleHtml,
    setChapterHeadingHtml,
    onSelectMode,
}) {
    const [titleStyle, setTitleStyle] = useState(DEFAULT_TITLE_STYLE);
    const [headingStyle, setHeadingStyle] = useState(DEFAULT_HEADING_STYLE);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [inspectorMode, setInspectorMode] = useState('title');

    const openInspector = (mode) => {
        setInspectorMode(mode);
        onSelectMode(mode === 'title' ? 'title' : 'chapterHeading');
        setInspectorOpen(true);
    };

    const handleSetTitle = (val) => {
        setTitle?.(val);
        setStoryTitleHtml?.(buildTitleTemplate(val, titleStyle));
    };

    const handleApply = () => {
        if (inspectorMode === 'title') {
            setStoryTitleHtml?.(buildTitleTemplate(titleValue, titleStyle));
        } else {
            setChapterHeadingHtml?.(buildHeadingTemplate(headingStyle));
        }
    };

    const isTitle = inspectorMode === 'title';

    return (
        <>
            <div className="beat-group">
                <button
                    className={`beat-group__header row${editingMode === 'title' ? ' beat-group__header--active' : ''}`}
                    onClick={() => openInspector('title')}
                >
                    <span className="beat-group__label">Story Title</span>
                    <span className="beat-group__nav-hint">›</span>
                </button>
            </div>

            <div className="beat-group">
                <button
                    className={`beat-group__header row${editingMode === 'chapterHeading' ? ' beat-group__header--active' : ''}`}
                    onClick={() => openInspector('chapterHeading')}
                >
                    <span className="beat-group__label">Chapter Headings</span>
                    <span className="beat-group__nav-hint">›</span>
                </button>
            </div>

            <AppearanceInspector
                isOpen={inspectorOpen}
                onClose={() => setInspectorOpen(false)}
                mode={inspectorMode}
                titleValue={titleValue}
                setTitle={handleSetTitle}
                style={isTitle ? titleStyle : headingStyle}
                setStyle={isTitle ? setTitleStyle : setHeadingStyle}
                onApply={handleApply}
            />
        </>
    );
}
