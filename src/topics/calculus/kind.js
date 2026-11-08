/* The derivative (…)′ with respect to x: an operator tile around a sum. Its value is the slope, which the
   judge reads numerically (a five-point difference, exact for polynomials up to rounding). */
import { defineKind, nid } from '../../core/kinds/registry.js';
import { cloneT, sumKey, tHasU } from '../../core/kinds/sums.js';

export const D = terms => ({ k: 'd', terms, e: 1, id: nid() });
const h = 1e-3;
const at = (env, x) => { const e = Object.create(env); e.x = x; return e; };

defineKind({
  k: 'd',
  clone: f => D(f.terms.map(cloneT)),
  key: f => 'd(' + sumKey(f.terms) + ')',
  canMerge: () => false,
  merge: x => x,
  terms: f => f.terms,
  has: (f, b) => b === 'x' || f.terms.some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => {
    const x = env.x ?? 0, v = d => evalTerms(f.terms, at(env, x + d));
    return (8 * (v(h) - v(-h)) - (v(2 * h) - v(-2 * h))) / (12 * h);
  },
  symbolic: true,
  tidyIn: () => false,   // a derivative is still to be worked out
  norm: () => null,
});
