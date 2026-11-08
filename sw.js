/* Service worker: the game works offline once it has been opened.
   Own files are network-first (edits on the server show up on the next load; the cache is the fallback),
   Google Fonts are cache-first (they never change for a given URL). Bump VERSION when SHELL changes. */
const VERSION = 'v8';
const SHELL_CACHE = 'alg-shell-' + VERSION, FONT_CACHE = 'alg-fonts-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'src/i18n.js', 'src/parse.js', 'src/practice.js', 'src/pwa.js', 'src/styles.css', 'src/ui.js',
  'src/content/levels.js', 'src/core/balance.js', 'src/core/done.js', 'src/core/generic.js', 'src/core/hints.js',
  'src/core/model.js', 'src/core/moves.js', 'src/core/problem.js', 'src/core/quadratic.js', 'src/render/text.js',
  'src/core/goals/index.js', 'src/core/goals/play.js', 'src/core/goals/registry.js', 'src/core/goals/simplify.js',
  'src/core/goals/solve.js', 'src/core/kinds/bracket.js', 'src/core/kinds/group.js', 'src/core/kinds/index.js',
  'src/core/kinds/letter.js', 'src/core/kinds/number.js', 'src/core/kinds/registry.js', 'src/core/kinds/root.js',
  'src/core/kinds/sums.js', 'src/core/rules/engine.js', 'src/core/rules/explode.js', 'src/core/rules/pair.js',
  'src/core/rules/registry.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== SHELL_CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(networkFirst(req));
  else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    // don't let a hanging network keep the game from starting: fall back to the cache after 4 s
    const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(no, 4000))]);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('index.html'));
    return hit || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
