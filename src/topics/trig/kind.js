/* sin, cos and tan of a sum, with a power: sin(a + b), cos²(x), tan(45°). Like a root or a log it is a function
   of a sum whose pieces are tiles of their own; like a bracket it has a power, so sin a · sin a = sin²a.
   Angles are in degrees: a number inside is shown as 30°, and the judge evaluates it that way. */
import { defineKind, nid } from '../../core/kinds/registry.js';
import { cloneT, sumKey, tHasU } from '../../core/kinds/sums.js';

export const Tr = (fn, terms, e = 1) => ({ k: 'trig', fn, terms, e, id: nid() });
export const OTHER = { sin: 'cos', cos: 'sin' };
// what the piece is apart from its power: sin a in sin²a (equal bases cancel and multiply)
export const base = f => f.fn + '(' + sumKey(f.terms) + ')';

// the exact values on the unit circle, every 30° and 45°: [sign, what is on top (1, √2, √3, or 0), bottom (1 or 2)]
const SIN = { 0: [0], 30: [1, 1, 2], 45: [1, 2, 2], 60: [1, 3, 2], 90: [1, 1, 1] };
export function exact(fn, deg) {
  let a = ((deg % 360) + 360) % 360;
  if (fn === 'cos') a = (a + 90) % 360;   // cos θ = sin(θ + 90°)
  const sign = a > 180 ? -1 : 1, b = a > 180 ? a - 180 : a, q = b > 90 ? 180 - b : b;
  const v = SIN[q];
  if (!v) return null;
  return v[0] === 0 ? { zero: true } : { sign, root: v[1], den: v[2] };   // root 1: no root
}
export const pureNum = t => t.f.length === 1 && t.f[0].k === 'n';

// as small as it gets: the sine or cosine of one letter (sin a), or of an angle with no exact value (sin 20°)
export function atomicTrig(f) {
  if (f.fn === 'tan' || f.terms.length !== 1 || f.terms[0].neg) return false;
  const t = f.terms[0];
  if (pureNum(t)) return !exact(f.fn, t.f[0].v);
  return t.f.length === 1 && t.f[0].k === 'v' && t.f[0].e === 1;
}

defineKind({
  k: 'trig',
  clone: f => Tr(f.fn, f.terms.map(cloneT), f.e),
  key: f => base(f) + '^' + f.e,
  base,
  canMerge: (x, y) => base(x) === base(y),
  merge: (x, y) => Tr(x.fn, x.terms.map(cloneT), x.e + y.e),
  terms: f => f.terms,
  has: (f, b) => f.terms.some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => Math.pow(Math[f.fn](evalTerms(f.terms, env) * Math.PI / 180), f.e),
  symbolic: true,                                        // 2 sin a and sin a are like terms; sin a and cos a are not
  // a tidy term holds atomic sines and cosines, each once (sin a · sin a is sin²a)
  tidyIn: (f, n, t) => atomicTrig(f) && !t.f.some(g => g !== f && g.k === 'trig' && base(g) === base(f)),
});
