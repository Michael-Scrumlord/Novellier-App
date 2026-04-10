export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

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

export function htmlToPlainText(html) {
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
