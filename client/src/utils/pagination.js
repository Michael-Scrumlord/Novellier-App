import { escapeHtml } from './stringUtils.js';
import {
    createEditor,
    $generateHtmlFromNodes,
    HeadingNode,
    QuoteNode,
    AutoLinkNode,
    LinkNode,
    ListNode,
    ListItemNode,
} from '../lib/lexical-bundle.js';

const WORDS_PER_PAGE = 300;
const DEFAULT_CHAPTER_HEADING = '<h2 class="chapter-heading">Chapter {{number}}: {{title}}</h2>';

const HTML_RENDER_EDITOR = createEditor({
    nodes: [HeadingNode, ListNode, ListItemNode, QuoteNode, AutoLinkNode, LinkNode],
});

export function renderLexicalHtml(content) {
    if (!content) return '';
    try {
        const editorState = HTML_RENDER_EDITOR.parseEditorState(content);
        HTML_RENDER_EDITOR.setEditorState(editorState);
        let html = '';
        editorState.read(() => {
            html = $generateHtmlFromNodes(HTML_RENDER_EDITOR, null);
        });
        return html;
    } catch {
        return '';
    }
}

export function resolveTitleHtml(storyTitleHtml, storyTitle) {
    if (storyTitleHtml && storyTitleHtml.trim().length > 0) {
        return storyTitleHtml;
    }
    return `<h1 class="book-title">${escapeHtml(storyTitle)}</h1>`;
}

export function resolveChapterHeading(section, index, chapterHeadingHtml) {
    const template = chapterHeadingHtml || DEFAULT_CHAPTER_HEADING;
    const chapterNumber = index + 1;
    const chapterTitle = escapeHtml(section?.title || `Chapter ${chapterNumber}`);
    return template
        .replace(/\{\{\s*number\s*\}\}/g, String(chapterNumber))
        .replace(/\{\{\s*title\s*\}\}/g, chapterTitle);
}

function countWords(text) {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function blocksFromHtml(html) {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.childNodes || []);
    return nodes.map((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            return { html: node.outerHTML, text: node.textContent || '' };
        }
        const text = node.textContent || '';
        return { html: `<p>${text}</p>`, text };
    });
}
// Builds the paginated layout for the reading view. It's a best effort feature, not a huge deal if this doesn't look quite right.
export function paginateStory({ sections, storyTitleHtml, storyTitle, chapterHeadingHtml }) {
    const pages = [];
    const chapterPageMap = {};
    let currentPage = { blocks: [], wordCount: 0 };

    const titleBlocks = blocksFromHtml(resolveTitleHtml(storyTitleHtml, storyTitle));
    titleBlocks.forEach((block) => {
        currentPage.blocks.push(block.html);
        currentPage.wordCount += countWords(block.text);
    });

    sections.forEach((section, sectionIdx) => {
        const chapterHeading = resolveChapterHeading(section, sectionIdx, chapterHeadingHtml);
        const headingBlocks = blocksFromHtml(chapterHeading);
        const contentBlocks = blocksFromHtml(renderLexicalHtml(section.content));

        headingBlocks.concat(contentBlocks).forEach((block) => {
            const words = countWords(block.text);

            if (chapterPageMap[sectionIdx] === undefined) {
                chapterPageMap[sectionIdx] = pages.length;
            }

            if (currentPage.wordCount + words > WORDS_PER_PAGE && currentPage.blocks.length > 0) {
                pages.push({ ...currentPage });
                currentPage = { blocks: [], wordCount: 0 };
            }

            currentPage.blocks.push(block.html);
            currentPage.wordCount += words;
        });
    });

    if (currentPage.blocks.length > 0) {
        pages.push(currentPage);
    }

    return { pages, chapterPageMap };
}

export function snapToSpread(pageIndex) {
    if (pageIndex % 2 === 0) return pageIndex;
    return Math.max(pageIndex - 1, 0);
}