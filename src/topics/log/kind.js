/* A logarithm of a sum (of one term, mostly): log(ab), log(a³). Like a root, it is a function of a sum, and the
   pieces inside it are tiles of their own. Two logs never multiply into one piece (log a · log b is not log ab). */
import { defineKind, nid } from '../../core/kinds/registry.js';
import { cloneT, sumKey, tHasU } from '../../core/kinds/sums.js';
import { primeFactors } from '../../core/model.js';

export const Lg = terms => ({ k: 'log', terms, e: 1, id: nid() });

// as small as it gets: the log of one letter or one prime number (log a, log 3)
export const atomicLog = f => {
  if (f.terms.length !== 1 || f.terms[0].neg || f.terms[0].f.length !== 1) return false;
  const g = f.terms[0].f[0];
  return (g.k === 'v' && g.e === 1) || (g.k === 'n' && g.v > 1 && primeFactors(g.v).length === 1);
};

defineKind({
  k: 'log',
  clone: f => Lg(f.terms.map(cloneT)),
  key: f => 'log' + sumKey(f.terms),
  canMerge: () => false,
  merge: () => { throw new Error('two logs never merge'); },
  terms: f => f.terms,
  has: (f, b) => f.terms.some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => Math.log(evalTerms(f.terms, env)),
  symbolic: true,                              // 2 log a and 3 log a are like terms; log a and log b are not
  base: f => 'log' + sumKey(f.terms),
  norm: () => null,                            // nothing of its own: normalize only tidies what is inside (a⁰ after cancelling)          // log 2 over log 2 cancels (equal pieces)
  tidyIn: (f, n) => n === 1 && atomicLog(f),  // a tidy term holds one log, of one letter or prime
});
