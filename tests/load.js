// The game's modules (no DOM) as one object, so tests can call everything by name: G.normalize, G.LEVELS …
const MODULES = ['core/model', 'render/text', 'core/moves', 'core/hints', 'core/balance', 'core/done', 'core/quadratic',
  'core/generic', 'content/levels', 'practice', 'parse', 'i18n'];

function load() {
  const api = {};
  for (const m of MODULES) Object.assign(api, require(`../src/${m}.js`));
  return api;
}
const strip = h => h.replace(/<sup>(\d+)<\/sup>/g, '^$1').replace(/<span class="nn">/g, '[').replace(/<span class="nd">/g, '/').replace(/<[^>]+>/g, '');
module.exports = { load, strip, MODULES };
