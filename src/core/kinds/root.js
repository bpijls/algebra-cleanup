/* The square root of a sum (of one term, mostly): √5, √(b² − 4ac). Two roots of one term multiply into one:
   √2 · √3 = √(2·3). A function of a sum like this is the pattern for log, sin … (a kind with terms inside). */
import { defineKind, nid } from './registry.js';
import { T, cloneF, cloneT, sumKey, tHasU } from './sums.js';

export const Rt = terms => ({ k: 'r', terms, e: 1, id: nid() });

defineKind({
  k: 'r',
  clone: f => Rt(f.terms.map(cloneT)),
  key: f => '√' + sumKey(f.terms),
  canMerge: (x, y) => x.terms.length === 1 && y.terms.length === 1,
  merge: (x, y) => Rt([T([...x.terms[0].f, ...y.terms[0].f].map(cloneF), x.terms[0].neg !== y.terms[0].neg)]),
  terms: f => f.terms,
  has: (f, b) => f.terms.some(t => tHasU(t, b)),
  eval: (f, env, evalTerms) => Math.sqrt(evalTerms(f.terms, env)),
});
