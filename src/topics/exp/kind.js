/* A power with letters in its exponent: 2ˣ, 3^(x+1). The base is a whole number; the exponent is a sum whose
   pieces are tiles of their own (like a root's). Two powers of the same base multiply by adding exponents:
   2ˣ · 2³ = 2^(x+3), the way a² · a³ = a⁵ counts the a's. */
import { defineKind, nid } from '../../core/kinds/registry.js';
import { N } from '../../core/kinds/number.js';
import { G } from '../../core/kinds/group.js';
import { T, cloneT, sumKey, tHasU } from '../../core/kinds/sums.js';
import { sumClean, tidy } from '../../core/model.js';

export const Ex = (b, terms) => ({ k: 'ex', b, terms, e: 1, id: nid() });
// an exponent that is only a whole number: 2^3 is just 2³ (a number power), 2^1 is 2, 2^0 is 1
const plain = f => f.terms.length === 1 && f.terms[0].f.every(g => g.k === 'n') ? (f.terms[0].neg ? -1 : 1) * f.terms[0].f.reduce((p, g) => p * g.v, 1) : null;

defineKind({
  k: 'ex',
  clone: f => Ex(f.b, f.terms.map(cloneT)),
  key: f => 'ex' + f.b + '^' + sumKey(f.terms),
  canMerge: (x, y) => x.b === y.b,
  merge: (x, y) => Ex(x.b, [...x.terms.map(cloneT), ...y.terms.map(cloneT)]),
  terms: f => f.terms,
  has: (f, b) => f.terms.some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => Math.pow(f.b, evalTerms(f.terms, env)),
  symbolic: true,   // 3·2ˣ and 2ˣ are like terms
  tidyIn: (f, n) => n === 1 && f.b > 1 && (f.terms.length > 1 ? sumClean(f.terms) : tidy(f.terms[0])),
  // 2^3 → 2³, 2^1 → 2, 2^0 → 1 (after exploding 2^(x+3) into 2ˣ · 2³)
  norm: f => { const k = plain(f); return k === null ? null : k === 0 ? [N(1)] : k === 1 ? [N(f.b)] : [G([N(f.b)], k)]; },
});
