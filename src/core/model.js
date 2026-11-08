/* The algebra model: nodes (N, V, G, Pr, Rt), terms and fractions, keys, tidiness, normalize, isClean, walking. No DOM. */
import { isSolved, letters } from './balance.js';
import { quadSplit } from './hints.js';
import { mx, sumHTML } from './notation.js';

export let uid = 1;

export const nid = () => uid++;

export const N = v => ({ k: 'n', v, id: nid() });

export const V = (b, e = 1) => ({ k: 'v', b, e, id: nid() });

export const G = (f, e) => ({ k: 'g', f, e, id: nid() });

          // bracket around a product, with exponent
export const Pr = (terms, e = 1) => ({ k: 'p', terms, e, id: nid() });

  // bracket around a sum, with exponent
export const Rt = terms => ({ k: 'r', terms, e: 1, id: nid() });

      // square root of a sum (of one term, mostly)
export const T = (f, neg = false) => ({ k: 't', f, neg, id: nid() });

export const F = (num, den) => ({ num, den: den || [T([N(1)])] });

export const MAX_VAR = 16, MAX_GROUP = 8;

export const cloneF = f => f.k === 'n' ? N(f.v) : f.k === 'v' ? V(f.b, f.e) : f.k === 'g' ? G(f.f.map(cloneF), f.e) : f.k === 'r' ? Rt(f.terms.map(cloneT)) : Pr(f.terms.map(cloneT), f.e);

export const cloneT = t => T(t.f.map(cloneF), t.neg);

export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

export function primeFactors(n) { const r = []; let d = 2; while (n > 1) { while (n % d === 0) { r.push(d); n /= d; } d++; } return r; }

export const fkey = f => f.k === 'n' ? 'n' + f.v : f.k === 'v' ? f.b + '^' + f.e : f.k === 'g' ? '(' + f.f.map(fkey).join('*') + ')^' + f.e
  : f.k === 'r' ? '√' + sumKey(f.terms) : sumKey(f.terms) + '^' + f.e;

// a sum, independent of the order of its terms and of the factors inside each term
export const sumKey = terms => '[' + terms.map(t => (t.neg ? '-' : '+') + t.f.map(fkey).sort().join('*')).sort().join('') + ']';

export const innerKey = g => g.f.map(fkey).join('*');

export function canMerge(x, y) {
  if (x.k !== y.k) return false;
  if (x.k === 'n') return true;
  if (x.k === 'v') return x.b === y.b;
  if (x.k === 'p') return sumKey(x.terms) === sumKey(y.terms);
  if (x.k === 'r') return x.terms.length === 1 && y.terms.length === 1;   // √2 · √3 = √(2·3)
  return innerKey(x) === innerKey(y);
}

export function mergeF(x, y) {
  if (x.k === 'n') return N(x.v * y.v);
  if (x.k === 'v') return V(x.b, x.e + y.e);
  if (x.k === 'p') return Pr(x.terms.map(cloneT), x.e + y.e);
  if (x.k === 'r') return Rt([T([...x.terms[0].f, ...y.terms[0].f].map(cloneF), x.terms[0].neg !== y.terms[0].neg)]);
  return G(x.f.map(cloneF), x.e + y.e);
}

export const varPart = t => t.f.filter(f => f.k === 'v');

export const sig = t => t.f.filter(f => f.k === 'v' || f.k === 'p' || f.k === 'r').map(f => f.k === 'v' ? f.b + f.e : fkey(f)).sort().join('.');

// a root is tidy when it holds one whole number with no pair left inside: √5, √12 is not (12 = 2·2·3)
// with letters: a clean sum (√(b² − 4ac)) or one tidy term without a square in it (√a, √(3ab))
export const rootClean = f => {
  if (f.terms.length > 1) return sumClean(f.terms);
  const t = f.terms[0];
  if (t.neg || !tidy(t) || t.f.some(g => g.k !== 'n' && g.k !== 'v')) return false;
  const n = t.f.find(g => g.k === 'n'), vs = t.f.filter(g => g.k === 'v');
  if (!vs.length) return t.f.length === 1 && n.v > 1 && !squareFactor(n.v);
  return (!n || (n.v > 1 && !squareFactor(n.v))) && vs.every(v => v.e === 1);
};

export function squareFactor(n) { for (let d = 2; d * d <= n; d++) if (n % (d * d) === 0) return d; return 0; }

export const coefAbs = t => { const n = t.f.find(f => f.k === 'n'); return n ? n.v : 1; };

export const coef = t => coefAbs(t) * (t.neg ? -1 : 1);

