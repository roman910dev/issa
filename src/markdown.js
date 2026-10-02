import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function renderMarkdown(markdown) {
  // Only a complete, leading frontmatter block is metadata; leave other Markdown alone.
  const frontmatter = markdown.match(/^\uFEFF?---[ \t]*\r?\n((?:[^\n]*\n)*?)---[ \t]*(?:\r?\n|$)/);
  const frontmatterBlocks = [];
  if (frontmatter) {
    const paragraph = document.createElement('p');
    paragraph.className = 'reading-block frontmatter';
    paragraph.textContent = frontmatter[1].replace(/\r?\n$/, '');
    const opening = document.createElement('hr');
    const closing = document.createElement('hr');
    opening.className = closing.className = 'reading-block';
    frontmatterBlocks.push(opening, ...(paragraph.textContent ? [paragraph] : []), closing);
    markdown = markdown.slice(frontmatter[0].length);
  }

  // Parse the whole document so links defined in later blocks still resolve.
  const html = marked.parse(markdown, { gfm: true });
  const safeHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style'],
  });
  const template = document.createElement('template');
  template.innerHTML = safeHtml;

  const blocks = [...template.content.childNodes].flatMap(node => {
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
  return [...frontmatterBlocks, ...blocks];
}
