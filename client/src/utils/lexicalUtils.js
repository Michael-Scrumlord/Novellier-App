export function getTextFromLexicalState(content) {
    try {
        if (!content) return '';
        const state = JSON.parse(content);
        let text = '';
        const extractText = (nodes) => {
            if (!Array.isArray(nodes)) return;
            nodes.forEach((node) => {
                if (node.text) text += node.text;
                if (node.children) extractText(node.children);
            });
        };
        extractText(state.root?.children);
        return text;
    } catch {
        return typeof content === 'string' ? content : '';
    }
}

export function getWordCount(content) {
    const text = getTextFromLexicalState(content);
    return text.trim() ? text.trim().split(/\s+/).length : 0;
}
