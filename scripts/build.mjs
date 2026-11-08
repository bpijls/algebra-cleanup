// Builds dist/algebra-cleanup.html: one self-contained file (styles and scripts inlined),
// in the format the claude.ai Artifact host expects (no <html>/<head>/<body>; the host adds them).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
// the modules, bundled into one classic script (the Artifact host takes a single file)
const bundle = entry => buildSync({ entryPoints: [join(root, entry)], bundle: true, format: 'iife', write: false, target: 'es2020' })
  .outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'))
  .replace(/<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<style>[\s\S]*?<\/style>\s*/, '')                       // local-only reset
  .replace(/<!-- PWA[^>]*-->\s*/, '')                                // PWA bits make no sense inside an Artifact
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/g, '')
  .replace(/<meta name="(theme-color|mobile-web-app-capable|apple-mobile-web-app-[a-z-]+)"[^>]*>\s*/g, '')
  .replace('<link rel="stylesheet" href="src/styles.css">', `<style>\n${read('src/styles.css')}</style>`);
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace('<script src="src/pwa.js"></script>', '')
  .replace(/<script type="module" src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${bundle(src)}</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/algebra-cleanup.html'), head.trim() + '\n\n' + body.trim() + '\n');
console.log('wrote dist/algebra-cleanup.html');
