function walkLexicalNodes(nodes = [], out = []) {
    for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;

        if (typeof node.text === 'string' && node.text.length > 0) {
            out.push(node.text);
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
            walkLexicalNodes(node.children, out);
        }
    }

    return out;
}

function htmlToPlainText(html) {
    if (!html) return '';

    const text = String(html).trim();

    try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.root && Array.isArray(parsed.root.children)) {
            return walkLexicalNodes(parsed.root.children, []).join(' ').replace(/\s+/g, ' ').trim();
        }
    } catch {
        // Not JSON. Fall through to HTML parsing.
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

function findChapterSummary(chapterSummaries, activeSection) {
    if (!activeSection) return '';

    const byId = chapterSummaries.find(
        (chapter) => chapter.sectionId && chapter.sectionId === activeSection.id
    );
    if (byId) return byId.summary || '';

    const byBeatAndTitle = chapterSummaries.find(
        (chapter) =>
            chapter.beatKey === activeSection.beatKey &&
            chapter.chapterTitle === activeSection.title
    );
    if (byBeatAndTitle) return byBeatAndTitle.summary || '';

    return '';
}

function findBeatSummary(beatSummaries, activeSection) {
    if (!activeSection) return '';
    const match = beatSummaries.find((beat) => beat.beatKey === activeSection.beatKey);
    return match?.summary || '';
}

export function toPlainSections(sections) {
    return sections.map((section) => ({
        beatKey: section.beatKey,
        title: section.title,
        content: htmlToPlainText(section.content || ''),
    }));
}

export function buildSuggestionPayload({
    sections,
    plainSections,
    activeSectionIndex,
    activeStoryId,
    currentStory,
    feedbackType,
    aiMode,
    aiPrompt,
    promptOverride,
}) {
    const activeSection = sections[activeSectionIndex];
    const chapterSummaries = currentStory?.chapterSummaries || [];
    const beatSummaries = currentStory?.beatSummaries || [];

    const contextSummaries = {
        local: findChapterSummary(chapterSummaries, activeSection),
        mid: findBeatSummary(beatSummaries, activeSection),
        global: currentStory?.storySummary || currentStory?.storySummaryShort || '',
    };
    const customPrompt = promptOverride || (aiMode === 'tools' && !aiPrompt.trim() ? 'populate_facts' : aiPrompt);

    const basePayload = {
        storyId: activeStoryId,
        feedbackType,
        customPrompt,
        mode: aiMode,
        contextSummaries,
        storyText: plainSections[activeSectionIndex]?.content || '',
    };

    if (aiMode === 'tools') {
        return { ...basePayload, sections: plainSections, chapterSummaries };
    }
    return basePayload;
}