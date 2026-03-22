import { useState, useEffect, useMemo } from 'react';
import { createEditor } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';

const WORDS_PER_PAGE = 300; 

export default function PagedBookViewEditor({ storyCtx }) {
    const {
        sections,
        currentStory,
        storyTitleHtml,
        chapterHeadingHtml,
        setBookViewOpen,
        setSectionContentAtIndex,
        saveStory,
    } = storyCtx;

    const storyTitle = currentStory?.title || 'Untitled';
    const selectedSectionIndex = storyCtx.getActiveSectionIndex ? storyCtx.getActiveSectionIndex(sections) : 0;

    const [currentPageNumber, setCurrentPageNumber] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [pages, setPages] = useState([]);
    const [chapterPageMap, setChapterPageMap] = useState({});

    const renderLexicalHtml = (content) => {
        if (!content) return '';
        try {
            const editor = createEditor({
                nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode, TableNode, TableRowNode, TableCellNode, AutoLinkNode, LinkNode]
            });
            const editorState = editor.parseEditorState(content);
            editor.setEditorState(editorState);

            let html = '';
            editorState.read(() => { html = $generateHtmlFromNodes(editor, null); });
            return html;
        } catch (error) {
            return content; 
        }
    };

    const resolveTitleHtml = () => {
        if (storyTitleHtml && storyTitleHtml.trim().length > 0) return storyTitleHtml;
        return `<h1 class="book-title">${storyTitle}</h1>`;
    };

    const resolveChapterHeading = (section, index) => {
        const template = chapterHeadingHtml || '<h2 class="chapter-heading">Chapter {{number}}: {{title}}</h2>';
        const chapterNumber = index + 1;
        const chapterTitle = section?.title || `Chapter ${chapterNumber}`;
        return template
            .replace(/\{\{\s*number\s*\}\}/g, String(chapterNumber))
            .replace(/\{\{\s*title\s*\}\}/g, chapterTitle);
    };

    const getBlocksFromHtml = (html) => {
        if (!html) return [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nodes = Array.from(doc.body.childNodes || []);
        return nodes.map((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) return { html: node.outerHTML, text: node.textContent || '' };
            const text = node.textContent || '';
            return { html: `<p>${text}</p>`, text };
        });
    };

    useEffect(() => {
        const allPages = [];
        const pageMap = {};
        let currentPage = { blocks: [], wordCount: 0 };

        const titleBlocks = getBlocksFromHtml(resolveTitleHtml());
        titleBlocks.forEach((block) => {
            currentPage.blocks.push(block.html);
            currentPage.wordCount += block.text.split(/\s+/).filter((w) => w.length > 0).length;
        });

        sections.forEach((section, sectionIdx) => {
            const chapterHeading = resolveChapterHeading(section, sectionIdx);
            const headingBlocks = getBlocksFromHtml(chapterHeading);
            const html = renderLexicalHtml(section.content);
            const blocks = getBlocksFromHtml(html);

            headingBlocks.concat(blocks).forEach((block) => {
                const words = block.text.split(/\s+/).filter((w) => w.length > 0).length;
                if (pageMap[sectionIdx] === undefined) pageMap[sectionIdx] = allPages.length;

                if (currentPage.wordCount + words > WORDS_PER_PAGE && currentPage.blocks.length > 0) {
                    allPages.push({ ...currentPage });
                    currentPage = { blocks: [], wordCount: 0 };
                }
                currentPage.blocks.push(block.html);
                currentPage.wordCount += words;
            });
        });

        if (currentPage.blocks.length > 0) allPages.push(currentPage);

        setPages(allPages);
        setChapterPageMap(pageMap);
        
        const startPage = pageMap[selectedSectionIndex] ?? 0;
        setCurrentPageNumber(startPage % 2 === 0 ? startPage : Math.max(startPage - 1, 0));
    }, [sections, selectedSectionIndex, storyTitle, storyTitleHtml, chapterHeadingHtml]);

    const handleSave = async () => {
        setIsSaving(true);
        try { await saveStory(); } finally { setIsSaving(false); }
    };

    const handleClose = () => setBookViewOpen(false);
    const goToNextPage = () => setCurrentPageNumber((prev) => Math.min(prev + 2, pages.length - 1));
    const goToPreviousPage = () => setCurrentPageNumber((prev) => Math.max(prev - 2, 0));

    const handleChapterJump = (event) => {
        const sectionIndex = Number(event.target.value);
        const startPage = chapterPageMap[sectionIndex] ?? 0;
        setCurrentPageNumber(startPage % 2 === 0 ? startPage : Math.max(startPage - 1, 0));
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
            if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goToNextPage(); }
            if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goToPreviousPage(); }
            if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pages, handleClose, handleSave]);

    const currentLeftPage = pages[currentPageNumber];
    const currentRightPage = pages[currentPageNumber + 1];

    return (
        <div className="modal-container" style={{ zIndex: 2000 }}>
            <div className="modal-overlay" onClick={handleClose} />
            <div className="glass-window" style={{ width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                      <h2 className="text-heading" style={{ fontSize: '1.5rem' }}>{storyTitle}</h2>
                      <p className="text-muted" style={{ margin: 0 }}>Reading View</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <select className="spatial-select spatial-select--small" onChange={handleChapterJump} value={selectedSectionIndex}>
                        {sections.map((section, index) => (
                          <option key={index} value={index}>{section.title || `Chapter ${index + 1}`}</option>
                        ))}
                      </select>
                      <button className="btn btn--glass btn--icon" onClick={handleClose} title="Close (ESC)">X</button>
                  </div>
                </div>
                {/* Left Page */}
                <div style={{ flex: 1, display: 'flex', background: 'var(--card-bg)', overflow: 'hidden' }}>    
                    <div style={{ flex: 1, padding: '3rem 4rem', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-subtle)' }}>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {currentLeftPage && <PageContent blocks={currentLeftPage.blocks} />}
                      </div>
                      <div className="text-muted" style={{ textAlign: 'center', marginTop: '1rem' }}>{currentPageNumber + 1}</div>
                    </div>
                  {/* Right Page */ }
                    <div style={{ flex: 1, padding: '3rem 4rem', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        {currentRightPage ? <PageContent blocks={currentRightPage.blocks} /> : <p className="text-muted" style={{textAlign: 'center', marginTop: '5rem'}}>End of story</p>}
                      </div>
                      <div className="text-muted" style={{ textAlign: 'center', marginTop: '1rem' }}>{currentPageNumber + 2}</div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn btn--glass" onClick={goToPreviousPage} disabled={currentPageNumber === 0}>← Previous</button>
                    
                    <span className="text-muted">
                        Page <strong>{currentPageNumber + 1}</strong> - <strong>{currentPageNumber + 2}</strong> of <strong>{pages.length}</strong>
                    </span>
                    
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn--primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Progress'}
                        </button>
                        <button className="btn btn--glass" onClick={goToNextPage} disabled={currentPageNumber + 2 >= pages.length}>Next →</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PageContent({ blocks }) {
    return (
        <div className="page-content" style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--ink)' }}>
            {(blocks || []).map((block, idx) => (
              <div key={idx} dangerouslySetInnerHTML={{ __html: block }} style={{ marginBottom: '1rem' }} />
            ))}
        </div>
    );
}