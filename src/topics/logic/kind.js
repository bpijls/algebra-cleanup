/* Boolean logic: + is OR, · is AND, 0 and 1 are false and true, and NOT is a piece of its own: ¬(…), drawn with
   a bar over what it holds (its inside is a sum, like a bracket's). */
import { defineKind, nid } from '../../core/kinds/registry.js';
import { cloneT, sumKey, tHasU } from '../../core/kinds/sums.js';

export const Not = terms => ({ k: 'not', terms, e: 1, id: nid() });
// a literal: a letter, or the NOT of one letter
export const literal = f => f.k === 'v' || (f.k === 'not' && f.terms.length === 1 && f.terms[0].f.length === 1 && f.terms[0].f[0].k === 'v');

defineKind({
  k: 'not',
  clone: f => Not(f.terms.map(cloneT)),
  key: f => '¬(' + sumKey(f.terms) + ')',
  canMerge: () => false,
  merge: x => x,
  terms: f => f.terms,
  has: (f, b) => f.terms.some(t => tHasU(t, b)),
  eval: () => NaN,          // no number: the judge reads logic with a truth table
  symbolic: true,
  tidyIn: f => literal(f),
  norm: () => null,         // only tidy what is inside
});
