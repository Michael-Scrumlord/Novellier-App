export function truncateAtBoundary(text, maxChars) {
    if (!text || text.length <= maxChars) return text || '';

    const sliced = text.slice(0, maxChars);
    const lastBoundary = Math.max(
        sliced.lastIndexOf('. '),
        sliced.lastIndexOf('\n'),
        sliced.lastIndexOf(' ')
    );

    if (lastBoundary <= 0) return `${sliced.trim()}...`;
    return `${sliced.slice(0, lastBoundary).trim()}...`;
}

export function chunkText(text, chunkSize = 1600, overlap = 200) {
    if (!text || text.length <= chunkSize) return [text || ''];

    const chunks = [];
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);

        if (end < text.length) {
            const boundary = Math.max(
                text.lastIndexOf('\n', end),
                text.lastIndexOf('. ', end),
                text.lastIndexOf(' ', end)
            );
            if (boundary > start + Math.floor(chunkSize * 0.6)) {
                end = boundary;
            }
        }

        const chunk = text.slice(start, end).trim();
        if (chunk) chunks.push(chunk);

        if (end >= text.length) break;

        start = Math.max(end - overlap, start + 1);
    }

    return chunks;
}

export function clipText(text, maxChars) {
    if (!text || text.length <= maxChars) return text || '';

    const sliced = text.slice(0, maxChars);
    const lastSpace = sliced.lastIndexOf(' ');
    const safeSlice = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;

    return `${safeSlice.trim()}...`;
}
