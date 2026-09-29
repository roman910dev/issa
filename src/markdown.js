import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function renderMarkdown(markdown) {
  // Parse the whole document so links defined in later blocks still resolve.
  const html = marked.parse(markdown, { gfm: true });
  const safeHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  });
  const template = document.createElement('template');
  template.innerHTML = safeHtml;

  return [...template.content.childNodes].flatMap(node => {
    if (node.nodeType === 1) {
      if (node.tagName === 'TABLE') {
        const wrapper = document.createElement('div');
        wrapper.className = 'reading-block table-scroll';
        wrapper.append(node);
        return [wrapper];
      }
      node.classList.add('reading-block');
      return [node];
    }
    if (!node.textContent.trim()) return [];
    const paragraph = document.createElement('p');
    paragraph.className = 'reading-block';
    paragraph.textContent = node.textContent;
    return [paragraph];
  });
}
