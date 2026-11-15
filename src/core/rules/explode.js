/* Exploding: tapping a piece twice shows what it is made of. One handler per kind of piece. */
import { Pr } from '../kinds/bracket.js';
import { G } from '../kinds/group.js';
import { V } from '../kinds/letter.js';
import { N } from '../kinds/number.js';
import { T, cloneF, cloneT } from '../kinds/sums.js';
import { isWhole } from '../kinds/exponent.js';
import { MAX_GROUP, MAX_VAR, addCond, primeFactors } from '../model.js';
import { Rt } from '../kinds/root.js';
import { flipPower, halfPower } from '../exponents.js';
import { defineExplode } from './registry.js';
import { bx, condHTML, fx, mx, sumHTML, termHTML } from '../../render/text.js';

const fromOne = (f, made) => Object.fromEntries(made.map(c => [c.id, [f.id]]));

// a root explodes once there is a square under it: √(4·3) → √4 · √3 (the squares each a root of their own, the rest
// together), √9 → 3, √(a²) → a (a ≥ 0 written down; not in an equation, where a letter may be negative). A pair under
// it is made into a square first by the player (2 · 2 = 4); with the rootOut shortcut it comes out in one tap instead.
const squareN = v => v > 1 && Number.isInteger(Math.sqrt(v));
export const squarePiece = g => (g.k === 'n' && squareN(g.v)) || (g.k === 'v' && Number.isInteger(g.e) && g.e >= 2 && g.e % 2 === 0);
defineExplode('r', (S, L, id) => {
  const f = L.f, t = f.terms.length === 1 ? f.terms[0] : null, x = mx(fx(f));
  if (!t || t.neg) return { no: 'rootTap', p: { x }, ids: [id] };
  if (t.f.length > 1) {
    const sq = t.f.filter(squarePiece), rest = t.f.filter(g => !squarePiece(g));
    if (!sq.length) return { no: 'rootNoPair', p: { x }, ids: [id] };
    const made = [...sq.map(g => Rt([T([cloneF(g)])])), ...(rest.length ? [Rt([T(rest.map(cloneF))])] : [])];
    L.term.f.splice(L.i, 1, ...made);
    return { ok: 'rootSplit', p: { x, ex: mx(made.map(fx).join(' · ')) }, born: made.map(g => g.id), origins: fromOne(f, made) };
  }
  const g = t.f[0];
  if (g.k === 'n' && squareN(g.v)) {
    const n = N(Math.sqrt(g.v));
    L.term.f.splice(L.i, 1, n);
    return { ok: 'rootSquare', p: { x, n: n.v, v: g.v }, born: [n.id], origins: fromOne(f, [n]) };
  }
  if (squarePiece(g)) {
    if (S.op === '=') return { no: 'rootSquareEq', p: { x, b: bx(g.b) }, ids: [id] };
    const v = V(g.b, g.e / 2);
    L.term.f.splice(L.i, 1, v);
    const c = condHTML(addCond(S, [T([V(g.b, 1)])], 'ge'));
    return { ok: 'rootSquareIf', p: { x, n: mx(fx(v)), c }, born: [v.id], origins: fromOne(f, [v]) };
  }
  return { no: 'rootTap', p: { x }, ids: [id] };
});

// x³ → x · x · x
defineExplode('v', (S, L, id) => {
  const f = L.f;
  if (f.e < 0) return flipPower(S, L);         // a⁻² → 1/a²
  if (!isWhole(f.e)) return halfPower(S, L);   // a^½ → √a
  if (f.e < 2) return { no: 'atom', p: { x: mx(fx(f)) }, ids: [id] };
  if (f.e > MAX_VAR) return { no: 'tooBig', ids: [id] };
  const copies = Array.from({ length: f.e }, () => V(f.b, 1));
  L.term.f.splice(L.i, 1, ...copies);
  return { ok: 'explodeVar', p: { x: mx(fx(f)), n: f.e, b: bx(f.b), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: fromOne(f, copies) };
});

// 12 → 2 · 2 · 3
defineExplode('n', (S, L, id) => {
  const f = L.f;
  if (f.v === 1) return { no: 'atom', p: { x: mx('1') }, ids: [id] };
  const pf = primeFactors(f.v);
  if (pf.length < 2) return { no: 'prime', p: { n: f.v }, ids: [id] };
  const parts = pf.map(N);
  L.term.f.splice(L.i, 1, ...parts);
  return { ok: 'explodeNum', p: { n: f.v, ex: mx(pf.join(' · ')) }, born: parts.map(c => c.id), origins: fromOne(f, parts) };
});

// (a + b)² → (a + b)(a + b); 3(x + 2) → 3x + 3·2 (open the brackets: everything outside times every term inside)
defineExplode('p', (S, L, id) => {
  const f = L.f;
  if (f.e >= 2) {
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    const copies = Array.from({ length: f.e }, () => Pr(f.terms.map(cloneT)));
    L.term.f.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x: mx(fx(f)), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: fromOne(f, copies) };
  }
  // a bracket that is the whole bottom of a fraction: opening it changes nothing but loses the one piece that can
  // cancel (x(a − c) over a − c can't). A whole top still opens: (x + 1)/2 splits into terms from there
  const side = L.depth === 0 ? L.side : L.in && L.in.k === 'q' ? L.qs : null;
  if (side === 'den' && L.terms.length === 1 && L.term.f.length === 1 && !L.term.neg)
    return { no: 'bracketWhole', p: { x: mx(fx(f)) }, ids: [id] };
  const before = mx(termHTML(L.term));
  const others = L.term.f.filter(g => g !== f);
  const origins = {};
  const nts = f.terms.map(it => {
    const copies = others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; });
    // inner pieces keep their identity and slide; another bracket goes behind: a(c + d), not (c + d)a
    return T([...copies.filter(c => c.k !== 'p'), ...it.f, ...copies.filter(c => c.k === 'p')], L.term.neg !== it.neg);
  });
  L.terms.splice(L.t, 1, ...nts);
  return { ok: others.length ? 'distribute' : L.term.neg ? 'unwrapNeg' : 'unwrapSum', p: { x: before, ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins, arcs: true };
});

// (2a)³ → (2a)(2a)(2a); (2a) → 2 · a
defineExplode('g', (S, L, id) => {
  const f = L.f;
  if (f.e < 0) return flipPower(S, L);         // 2⁻³ → 1/2³
  if (!isWhole(f.e)) return halfPower(S, L);   // 9^½ → √9
  if (f.e >= 2) {
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    // one piece inside (2³, (a²)³) gives plain copies of it, not brackets: 2 · 2 · 2, which then multiply to 8
    const copies = Array.from({ length: f.e }, () => f.f.length === 1 ? cloneF(f.f[0]) : G(f.f.map(cloneF), 1));
    L.term.f.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x: mx(fx(f)), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: fromOne(f, copies) };
  }
  const items = f.f.map(cloneF);
  L.term.f.splice(L.i, 1, ...items);
  return { ok: 'unwrap', p: { x: mx(fx(f)), ex: mx(items.map(fx).join(' · ')) }, born: items.map(c => c.id), origins: fromOne(f, items) };
});