export const isOne = den => den.length === 1 && !den[0].neg && den[0].f.length === 1 && den[0].f[0].k === 'n' && den[0].f[0].v === 1;

export const SIDES = ['num', 'den'];

/* A term is tidy when it reads as: one number, each letter once (and, if allowed, one clean bracket). */
export function tidy(t, allowB) {
  let n = 0, p = 0, r = 0; const bs = new Set();
  for (const f of t.f) {
    if (f.k === 'g') return false;
    if (f.k === 'r') { if (!rootClean(f) || r++) return false; continue; }
    if (f.k === 'p') { if (!allowB || f.e !== 1 || !sumClean(f.terms)) return false; p++; }
    else if (f.k === 'n') n++;
    else { if (bs.has(f.b)) return false; bs.add(f.b); }
  }
  return n <= 1 && p <= 1;
}

export function sumClean(terms) {
  if (terms.length < 2 || !terms.every(t => tidy(t, true))) return false;
  const s = terms.map(sig); return new Set(s).size === s.length;
}

export function cleanTerm(t) {
  t.f = t.f.filter(f => !(f.k !== 'n' && f.e === 0));
  if (t.f.length > 1) t.f = t.f.filter(f => !(f.k === 'n' && f.v === 1));
  if (!t.f.length) t.f = [N(1)];
  return t;
}

export function normTerms(terms, keepBare) {
  for (const t of terms) {
    const nf = [];
    for (const f of t.f) {
      if (f.k === 'r') {
        normTerms(f.terms);
        const v = f.terms.length === 1 && !f.terms[0].neg && f.terms[0].f.length === 1 && f.terms[0].f[0].k === 'n' ? f.terms[0].f[0].v : -1;
        if (v === 0 || v === 1) { nf.push(N(v)); continue; }
      }
      if (f.k === 'p') {
        normTerms(f.terms);
        if (f.terms.length === 1) {
          const it = f.terms[0];
          if (it.neg && f.e % 2) t.neg = !t.neg;
          if (f.e === 1) nf.push(...it.f); else nf.push(G(it.f, f.e));   // (2a)² is a power of a product
          continue;
        }
      }
      nf.push(f);
    }
    t.f = nf;
    cleanTerm(t);
  }
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    // a bare bracket with + in front is just its terms; a minus or a power in front must be opened by the player
    if (t.f.length === 1 && t.f[0].k === 'p' && !t.neg && t.f[0].e === 1 && !(keepBare && terms.length === 1)) {
      const inner = t.f[0].terms;
      terms.splice(i, 1, ...inner); i += inner.length - 1;
    }
  }
  // + 0 adds nothing: x + 0 is x
  for (let i = terms.length - 1; i >= 0 && terms.length > 1; i--)
    if (terms[i].f.length === 1 && terms[i].f[0].k === 'n' && terms[i].f[0].v === 0) terms.splice(i, 1);
}

export const isUnit = side => side.length === 1 && side[0].f.length === 1 && side[0].f[0].k === 'n' && side[0].f[0].v === 1;

export function negate(side) {
  if (side.length === 1) side[0].neg = !side[0].neg;
  else side.forEach(t => { t.neg = !t.neg; });
}

export function normalize(S) {
  for (const P of S.parts) for (const side of SIDES) {
    // (x+2)/(x+2)(x+3): a bracket that is the whole top or bottom stays a bracket, so it can cancel as one piece
    normTerms(P[side], !isUnit(P[side === 'num' ? 'den' : 'num']) && S.op !== '·');
    if (!P[side].length) P[side] = [T([N(side === 'num' ? 0 : 1)])];
  }
  // a minus below the bar goes on top: 6/−2 is −6/2 (dividing both sides of an equation by −2 makes these)
  for (const P of S.parts) if (P.den.length === 1 && P.den[0].neg) { P.den[0].neg = false; negate(P.num); }
  // a fraction that is used up (1 over 1) stays on the board: the player cancels the 1's (opPair, 'ones')
  // (a/1) / (b/1) is just a/b
  if (S.parts.length === 2 && S.op === '/' && isOne(S.parts[0].den) && isOne(S.parts[1].den))
    S.parts = [F(S.parts[0].num, S.parts[1].num)];
  if (S.parts.length === 1) S.op = null;
}

