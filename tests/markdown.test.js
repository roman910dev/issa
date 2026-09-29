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
