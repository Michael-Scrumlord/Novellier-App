export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function htmlToPlainText(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
