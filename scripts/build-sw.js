import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);

async function filesIn(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) files.push(...await filesIn(new URL(`${entry.name}/`, directory), `${prefix}${entry.name}/`));
    else if (entry.name !== 'sw.js') files.push(`${prefix}${entry.name}`);
  }
  return files.sort();
}

const files = await filesIn(dist);
const hash = createHash('sha256');
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(new URL(file, dist)));
}

const source = await readFile(new URL('../src/sw.js', import.meta.url), 'utf8');
const name = `issa-precache-${hash.digest('hex').slice(0, 16)}`;
const header = `const CACHE_NAME = ${JSON.stringify(name)};\nconst PRECACHE_URLS = ${JSON.stringify(files.map(file => `./${file}`))};\n`;
await writeFile(new URL('sw.js', dist), header + source);
console.log(`Precached ${files.length} files as ${name}`);
