import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = window;
globalThis.document = window.document;
const { renderMarkdown } = await import('../src/markdown.js');

test('renders reference links, tables, and code as selectable reading blocks', () => {
  const markdown = `# Title

[A reference][guide] appears before its definition.

| Name | Value |
| --- | --- |
| One | 1 |

\`\`\`js
const value = 1;
\`\`\`

[guide]: https://example.com/guide`;
  const blocks = renderMarkdown(markdown);
  assert.deepEqual(blocks.map(block => block.tagName), ['H1', 'P', 'DIV', 'PRE']);
  assert.ok(blocks.every(block => block.classList.contains('reading-block')));
  assert.equal(blocks[1].querySelector('a').href, 'https://example.com/guide');
  assert.equal(blocks[2].querySelector('table').querySelectorAll('tr').length, 2);
  assert.equal(blocks[3].textContent.trim(), 'const value = 1;');
});

test('removes executable HTML and unsafe links from pasted Markdown', () => {
  const blocks = renderMarkdown('<img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1))\n\n<script>alert(2)</script>\n\n<style>body { display: none }</style>');
  const article = document.createElement('article');
  article.replaceChildren(...blocks);
  assert.equal(article.querySelector('[onerror], script, style, a[href^="javascript:"]'), null);
});

test('renders leading frontmatter as literal body text between dividers', () => {
  const metadata = 'title: My document\ntags:\n  - reading\nsummary: "**plain text** <img src=x onerror=alert(1)>"';
  const blocks = renderMarkdown(`---\n${metadata}\n---\n\n# Title\n\n[A reference][guide]\n\n[guide]: https://example.com/guide`);
  assert.deepEqual(blocks.map(block => block.tagName), ['HR', 'P', 'HR', 'H1', 'P']);
  assert.ok(blocks.every(block => block.classList.contains('reading-block')));
  assert.ok(blocks[1].classList.contains('frontmatter'));
  assert.equal(blocks[1].textContent, metadata);
  assert.equal(blocks[1].children.length, 0);
  assert.equal(blocks[4].querySelector('a').href, 'https://example.com/guide');
});

test('recognizes frontmatter with Windows line endings, a BOM, and a closing divider at EOF', () => {
  const blocks = renderMarkdown('\uFEFF---  \r\ntitle: Document\r\nauthor: Someone\r\n---\t');
  assert.deepEqual(blocks.map(block => block.tagName), ['HR', 'P', 'HR']);
  assert.equal(blocks[1].textContent, 'title: Document\r\nauthor: Someone');
});

test('renders empty frontmatter as two dividers', () => {
  const blocks = renderMarkdown('---\n---\n\nBody');
  assert.deepEqual(blocks.map(block => block.tagName), ['HR', 'HR', 'P']);
  assert.equal(blocks[2].textContent, 'Body');
});

test('preserves ordinary headings, dividers, and unclosed frontmatter', () => {
  for (const markdown of ['Title\n---', 'Body\n\n---\n\nOther\n---', '---\ntitle: Document']) {
    const blocks = renderMarkdown(markdown);
    assert.ok(blocks.every(block => !block.classList.contains('frontmatter')));
  }
  assert.equal(renderMarkdown('Title\n---')[0].tagName, 'H2');
  assert.deepEqual(renderMarkdown('---\ntitle: Document').map(block => block.tagName), ['HR', 'P']);
});
