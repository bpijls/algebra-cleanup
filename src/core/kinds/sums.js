/* Terms and sums: the pieces every kind with a sum inside it (bracket, root) builds on. */
import { N } from './number.js';
import { kindOf, nid } from './registry.js';

export const T = (f, neg = false) => ({ k: 't', f, neg, id: nid() });
export const F = (num, den) => ({ num, den: den || [T([N(1)])] });
export const cloneF = f => kindOf(f).clone(f);
export const cloneT = t => T(t.f.map(cloneF), t.neg);
export const fkey = f => kindOf(f).key(f);
// a sum, independent of the order of its terms and of the factors inside each term
export const sumKey = terms => '[' + terms.map(t => (t.neg ? '-' : '+') + t.f.map(fkey).sort().join('*')).sort().join('') + ']';
export const fHasU = (f, u) => kindOf(f).has(f, u);
export const tHasU = (t, u) => t.f.some(f => fHasU(f, u));
export const evalF = (f, env) => kindOf(f).eval(f, env, evalTerms);
export const evalTerms = (ts, env) => ts.reduce((s, t) => s + (t.neg ? -1 : 1) * t.f.reduce((p, f) => p * evalF(f, env), 1), 0);
