/* A letter with an exponent: x, a³. Two powers of the same letter merge by adding exponents. */
import { defineKind, nid } from './registry.js';

export const V = (b, e = 1) => ({ k: 'v', b, e, id: nid() });

defineKind({
  k: 'v',
  clone: f => V(f.b, f.e),
  key: f => f.b + '^' + f.e,
  canMerge: (x, y) => x.b === y.b,
  merge: (x, y) => V(x.b, x.e + y.e),
  terms: () => null,
  has: (f, b) => f.b === b,
  eval: (f, env) => Math.pow(env[f.b] ?? 0, f.e),
});
