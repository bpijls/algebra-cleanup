/* A fraction inside a sum: x/3 + 2, ½ + ⅓, 1/a + 1/b. Like a bracket it holds sums whose pieces are tiles of
   their own, but two of them, with a bar between: the same cancelling rules hold across its bar as across the
   bar of the whole problem. A fraction that is the whole of a side stays the side's own bar (normalize lifts
   it there), so x/3 = 4 reads exactly as before; a fraction only lives inside a term when the term is part of
   a sum or has other pieces beside it (3 · x/4). */
import { defineKind, nid } from './registry.js';
import { T, cloneF, cloneT, sumKey, tHasU } from './sums.js';

export const Q = (num, den) => ({ k: 'q', num, den, id: nid() });
// the two sums of a fraction, top first
export const sidesOf = f => [['num', f.num], ['den', f.den]];
// a fraction of whole numbers only: ⅔ (it can stand in front of letters like a number: ⅔x)
export const numericQ = f => f.k === 'q' && [...f.num, ...f.den].every(t => t.f.every(g => g.k === 'n'));

defineKind({
  k: 'q',
  clone: f => Q(f.num.map(cloneT), f.den.map(cloneT)),
  key: f => 'q' + sumKey(f.num) + '/' + sumKey(f.den),
  // two fractions in one term multiply: tops times tops, bottoms times bottoms (only one-term tops and bottoms)
  canMerge: (x, y) => x.num.length === 1 && y.num.length === 1 && x.den.length === 1 && y.den.length === 1,
  merge: (x, y) => {
    const m = (a, b) => [T([...a[0].f, ...b[0].f].map(cloneF), a[0].neg !== b[0].neg)];
    return Q(m(x.num, y.num), m(x.den, y.den));
  },
  terms: () => null,
  sides: f => ({ num: f.num, den: f.den }),
  has: (f, b) => [...f.num, ...f.den].some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => evalTerms(f.num, env) / evalTerms(f.den, env),
  symbolic: true,   // x/3 and 2x/3 are not like terms: they are joined over their shared bottom
});
