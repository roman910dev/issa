import './style.css';
import { renderMarkdown } from './markdown.js';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(error => console.warn('Offline support could not start:', error));
  });
}

const storageKey = 'issa:source';
const positionKey = 'issa:position';
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
let savedPosition = null;

try { source.value = localStorage.getItem(storageKey) || ''; }
catch { saveStatus.textContent = 'Browser storage unavailable'; }
try {
  const saved = JSON.parse(localStorage.getItem(positionKey));
  if (saved?.source === source.value && Number.isInteger(saved.index) && saved.index >= 0) {
    savedPosition = saved;
  }
} catch { /* Missing or invalid positions start at the beginning. */ }
let previousSource = source.value;
source.addEventListener('input', () => {
  const changed = source.value !== previousSource;
  previousSource = source.value;
  if (changed) savedPosition = null;
  try {
    // Invalidate first so an interrupted save cannot pair new text with an old position.
    if (changed) localStorage.removeItem(positionKey);
    localStorage.setItem(storageKey, source.value);
    saveStatus.textContent = 'Saved on this device';
  }
  catch { saveStatus.textContent = 'Browser storage unavailable'; }
});

document.querySelector('#read-button').addEventListener('click', () => {
  if (!source.value.trim()) { source.focus(); return; }
  openReader();
});
function openReader() {
  article.replaceChildren(...renderMarkdown(source.value));
  blocks = [...article.querySelectorAll('.reading-block')];
  const restoredIndex = savedPosition?.source === source.value && savedPosition.index < blocks.length
    ? savedPosition.index : 0;
  ignoreProgrammaticScroll();
  editor.hidden = true;
  reader.hidden = false;
  setSelected(restoredIndex);
  const top = restoredIndex === 0 ? 0
    : window.scrollY + blocks[restoredIndex].getBoundingClientRect().top - readingMarker();
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
}
document.querySelector('#edit-button').addEventListener('click', () => {
  reader.hidden = true;
  editor.hidden = false;
  window.scrollTo(0, 0);
  source.focus();
});
document.querySelector('#top-button').addEventListener('click', () => {
  ignoreProgrammaticScroll();
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
function ignoreProgrammaticScroll() {
  userScrollUntil = 0;
  if (pendingFrame) cancelAnimationFrame(pendingFrame);
  pendingFrame = 0;
}
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
// Mobile PWAs can be terminated without an unload event. Flush a queued gesture
// when backgrounded; ordinary selections are persisted immediately below.
function flushPosition() {
  if (!reader.hidden && pendingFrame) {
    ignoreProgrammaticScroll();
    selectAtMarker();
  }
}
window.addEventListener('pagehide', flushPosition);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushPosition();
});
function readingMarker() { return Math.min(window.innerHeight * 0.12, 96); }
function selectAtMarker() {
  if (!blocks.length) return;
  if (window.scrollY <= 8) { setSelected(0); return; }
  const marker = readingMarker();
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
  if (!blocks.length || (savedPosition?.source === source.value && savedPosition.index === index)) return;
  try {
    const nextPosition = { source: source.value, index };
    localStorage.setItem(positionKey, JSON.stringify(nextPosition));
    savedPosition = nextPosition;
  } catch { saveStatus.textContent = 'Browser storage unavailable'; }
}

if (savedPosition && source.value.trim()) openReader();
