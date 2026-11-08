/* A bracket around a product, with an exponent: (2a)³. Its factors are not tiles of their own until exploded. */
import { defineKind, kindOf, nid } from './registry.js';

export const G = (f, e) => ({ k: 'g', f, e, id: nid() });
const inner = g => g.f.map(f => kindOf(f).key(f)).join('*');

defineKind({
  k: 'g',
  clone: f => G(f.f.map(g => kindOf(g).clone(g)), f.e),
  key: f => '(' + inner(f) + ')^' + f.e,
  canMerge: (x, y) => inner(x) === inner(y),
  merge: (x, y) => G(x.f.map(g => kindOf(g).clone(g)), x.e + y.e),
  terms: () => null,
  has: (f, b) => f.f.some(g => kindOf(g).has(g, b)),
  eval: (f, env, evalTerms) => Math.pow(f.f.reduce((p, g) => p * kindOf(g).eval(g, env, evalTerms), 1), f.e),
});
