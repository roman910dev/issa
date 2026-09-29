const storageKey = 'issa:source';
const editor = document.querySelector('#editor');
const reader = document.querySelector('#reader');
const source = document.querySelector('#source');
const article = document.querySelector('#article');
const position = document.querySelector('#position');
const saveStatus = document.querySelector('#save-status');
let blocks = [];
let selectedIndex = 0;
let userScrollUntil = 0;
let pendingFrame = 0;

try { source.value = localStorage.getItem(storageKey) || ''; }
catch { saveStatus.textContent = 'Browser storage unavailable'; }
source.addEventListener('input', () => {
  try { localStorage.setItem(storageKey, source.value); saveStatus.textContent = 'Saved on this device'; }
  catch { saveStatus.textContent = 'Browser storage unavailable'; }
});

document.querySelector('#read-button').addEventListener('click', () => {
  if (!source.value.trim()) { source.focus(); return; }
  article.innerHTML = renderMarkdown(source.value);
  blocks = [...article.querySelectorAll('.reading-block')];
  selectedIndex = 0;
  editor.hidden = true;
  reader.hidden = false;
  window.scrollTo(0, 0);
  setSelected(0);
});
document.querySelector('#edit-button').addEventListener('click', () => {
  reader.hidden = true;
  editor.hidden = false;
  window.scrollTo(0, 0);
  source.focus();
});
document.querySelector('#top-button').addEventListener('click', () => {
  setSelected(0);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
article.addEventListener('click', event => {
  const block = event.target.closest('.reading-block');
  if (!block || !article.contains(block)) return;
  const index = blocks.indexOf(block);
  if (index !== -1) setSelected(index);
});

// Speak Screen may scroll automatically. Only a recent manual gesture moves the start.
function markUserScroll() { userScrollUntil = performance.now() + 900; }
window.addEventListener('touchstart', markUserScroll, { passive: true });
window.addEventListener('touchmove', markUserScroll, { passive: true });
window.addEventListener('wheel', markUserScroll, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) markUserScroll();
});
window.addEventListener('scroll', () => {
  if (reader.hidden || performance.now() > userScrollUntil || pendingFrame) return;
  pendingFrame = requestAnimationFrame(() => { pendingFrame = 0; selectAtMarker(); });
}, { passive: true });
window.addEventListener('resize', () => { if (!reader.hidden) selectAtMarker(); });
function selectAtMarker() {
  if (!blocks.length) return;
  const marker = Math.min(window.innerHeight * 0.27, 220);
  let next = blocks.length - 1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].getBoundingClientRect().bottom > marker) { next = i; break; }
  }
  setSelected(next);
}
function setSelected(index) {
  selectedIndex = index;
  blocks.forEach((block, i) => {
    const earlier = i < selectedIndex;
    block.classList.toggle('before-start', earlier);
    block.classList.toggle('current', i === selectedIndex);
    if (earlier) block.setAttribute('aria-hidden', 'true');
    else block.removeAttribute('aria-hidden');
  });
  position.textContent = `${selectedIndex + 1} / ${blocks.length}`;
}
function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function inlineMarkdown(value) {
  let html = escapeHtml(value);
  const codes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => { codes.push(`<code>${code}</code>`); return `\uE000${codes.length - 1}\uE001`; });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/_([^_]+)_/g, '<em>$1</em>');
  return html.replace(/\uE000(\d+)\uE001/g, (_, index) => codes[Number(index)]);
}
function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let i = 0;
  const wrap = (tag, content, extra = '') => `<${tag} class="reading-block${extra ? ` ${extra}` : ''}">${content}</${tag}>`;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      i++; const code = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if (i < lines.length) i++;
      output.push(wrap('pre', `<code>${escapeHtml(code.join('\n'))}</code>`, 'code-block'));
      continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (heading) { output.push(wrap(`h${heading[1].length}`, inlineMarkdown(heading[2]))); i++; continue; }
    if (/^\s{0,3}(?:---+|\*\*\*+|___+)\s*$/.test(line)) { output.push('<hr class="reading-block">'); i++; continue; }
    if (/^\s{0,3}>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
      output.push(wrap('blockquote', `<p>${inlineMarkdown(quote.join(' '))}</p>`)); continue;
    }
    const listMatch = line.match(/^\s{0,3}([-*+] |\d+\. )/);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1][0]);
      const type = ordered ? 'ol' : 'ul';
      const items = [];
      const pattern = ordered ? /^\s{0,3}\d+\.\s+(.+)$/ : /^\s{0,3}[-*+]\s+(.+)$/;
      while (i < lines.length) { const match = lines[i].match(pattern); if (!match) break; items.push(`<li>${inlineMarkdown(match[1])}</li>`); i++; }
      output.push(wrap(type, items.join(''))); continue;
    }
    const paragraph = [line.trim()]; i++;
    while (i < lines.length && lines[i].trim() && !/^\s{0,3}(?:#{1,6}\s+|>|```|[-*+]\s+|\d+\.\s+|---+\s*$)/.test(lines[i])) paragraph.push(lines[i++].trim());
    output.push(wrap('p', inlineMarkdown(paragraph.join(' '))));
  }
  return output.join('\n');
}
