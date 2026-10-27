// Produce a public-only directory with content hashes; no bundler or packages.
import {readFile, writeFile, mkdir, rm, cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, dirname, extname, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import './validate.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');
await rm(out, {recursive:true, force:true});
await mkdir(resolve(out, 'data'), {recursive:true});
const names = {};
async function hashed(file, transform = text => text) {
  const text = transform(await readFile(resolve(root, file), 'utf8'));
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 12);
  const extension = extname(file);
  const name = `${basename(file, extension)}.${hash}${extension}`;
  const target = file.startsWith('data/') ? `data/${name}` : name;
  await writeFile(resolve(out, target), text);
  names[file] = target;
}
await hashed('data/monuments.json');
// Keep a stable data URL for the no-JavaScript link.
await cp(resolve(root, 'data/monuments.json'), resolve(out, 'data/monuments.json'));
await hashed('core.js');
await hashed('config.js', text => text.replace('./data/monuments.json', `./${names['data/monuments.json']}`).replace('./core.js', `./${names['core.js']}`));
await hashed('style.css');
await hashed('script.js', text => text.replace('./core.js', `./${names['core.js']}`).replace('./config.js', `./${names['config.js']}`));
let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace(/style\.css\?v=[^" ]+/g, names['style.css']).replace(/script\.js\?v=[^" ]+/g, names['script.js']);
await writeFile(resolve(out, 'index.html'), html);
await writeFile(resolve(out, '.nojekyll'), '');
try { await cp(resolve(root, 'images'), resolve(out, 'images'), {recursive:true}); } catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log('Built dist/ with content-hashed assets.');
