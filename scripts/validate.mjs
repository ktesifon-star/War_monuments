import {readFile, access} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {validateMonuments} from '../core.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const records = JSON.parse(await read('data/monuments.json'));
const {valid, errors} = validateMonuments(records);
assert.equal(errors.length, 0, errors.join('\n'));
for (const item of valid) {
  if (item.photo) await access(resolve(root, item.photo));
}
const html = await read('index.html');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML ids');
for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), `Missing anchor ${id}`);
for (const [, path] of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)) {
  if (/^(https?:|tel:)/.test(path)) continue;
  await access(resolve(root, path.split('?')[0]));
}
const script = await read('script.js');
for (const [, id] of script.matchAll(/querySelector\('#([^']+)'\)/g)) assert(ids.includes(id), `Missing DOM element ${id}`);
assert(html.includes('type="module"'), 'App must load as a module');
console.log(`Validated ${valid.length} monument(s), photo files, assets and page anchors.`);
