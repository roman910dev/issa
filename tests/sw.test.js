import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('cached app opens while offline after service worker installation', async () => {
  const handlers = new Map();
  const responses = new Map();
  const cache = {
    async addAll(urls) {
      for (const url of urls) responses.set(url.href, new Response(url.pathname));
    },
    async match(request) {
      return responses.get(request.href || request.url)?.clone();
    },
  };
  const self = {
    location: { origin: 'https://example.com' },
    registration: { scope: 'https://example.com/issa/' },
    addEventListener(type, handler) { handlers.set(type, handler); },
    async skipWaiting() {},
    clients: { async claim() {} },
  };
  const caches = {
    async open() { return cache; },
    async keys() { return ['issa-precache-old', 'issa-precache-test']; },
    async delete(name) { return name === 'issa-precache-old'; },
  };
  const source = await readFile(new URL('../src/sw.js', import.meta.url), 'utf8');
  vm.runInNewContext(`const CACHE_NAME = 'issa-precache-test'; const PRECACHE_URLS = ['./index.html', './assets/app.js'];\n${source}`, {
    self, caches, URL, Response,
    fetch: async () => { throw new Error('offline'); },
  });

  let pending;
  handlers.get('install')({ waitUntil(promise) { pending = promise; } });
  await pending;
  assert.ok(responses.has('https://example.com/issa/index.html'));

  let response;
  handlers.get('fetch')({
    request: { url: 'https://example.com/issa/', method: 'GET', mode: 'navigate' },
    respondWith(promise) { response = promise; },
  });
  assert.equal(await (await response).text(), '/issa/index.html');

  handlers.get('fetch')({
    request: { url: 'https://example.com/issa/assets/app.js', method: 'GET', mode: 'same-origin' },
    respondWith(promise) { response = promise; },
  });
  assert.equal(await (await response).text(), '/issa/assets/app.js');
});
