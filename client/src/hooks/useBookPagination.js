import { useMemo, useState } from 'react';
import { paginateStory, snapToSpread } from '../utils/pagination.js';

export function useBookPagination({
    sections,
    storyTitle,
    storyTitleHtml,
    chapterHeadingHtml,
    initialSectionIndex,
}) {
    const { pages, chapterPageMap } = useMemo(
        () => paginateStory({ sections, storyTitle, storyTitleHtml, chapterHeadingHtml }),
        [sections, storyTitle, storyTitleHtml, chapterHeadingHtml]
    );

    const [currentPageNumber, setCurrentPageNumber] = useState(() =>
        snapToSpread(chapterPageMap[initialSectionIndex] ?? 0)
    );

    const [trackedSectionIndex, setTrackedSectionIndex] = useState(initialSectionIndex);
    if (trackedSectionIndex !== initialSectionIndex) {
        setTrackedSectionIndex(initialSectionIndex);
        setCurrentPageNumber(snapToSpread(chapterPageMap[initialSectionIndex] ?? 0));
    }

    const goToNextPage = () => {
        setCurrentPageNumber((prev) => Math.min(prev + 2, pages.length - 1));
    };

    const goToPreviousPage = () => {
        setCurrentPageNumber((prev) => Math.max(prev - 2, 0));
    };

    const jumpToSection = (sectionIndex) => {
        setCurrentPageNumber(snapToSpread(chapterPageMap[sectionIndex] ?? 0));
    };

    return {
        pages,
        chapterPageMap,
        currentPageNumber,
        goToNextPage,
        goToPreviousPage,
        jumpToSection,
    };
}