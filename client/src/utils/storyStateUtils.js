import { DEFAULT_SECTION } from '../lib/storyTemplates.js';

export function getGroupedBeats(sectionsList) {
    const beatGroups = {};
    sectionsList.forEach((section, index) => {
        if (!beatGroups[section.beatKey]) {
            const safeTitle = section.title || 'Untitled Chapter';
            const beatTitle = safeTitle.replace(/\s*-\s*Chapter\s+\d+\s*$/i, '');
            beatGroups[section.beatKey] = {
                beatKey: section.beatKey,
                title: section.beatTitle || beatTitle,
                guidance: section.guidance || '',
                chapters: [],
            };
        }
        beatGroups[section.beatKey].chapters.push({
            index,
            chapterIdx: beatGroups[section.beatKey].chapters.length,
            title: section.title || `Chapter ${beatGroups[section.beatKey].chapters.length + 1}`,
            content: section.content || '',
            id: section.id || `temp-id-${index}`,
        });
    });
    return Object.values(beatGroups);
}

// Adds a chapter to the beat at beatIndex.
export function handleAddChapter(sections, beatIndex, beats) {
    const resolvedBeats = beats || getGroupedBeats(sections);
    const targetBeat = resolvedBeats[beatIndex];
    if (!targetBeat) return sections;

    const newChapterNum = targetBeat.chapters.length + 1;
    const newChapter = {
        ...DEFAULT_SECTION,
        id: `${targetBeat.beatKey}-ch${newChapterNum}`,
        beatKey: targetBeat.beatKey,
        beatTitle: targetBeat.title,
        title: `${targetBeat.title} - Chapter ${newChapterNum}`,
        guidance: targetBeat.guidance,
    };

    const lastIdx = targetBeat.chapters[targetBeat.chapters.length - 1]?.index ?? sections.length - 1;
    const next = [...sections];
    next.splice(lastIdx + 1, 0, newChapter);
    return next;
}

export function handleAddBeat(sections) {
    const beats = getGroupedBeats(sections);
    const newBeatNum = beats.length + 1;
    const newBeatKey = `part-${Date.now()}`;

    const newChapter = {
        ...DEFAULT_SECTION,
        id: `${newBeatKey}-ch-1`,
        beatKey: newBeatKey,
        beatTitle: `Part ${newBeatNum}`,
        title: `Part ${newBeatNum} - Chapter 1`,
        guidance: '',
        content: '',
    };
    return [...sections, newChapter];
}
// Deletes the chapter at chapterIdx
export function handleDeleteChapter(sections, beatIndex, chapterIdx, currentBeatIdx, currentChapterIdx, beats) {
    const resolvedBeats = beats || getGroupedBeats(sections);
    const targetBeat = resolvedBeats[beatIndex];
    if (!targetBeat || targetBeat.chapters.length <= 1) {
        return { newSections: sections, nextChapterIndex: currentChapterIdx };
    }

    const sectionIndexToRemove = targetBeat.chapters[chapterIdx].index;
    const nextSections = [...sections];
    nextSections.splice(sectionIndexToRemove, 1);

    let nextChapterIndex = currentChapterIdx;
    if (currentBeatIdx === beatIndex && currentChapterIdx >= chapterIdx) {
        nextChapterIndex = Math.max(0, currentChapterIdx - 1);
    }

    return { newSections: nextSections, nextChapterIndex };
}

export function handleSetSectionContent(sections, index, content) {
    const nextSections = [...sections];
    if (nextSections[index]) {
        nextSections[index] = { ...nextSections[index], content };
    }
    return nextSections;
}
