/* A whole number: 12. Exploding it gives its prime factors; two numbers multiply into one. */
import { defineKind, nid } from './registry.js';

export const N = v => ({ k: 'n', v, id: nid() });

defineKind({
  k: 'n',
  clone: f => N(f.v),
  key: f => 'n' + f.v,
  canMerge: () => true,
  merge: (x, y) => N(x.v * y.v),
  terms: () => null,
  has: () => false,
  eval: f => f.v,
});
