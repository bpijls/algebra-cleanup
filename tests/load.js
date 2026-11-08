// The game's modules (no DOM) as one object, so tests can call everything by name: G.normalize, G.LEVELS …
const MODULES = ['core/kinds/index', 'core/model', 'core/problem', 'render/text', 'core/moves', 'core/rules/registry', 'core/rules/engine', 'core/hints', 'core/goals/registry', 'core/goals/index', 'core/goals/simplify', 'core/goals/solve', 'core/balance', 'core/done', 'core/quadratic',
  'core/generic', 'content/registry', 'content/tree', 'content/levels', 'content/progress', 'practice', 'parse', 'i18n', 'topics/index', 'topics/log/kind', 'topics/log/rules', 'topics/log/levels', 'topics/trig/kind', 'topics/trig/rules', 'topics/trig/levels', 'core/goals/prove', 'core/fractions', 'content/fractions', 'core/kinds/exponent', 'core/exponents', 'content/exponents', 'content/inequalities', 'topics/exp/kind', 'topics/exp/rules', 'topics/exp/levels'];

function load() {
  const api = {};
  for (const m of MODULES) Object.assign(api, require(`../src/${m}.js`));
  return api;
}
const strip = h => h.replace(/<sup>(\d+)<\/sup>/g, '^$1').replace(/<span class="nn">/g, '[').replace(/<span class="nd">/g, '/').replace(/<[^>]+>/g, '');
module.exports = { load, strip, MODULES };