export function isFactored(S) {
  if (S.parts.length > 1) return false;
  const P = S.parts[0];
  if (!isOne(P.den) || P.num.length !== 1) return false;
  const t = P.num[0];
  const ps = t.f.filter(f => f.k === 'p');
  if (!ps.length || !tidy({ f: t.f.filter(f => f.k !== 'p') })) return false;
  const keys = ps.map(f => sumKey(f.terms));
  if (new Set(keys).size !== keys.length) return false;   // (x+2)(x+2) is written (x+2)²
  return ps.every(f => {
    const inner = f.terms;
    if (!sumClean(inner) || !inner.every(t => tidy(t))) return false;   // no half-finished brackets inside
    let g = 0; inner.forEach(it => { g = gcd(g, coefAbs(it)); });
    if (g > 1 || quadSplit(inner)) return false;   // x² + 5x + 6 still splits into (x + 2)(x + 3)
    return !varPart(inner[0]).some(v => inner.every(it => varPart(it).some(w => w.b === v.b)));
  });
}

// a side that is one bare bracket reads as the sum inside it
export const unbare = side => side.length === 1 && !side[0].neg && side[0].f.length === 1 && side[0].f[0].k === 'p' && side[0].f[0].e === 1 ? side[0].f[0].terms : side;

export function isClean(S) {
  if (S.goal === 'solve') return isSolved(S);
  if (S.goal === 'factor') return isFactored(S);
  if (S.parts.length > 1) return false;
  const P = S.parts[0];
  for (const side of SIDES) {
    const ts = unbare(P[side]);
    if (!ts.every(t => tidy(t, !!S.allowB))) return false;
    const sigs = ts.map(sig);
    if (new Set(sigs).size !== sigs.length) return false;
  }
  if (isOne(P.den)) return true;
  const all = [...unbare(P.num), ...unbare(P.den)];
  let g = 0; for (const t of all) g = gcd(g, coefAbs(t));
  if (g > 1) return false;
  const shared = varPart(all[0]).map(f => f.b).filter(b => all.every(t => varPart(t).some(f => f.b === b)));
  return shared.length === 0;
}

/* walk every term and factor, including those inside brackets */
export function walkTerms(terms, ctx, fn) {
  terms.forEach((term, t) => {
    fn({ kind: 't', ...ctx, t, term, terms });
    term.f.forEach((f, i) => {
      fn({ kind: 'f', ...ctx, t, i, term, terms, f });
      if (f.k === 'p' || f.k === 'r') walkTerms(f.terms, { ...ctx, depth: ctx.depth + 1, in: f }, fn);
    });
  });
}

export function walk(S, fn) { S.parts.forEach((P, p) => SIDES.forEach(side => walkTerms(P[side], { p, side, depth: 0 }, fn))); }

export function locate(S, id) {
  let hit = null;
  walk(S, L => { if (!hit && (L.kind === 't' ? L.term.id : L.f.id) === id) hit = L; });
  if (hit && hit.kind === 'f') hit.i = hit.term.f.indexOf(hit.f);
  return hit;
}

export const eachFactor = (S, fn) => walk(S, L => L.kind === 'f' && fn(L));

export const eachTerm = (S, fn) => walk(S, L => L.kind === 't' && fn(L));

export function containers(S) { const out = []; walk(S, L => { if (L.kind === 't' && !out.includes(L.terms)) out.push(L.terms); }); return out; }

export const branchCount = S => S.op === '=' ? S.parts.length >> 1 : 1;

export const pairOf = (S, bi) => S.parts.slice(2 * bi, 2 * bi + 2);

export const eqView = (S, bi) => ({ parts: pairOf(S, bi), op: '=', goal: 'solve', unknown: unknownOf(S) });

   // shares the tiles with S
// the letter an equation is solved for; the other letters are parameters (a, b, c in ax² + bx + c = 0)
export function unknownOf(S) {
  if (S.unknown) return S.unknown;
  const ls = letters(S);
  return ls.includes('x') ? 'x' : ls.sort()[0];
}

export const fHasU = (f, u) => f.k === 'v' ? f.b === u : f.k === 'n' ? false : f.k === 'g' ? f.f.some(g => fHasU(g, u)) : f.terms.some(t => tHasU(t, u));

export const tHasU = (t, u) => t.f.some(f => fHasU(f, u));

export const hasU = (side, u) => side.some(t => tHasU(t, u));

export const params = S => { const u = unknownOf(S); return letters(S).filter(b => b !== u); };

// what a move by a letter or a bracket takes for granted: dividing by a − c needs a − c ≠ 0, √D needs D ≥ 0
export function addCond(S, terms, rel) {
  const key = sumKey(terms) + rel;
  S.conds = S.conds || [];
  const html = mx(sumHTML(terms) + (rel === 'ge' ? ' ≥ 0' : ' ≠ 0'));
  if (!S.conds.some(c => c.key === key)) S.conds.push({ key, html });
  return html;
}
