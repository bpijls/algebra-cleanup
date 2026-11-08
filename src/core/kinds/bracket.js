/* A bracket around a sum, with an exponent: (x + 2)². Its terms are tiles; it is opened by the player. */
import { defineKind, nid } from './registry.js';
import { cloneT, sumKey, tHasU } from './sums.js';

export const Pr = (terms, e = 1) => ({ k: 'p', terms, e, id: nid() });

defineKind({
  k: 'p',
  clone: f => Pr(f.terms.map(cloneT), f.e),
  key: f => sumKey(f.terms) + '^' + f.e,
  canMerge: (x, y) => sumKey(x.terms) === sumKey(y.terms),
  merge: (x, y) => Pr(x.terms.map(cloneT), x.e + y.e),
  terms: f => f.terms,
  has: (f, b) => f.terms.some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => Math.pow(evalTerms(f.terms, env), f.e),
});
