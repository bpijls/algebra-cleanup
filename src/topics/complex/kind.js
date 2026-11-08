/* The imaginary unit i: a number of its own, defined by i · i = −1. It is not a letter (nobody solves for i)
   and two i's don't merge into i²: tapping one and then the other is the definition, i · i = −1 (rules.js). */
import { defineKind, nid } from '../../core/kinds/registry.js';

export const Im = (e = 1) => ({ k: 'im', e, id: nid() });

defineKind({
  k: 'im',
  clone: f => Im(f.e),
  key: f => 'i^' + f.e,
  canMerge: () => false,
  merge: x => x,
  terms: () => null,
  has: () => false,
  eval: () => NaN,      // no real value: the judge evaluates complex states with complex arithmetic
  symbolic: true,       // 2i and 3i are like terms
  tidyIn: (f, n) => n === 1 && f.e === 1,
});
