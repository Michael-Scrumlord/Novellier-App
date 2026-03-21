import { countWords } from './textUtils.js';

export function buildTitleHtml(titleValue) {
    return `<h1 class="book-title">${titleValue || 'Untitled draft'}</h1>`;
}

export function buildChapterHeadingHtml() {
    return '<h2 class="chapter-heading">Chapter {{number}}: {{title}}</h2>';
}

export function resolveChapterHeadingHtml(template, section, index) {
    const defaultTemplate = buildChapterHeadingHtml();
    const safeTemplate = template || defaultTemplate;
    const chapterNumber = index + 1;
    const chapterTitle = section?.title || `Chapter ${chapterNumber}`;
    return safeTemplate
        .replace(/\{\{\s*number\s*\}\}/g, String(chapterNumber))
        .replace(/\{\{\s*title\s*\}\}/g, chapterTitle);
}

export function buildStoryContent(sections, chapterHeadingHtml) {
    const defaultHeading = buildChapterHeadingHtml();
    const template = chapterHeadingHtml || defaultHeading;
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

export function buildHorrorChapterContent(beatLabel, chapterNumber, targetWords = 900) {
    const protagonist = 'Maya Reyes';
    const campus = 'California State University, Fullerton';
    const major = 'software engineering';
    const baseLines = [
        `${protagonist} kept her hoodie zipped tight as the night fog drifted across the quad at ${campus}.`,
        `Every lab light that should have been off glowed a dim amber, as if the campus itself was exhaling.`,
        `Her notebook read like a bug report, but the errors were in her life, not her code.`,
        `She was a ${major} student, the kind who counted steps and serial numbers when the world felt wrong.`,
        `Something in the old engineering hall hummed between fan noise and a whisper she could not debug.`,
        `She told herself fear was just corrupted input and walked toward it anyway.`
    ];
    const beatLines = [
        `The moment echoed with ${beatLabel.toLowerCase()}, as if the building knew the outline of her story.`,
        `She felt the beat land like a newline in a failing program, a pause where the horror could breathe.`,
        `The campus map on her phone spun once, then pointed her back to the same locked door.`,
        `The air smelled of ozone and old paper, the two scents that haunted every late-night sprint.`
    ];

    const paragraphs = [];
    let words = 0;
    let idx = 0;

    while (words < targetWords) {
        const lineSet = idx % 2 === 0 ? baseLines : beatLines;
        const paragraph = lineSet
        .map((line, lineIdx) =>
            lineIdx === 2 ? `${line} Chapter ${chapterNumber} left her hands shaking.` : line
        )
        .join(' ');
        paragraphs.push(paragraph);
        words += countWords(paragraph);
        idx += 1;
    }

    return paragraphs.join('\n\n');
}
