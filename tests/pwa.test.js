// The PWA shell: everything the service worker precaches must exist, and the Artifact build must not carry PWA bits.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');

test('service worker precaches only files that exist, including every script index.html loads', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  shell.filter(f => f !== './').forEach(f => assert.ok(fs.existsSync(path.join(root, f)), `missing ${f}`));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="((?:src|icons)\/[^"]+|manifest\.webmanifest)"/g)].map(m => m[1]);
  refs.forEach(r => assert.ok(shell.includes(r), `${r} is loaded by index.html but not precached`));
  // the modules ui.js imports, directly or not: every script under src/
  const scripts = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => 'src/' + f.split(path.sep).join('/'));
  scripts.forEach(f => assert.ok(shell.includes(f), `${f} is a module but not precached`));
});

test('manifest icons exist', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  m.icons.forEach(i => assert.ok(fs.existsSync(path.join(root, i.src)), `missing ${i.src}`));
});

test('the single-file Artifact build leaves out the manifest and service worker', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')]);
  const out = fs.readFileSync(path.join(root, 'dist/algebra-cleanup.html'), 'utf8');
  assert.doesNotMatch(out, /manifest|serviceWorker|apple-touch-icon|theme-color/);
});
