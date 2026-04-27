// Just a quick formatter that converts a list of retrieved document chunks into a single context string.
// Expects each entry to be { text, metadata } where metadata may carry sectionTitle and beatKey for better formatting.
export function formatRetrievalContext(docs) {
    return docs
        .map(({ text, metadata: meta }) => {
            if (meta?.sectionTitle) {
                return `[From: ${meta.sectionTitle}${meta.beatKey ? ` (${meta.beatKey})` : ''}]\n${text}`;
            }
            if (meta?.beatKey) {
                return `[From: ${meta.beatKey}]\n${text}`;
            }
            return text;
        })
        .join('\n\n');
}
