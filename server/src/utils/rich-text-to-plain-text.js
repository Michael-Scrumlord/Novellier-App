function walkLexicalNodes(nodes = [], out = []) {
    for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;

        if (typeof node.text === 'string' && node.text.length > 0) {
            out.push(node.text);
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
            walkLexicalNodes(node.children, out);
            if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'listitem') {
                out.push('\n');
            }
        }
    }

    return out;
}

function stripHtml(html) {
    return html
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/\s*p\s*>/gi, '\n')
        .replace(/<\s*\/\s*div\s*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ');
}

function normalizeWhitespace(text) {
    return text
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[\t ]+/g, ' ')
        .trim();
}

export function richTextToPlainText(input) {
    if (input == null) return '';

    if (typeof input !== 'string') {
        return normalizeWhitespace(String(input));
    }

    const text = input.trim();
    if (!text) return '';

    try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.root && Array.isArray(parsed.root.children)) {
            const lexicalText = walkLexicalNodes(parsed.root.children, []).join(' ');
            return normalizeWhitespace(lexicalText);
        }
    } catch {
        // Not Lexical JSON, continue.
    }

    if (/[<][^>]+[>]/.test(text)) {
        return normalizeWhitespace(stripHtml(text));
    }

    return normalizeWhitespace(text);
}
