import { escapeHtml } from './stringUtils.js';

export function getStoryProgress(story) {
    const total = story?.sections?.length || 0;
    if (total === 0) return 0;
    const completed = story.sections.filter(
        (section) => section.content && section.content.trim().length > 0
    ).length;
    return Math.round((completed / total) * 100);
}

export function buildTitleHtml(titleValue) {
    return `<h1 class="book-title">${escapeHtml(titleValue || 'Untitled draft')}</h1>`;
}

const DEFAULT_CHAPTER_HEADING = '<h2 class="chapter-heading">Chapter {{number}}: {{title}}</h2>';

export function buildChapterHeadingHtml() {
    return DEFAULT_CHAPTER_HEADING;
}

function resolveChapterHeadingHtml(template, section, index) {
    const safeTemplate = template || DEFAULT_CHAPTER_HEADING;
    const chapterNumber = index + 1;
    const chapterTitle = escapeHtml(section?.title || `Chapter ${chapterNumber}`);
    return safeTemplate
        .replace(/\{\{\s*number\s*\}\}/g, String(chapterNumber))
        .replace(/\{\{\s*title\s*\}\}/g, chapterTitle);
}

export function buildStoryContent(sections, chapterHeadingHtml) {
    const template = chapterHeadingHtml || DEFAULT_CHAPTER_HEADING;
    return sections
        .map((section, index) => {
            const headingHtml = resolveChapterHeadingHtml(template, section, index);
            return `${headingHtml}${section.content || ''}`;
        })
        .join('');
}

export function getActiveSectionIndex(sections, selectedBeatIndex, selectedChapterIndex) {
    const beatGroups = {};
    sections.forEach((section, index) => {
        if (!beatGroups[section.beatKey]) {
            beatGroups[section.beatKey] = [];
        }
        beatGroups[section.beatKey].push(index);
    });
    const beats = Object.values(beatGroups);
    const targetBeat = beats[selectedBeatIndex];
    return targetBeat?.[selectedChapterIndex] ?? 0;
}