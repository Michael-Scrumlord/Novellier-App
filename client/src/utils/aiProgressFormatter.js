function pluralizeFacts(count) {
    return `${count ?? 0} fact${count === 1 ? '' : 's'}`;
}

function percentOfRange(index, total, ceiling = 100) {
    if (!total) return null;
    return Math.round((index / total) * ceiling);
}

export function formatProgress(progress) {
    if (!progress?.kind) return null;

    switch (progress.kind) {
        case 'populate_simple_start':
            return { label: 'Extracting facts from chapter summaries...', sub: null, percent: null };
        case 'populate_simple_complete':
            return { label: `Added ${pluralizeFacts(progress.added)}`, sub: null, percent: 100 };

        case 'populate_chapter_start':
            return {
                label: `Chapter ${progress.index} of ${progress.total}`,
                sub: progress.chunks > 1 ? `${progress.chunks} chunks` : null,
                percent: percentOfRange(progress.index - 1, progress.total),
            };
        case 'populate_chapter_complete':
            return {
                label: `Chapter ${progress.index} of ${progress.total} complete`,
                sub: null,
                percent: percentOfRange(progress.index, progress.total),
            };

        case 'populate_chunk_start':
            return {
                label: `Chapter ${progress.chapterIndex} — extracting chunk ${progress.chunkIndex}/${progress.chunkCount}`,
                sub: null,
                percent: null,
            };
        case 'populate_chunk_complete':
            return {
                label: `Chapter ${progress.chapterIndex} — chunk ${progress.chunkIndex}/${progress.chunkCount} done`,
                sub: null,
                percent: null,
            };

        case 'populate_consolidate_start':
            return { label: `Consolidating ${progress.count} candidate facts...`, sub: null, percent: null };
        case 'populate_consolidate_complete':
            return { label: `Kept ${progress.kept} unique facts`, sub: null, percent: null };

        case 'populate_verify_start':
            return {
                label: `Verifying ${progress.index}/${progress.total}`,
                sub: progress.fact,
                percent: percentOfRange(progress.index - 1, progress.total),
            };
        case 'populate_verify_complete':
            return {
                label: `Verified ${progress.index}/${progress.total}${progress.accepted ? ' ✓' : ' ✕'}`,
                sub: progress.fact,
                percent: percentOfRange(progress.index, progress.total),
            };

        case 'section_chunk_start':
            return {
                label: `Section — extracting chunk ${progress.chunkIndex}/${progress.chunkCount}`,
                sub: null,
                percent: percentOfRange(progress.chunkIndex - 1, progress.chunkCount),
            };
        case 'section_chunk_complete':
            return {
                label: `Section — chunk ${progress.chunkIndex}/${progress.chunkCount} done`,
                sub: null,
                percent: percentOfRange(progress.chunkIndex, progress.chunkCount, 80),
            };

        case 'section_consolidate_start':
            return { label: `Consolidating ${progress.count} candidate facts...`, sub: null, percent: 85 };
        case 'section_consolidate_complete':
            return { label: `Added ${pluralizeFacts(progress.added)} from section`, sub: null, percent: 100 };

        default:
            return null;
    }
}