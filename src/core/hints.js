/* Factor-goal hints (factorHint, sumProductHint), used as tactics by the factor goal (goals/simplify.js). */
import { canMerge, coef, containers, gcd, primeFactors, tidy, varPart } from './model.js';
import { restOf } from './moves.js';
import { bx, fx, mx, sumHTML, termHTML } from '../render/text.js';

/* ---- factor goal hints ---- */
// which terms to take something out of next: the terms without a bracket when some term already has one
// (x(x+2) + 3x + 6 → work on 3x + 6), or the first pair of a sum split into four (x² + 2x + 3x + 6)
export function factorFocus(ts) {
  const withP = ts.filter(t => t.f.some(f => f.k === 'p'));
  if (withP.length) { const rest = ts.filter(t => !withP.includes(t)); return rest.length >= 2 ? rest : ts; }
  return ts.length === 4 ? ts.slice(0, 2) : ts;
}

export const numProd = t => t.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);

export function factorHint(S) {
  for (const ts of containers(S)) {
    if (ts.length < 2) continue;
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++)
      for (const a of ts[i].f) for (const b of ts[j].f)
        if (a.k === 'p' && b.k === 'p' && canMerge(a, b) && a.e === b.e) return { k: 'hFactor', p: { x: mx(fx(a)), y: mx(fx(b)) }, ids: [a.id, b.id] };
    for (const t of ts) for (const f of t.f) {
      if (f.k !== 'p' || f.e !== 1) continue;
      const P = { f, term: t, terms: ts, depth: 0 };
      for (const u of ts) { const Q = { term: u, terms: ts }; const r = restOf(P, Q); if (r) return { k: 'hFactorRest', p: { b: mx(fx(f)), t: mx(sumHTML(r.set)) }, ids: [f.id, (u.f.find(g => g.k !== 'n') || u.f[0]).id] }; }
    }
    const focus = factorFocus(ts);
    // a piece that is exactly in every one of these terms
    for (const a of focus[0].f) {
      if (!((a.k === 'n' && a.v > 1) || a.k === 'v')) continue;
      const match = t => t.f.find(f => f.k === a.k && (a.k === 'n' ? f.v === a.v : f.b === a.b && f.e === a.e));
      if (focus.every(match)) { const b = match(focus[1]); return { k: 'hFactor', p: { x: mx(fx(a)), y: mx(fx(b)) }, ids: [a.id, b.id] }; }
    }
    // a factor they share but that is hidden inside a bigger number or power: explode it
    const g = focus.reduce((g, t) => gcd(g, numProd(t)), 0);
    if (g > 1) {
      const p = primeFactors(g)[0];
      for (const t of focus) {
        if (t.f.some(f => f.k === 'n' && f.v === p)) continue;
        const n = t.f.find(f => f.k === 'n' && f.v % p === 0);
        if (n) return { k: 'hExplodeFor', p: { x: n.v, p }, ids: [n.id] };
      }
    }
    for (const v of varPart(focus[0])) {
      if (!focus.every(t => varPart(t).some(w => w.b === v.b))) continue;
      for (const t of focus) {
        if (t.f.some(f => f.k === 'v' && f.b === v.b && f.e === 1)) continue;
        const big = t.f.find(f => f.k === 'v' && f.b === v.b);
        return { k: 'hExplodeVar', p: { x: mx(fx(big)), y: mx(termHTML(focus.find(u => u !== t))), b: bx(v.b) }, ids: [big.id] };
      }
    }
  }
  return null;
}

// x² + 5x + 6: two numbers with product 6 and sum 5 tell how to split 5x, so the four terms factor in pairs.
// Returns the split for a sum written as ax² + bx + c, or null when there is none with whole numbers.
export function quadSplit(ts) {
  if (ts.length !== 3 || !ts.every(t => tidy(t)) || ts.some(t => t.f.some(f => f.k === 'p'))) return null;
  const vs = ts.map(varPart);
  if (vs[2].length || vs[0].length !== 1 || vs[1].length !== 1) return null;
  const [sq, lin] = [vs[0][0], vs[1][0]];
  if (sq.b !== lin.b || sq.e !== 2 || lin.e !== 1) return null;
  const a = coef(ts[0]), b = coef(ts[1]), c = coef(ts[2]);
  if (a < 1 || gcd(gcd(a, b), c) > 1) return null;
  const inner = (u, v) => { const g = gcd(u, v) * Math.sign(u); return u / g + ',' + v / g; };
  for (let p = -Math.abs(a * c); p <= Math.abs(a * c); p++) {
    const q = b - p;
    if (!p || !q || p * q !== a * c) continue;
    if (inner(a, p) === inner(q, c)) return { a, b, c, p, q };   // this order leaves the same bracket twice
  }
  return null;
}

export function sumProductHint(S) {
  for (const ts of containers(S)) {
    const q = quadSplit(ts);
    if (q) return { k: 'hSumProduct', p: { x: mx(termHTML(ts[1])), prod: q.a * q.c, sum: q.b, a: q.p, b: q.q }, ids: [ts[1].id], split: q.p };
  }
  return null;
}

