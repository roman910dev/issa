import './style.css';
import { renderMarkdown } from './markdown.js';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(error => console.warn('Offline support could not start:', error));
  });
}

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
  article.replaceChildren(...renderMarkdown(source.value));
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
