import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = (await readFile(new URL('../src/main.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '')
  .replaceAll('import.meta.env.PROD', 'false')
  .replaceAll('import.meta.env.BASE_URL', "'/'");
globalThis.window = new JSDOM('').window;
globalThis.document = window.document;
const { renderMarkdown } = await import('../src/markdown.js');
const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';

function openApp(storage = new Map([['issa:source', text]]), unavailable = false) {
  const { window } = new JSDOM(html, { url: 'https://example.com/' });
  const { document } = window;
  globalThis.document = document;
  const frames = new Map();
  let frameId = 0;
  window.scrollTo = (options, y) => {
    window.scrollY = typeof options === 'object' ? options.top : y;
  };
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    const index = [...document.querySelectorAll('.reading-block')].indexOf(this);
    const top = 70 + index * 300 - window.scrollY;
    return { top, bottom: top + 120 };
  };
  const localStorage = {
    getItem(key) {
      if (unavailable) throw new Error('Storage unavailable');
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      if (unavailable) throw new Error('Storage unavailable');
      storage.set(key, value);
    },
    removeItem(key) {
      if (unavailable) throw new Error('Storage unavailable');
      storage.delete(key);
    },
  };
  vm.runInNewContext(script, {
    window, document, navigator: window.navigator, localStorage, renderMarkdown,
    performance: window.performance,
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  return {
    window, document, storage,
    click(selector) { document.querySelector(selector).click(); },
    edit(value) {
      document.querySelector('#source').value = value;
      document.querySelector('#source').dispatchEvent(new window.Event('input'));
    },
    scroll(y, manual = true) {
      if (manual) window.dispatchEvent(new window.Event('wheel'));
      window.scrollY = y;
      window.dispatchEvent(new window.Event('scroll'));
    },
    flushFrames() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback());
    },
  };
}

test('reopening restores the selected paragraph, scroll, and accessibility state without an unload', () => {
  const app = openApp();
  app.click('#read-button');
  app.click('#article > :nth-child(3)');
  const reopened = openApp(app.storage);
  assert.equal(reopened.document.querySelector('#reader').hidden, false);
  assert.equal(reopened.document.querySelector('#editor').hidden, true);
  assert.equal(reopened.document.querySelector('#position').textContent, '3 / 3');
  assert.ok(reopened.document.querySelector('#article > :nth-child(3)').classList.contains('current'));
  assert.equal(reopened.document.querySelector('#article > :first-child').getAttribute('aria-hidden'), 'true');
  assert.equal(reopened.window.scrollY, 670 - Math.min(reopened.window.innerHeight * 0.12, 96));
});

test('Edit and Start reading preserve position while any text edit resets it', () => {
  const app = openApp();
  app.click('#read-button');
  app.click('#article > :nth-child(2)');
  app.click('#edit-button');
  app.click('#read-button');
  assert.equal(app.document.querySelector('#position').textContent, '2 / 3');
  app.click('#edit-button');
  app.edit(`${text}\n`);
  assert.equal(app.storage.has('issa:position'), false);
  // Even reverting an edit cannot revive a stale bookmark.
  app.edit(text);
  const reopened = openApp(app.storage);
  assert.equal(reopened.document.querySelector('#editor').hidden, false);
  reopened.click('#read-button');
  assert.equal(reopened.document.querySelector('#position').textContent, '1 / 3');
});

test('Start over persists the first paragraph', () => {
  const app = openApp();
  app.click('#read-button');
  app.click('#article > :nth-child(3)');
  app.click('#top-button');
  const reopened = openApp(app.storage);
  assert.equal(reopened.document.querySelector('#position').textContent, '1 / 3');
  assert.equal(reopened.window.scrollY, 0);
});

test('manual scrolling saves position while speech-driven scrolling preserves it', () => {
  const app = openApp();
  app.click('#read-button');
  app.scroll(600, false);
  app.flushFrames();
  assert.equal(JSON.parse(app.storage.get('issa:position')).index, 0);
  app.scroll(300);
  app.flushFrames();
  assert.equal(JSON.parse(app.storage.get('issa:position')).index, 1);
  assert.equal(openApp(app.storage).document.querySelector('#position').textContent, '2 / 3');
});

test('backgrounding or closing a PWA flushes a pending scroll selection', () => {
  for (const event of ['pagehide', 'visibilitychange']) {
    const app = openApp();
    app.click('#read-button');
    app.scroll(600);
    if (event === 'pagehide') app.window.dispatchEvent(new app.window.Event(event));
    else {
      Object.defineProperty(app.document, 'visibilityState', { value: 'hidden' });
      app.document.dispatchEvent(new app.window.Event(event));
    }
    assert.equal(JSON.parse(app.storage.get('issa:position')).index, 2);
    assert.equal(openApp(app.storage).document.querySelector('#position').textContent, '3 / 3');
  }
});

test('invalid, stale, and out-of-range bookmarks fall back safely', () => {
  for (const saved of ['{', 'null', { source: 'Other text', index: 1 },
    { source: text, index: -1 }, { source: text, index: 1.5 }, { source: text, index: 99 }]) {
    const app = openApp(new Map([
      ['issa:source', text],
      ['issa:position', typeof saved === 'string' ? saved : JSON.stringify(saved)],
    ]));
    if (app.document.querySelector('#reader').hidden) app.click('#read-button');
    assert.equal(app.document.querySelector('#position').textContent, '1 / 3');
    assert.equal(app.window.scrollY, 0);
  }
});

test('reading still works when browser storage is unavailable', () => {
  const app = openApp(new Map(), true);
  app.edit(text);
  app.click('#read-button');
  app.click('#article > :nth-child(2)');
  assert.equal(app.document.querySelector('#position').textContent, '2 / 3');
  assert.equal(app.document.querySelector('#save-status').textContent, 'Browser storage unavailable');
});
