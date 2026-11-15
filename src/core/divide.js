/* Completing the square after dividing by a: the textbook derivation of the abc-formula, every step a move.
     ax² + bx + c = 0          : a on both sides (the ordinary balance move, which writes a ≠ 0)
     (ax² + bx + c)/a = 0/a    tap 0 and a: 0/a is 0 (zeroOver); tap the big bar: one fraction per term (splitBar)
     ax²/a + bx/a + c/a = 0    cancel a, drag c/a across
     x² + bx/a = −c/a          + (b/2a)² on both sides (opCompleteSquare, a button in the balance panel)
     … + (b/2a)²               bx/a in two halves (opHalves), x out in front of each fraction (outOfFrac),
                               (b/2a)² exploded, then factored in pairs: x(x + b/2a) + b/2a(x + b/2a) → (x + b/2a)²
     (x + b/2a)² = (b² − 4ac)/4a²   the right side over one bottom (expand, join), then √ of both sides: the root
                               of 4a² is 2a (opRoot in quadratic.js), and b/2a goes across.
   The hints for this route are the branch strategy 'divide' (divideHint). */
import { loneSquare, opBalance } from './balance.js';
import { hint } from './goals/index.js';
import { defineBranchStrategy, defineHintMove } from './goals/registry.js';
import { Q } from './kinds/fraction.js';
import { G } from './kinds/group.js';
import { N } from './kinds/number.js';
import { T, cloneT, fHasU, fkey, sumKey, tHasU } from './kinds/sums.js';
import { canMerge, hasU, isOne, locate, params, unknownOf } from './model.js';
import { isEquation, pairOf } from './problem.js';
import './rules/pair.js';   // the wall rules this one goes before
import { defineAction, defineMove, definePairRule } from './rules/registry.js';
import { coefOf, genHint, monoOf, monoTerm, uDeg } from './generic.js';
import { opRoot, quadOf } from './quadratic.js';
import { opPair, pairCheck } from './rules/engine.js';
import { fracHTML, fx, mx, sumHTML, termHTML } from '../render/text.js';

const zeroSide = ts => ts.length === 1 && ts[0].f.length === 1 && ts[0].f[0].k === 'n' && ts[0].f[0].v === 0;

/* ---- 0/a = 0: tap the 0 and a piece below its bar ---- */
const barOf = (S, L) => L.qs ? L.in : !L.depth ? S.parts[L.p] : null;
const rowOf = L => L.qs || L.side;
function zeroOver(S, A, B) {
  const P = barOf(S, A);
  if (!P || P !== barOf(S, B) || isOne(P.den) || !zeroSide(P.num)) return null;
  const [Z, D] = rowOf(A) === 'num' ? [A, B] : [B, A];
  return rowOf(Z) === 'num' && rowOf(D) === 'den' ? { P, Z } : null;
}
definePairRule('bar', 'zeroOver', (S, A, B) => zeroOver(S, A, B) ? { type: 'zeroOver' } : undefined, { before: 'cancel' });
defineAction('zeroOver', (S, A, B) => {
  const { P, Z } = zeroOver(S, A, B), z = Z.f, x = mx(fracHTML(P)), d = mx(sumHTML(P.den));
  if (Z.qs) { const L = locate(S, P.id); L.term.f.splice(L.term.f.indexOf(P), 1, z); }   // a fraction in a sum: it is 0
  else P.den = [T([N(1)])];
  return { ok: 'zeroOver', p: { x, d }, born: [z.id] };
});

/* ---- the big bar of a side splits: (ax² + bx + c)/a = ax²/a + bx/a + c/a (tap the bar) ---- */
export function opSplitBar(S, p) {
  const P = S.parts[p];
  if (!isEquation(S) || !P || isOne(P.den) || P.num.length < 2) return null;
  const x = mx(fracHTML(P));
  P.num = P.num.map(t => T([Q([T(t.f, false)], P.den.map(cloneT))], t.neg));
  P.den = [T([N(1)])];
  return { ok: 'barSplit', p: { x, ex: mx(sumHTML(P.num)) }, born: P.num.map(t => t.f[0].id) };
}
defineMove('splitBar', 'part', opSplitBar);

/* ---- a fraction term in two halves: bx/a = bx/2a + bx/2a (a tool button, in equations with letters for numbers) ---- */
export function opHalves(S, id) {
  if (!isEquation(S) || !params(S).length) return null;
  let L = locate(S, id);
  if (L && L.depth && L.in && L.in.k === 'q') L = locate(S, L.in.id);   // a piece of the fraction: its term
  if (!L || L.depth) return null;
  const t = L.term, qi = t.f.findIndex(f => f.k === 'q' && f.den.length === 1);
  if (qi < 0) return null;
  const half = () => {
    const c = cloneT(t), d = c.f[qi].den[0], n = d.f.find(f => f.k === 'n');
    if (n) n.v *= 2; else d.f.unshift(N(2));
    return c;
  };
  const nts = [half(), half()];
  L.terms.splice(L.terms.indexOf(t), 1, ...nts);
  return { ok: 'halves', p: { x: mx(termHTML(t)), ex: mx(sumHTML(nts)) }, born: nts.flatMap(n => n.f.map(f => f.id)) };
}
defineMove('halves', 'piece', opHalves);

/* ---- a piece of a fraction's top out in front: bx/2a = x · b/2a (tap the piece, then the fraction) ----
   the other way round from a piece in front onto the top (intoFrac) */
function outOf(A, B) {
  for (const [I, O] of [[A, B], [B, A]])
    if (I.qs === 'num' && O.kind === 'f' && I.in === O.f && I.in.num.length === 1 && I.depth === O.depth + 1) return { I, O };
  return null;
}
definePairRule('wall', 'outOfFrac', (S, A, B) => outOf(A, B) ? { type: 'outOfFrac' } : undefined, { before: 'intoFrac' });
defineAction('outOfFrac', (S, A, B) => {
  const { I, O } = outOf(A, B), q = O.f, top = q.num[0], term = O.term, ex = mx(termHTML(term));
  top.f.splice(top.f.indexOf(I.f), 1);
  if (!top.f.length) top.f = [N(1)];
  term.f.splice(term.f.indexOf(q), 0, I.f);
  return { ok: 'outOfFrac', p: { x: mx(fx(I.f)), ex, r: mx(termHTML(term)) }, born: [I.f.id] };
});

/* ---- completing the square with a fraction: x² + bx/a → + (b/2a)² on both sides ----
   Whole numbers are added with the panel's slider (x² + 6x: + 9); a fraction can't be picked there, so the panel
   gets a button for it, labelled with what it adds. */
// x² + (top/bottom)·x on its own side: the half of top/bottom, or null
export function halfCoef(P, u) {
  if (!isOne(P.den) || P.num.length !== 2) return null;
  const sq = P.num.find(t => !t.neg && t.f.length === 1 && t.f[0].k === 'v' && t.f[0].b === u && t.f[0].e === 2);
  const lin = P.num.find(t => t !== sq);
  if (!sq || !lin) return null;
  const top = [], bot = [];
  let xs = 0;
  const take = (f, into) => { if (f.k === 'v' && f.b === u) xs += f.e; else into.push(f); };
  for (const f of lin.f) {
    if (f.k !== 'q') { take(f, top); continue; }
    if (f.num.length !== 1 || f.den.length !== 1 || f.num[0].neg || f.den[0].neg) return null;
    f.num[0].f.forEach(g => take(g, top));
    f.den[0].f.forEach(g => take(g, bot));
  }
  if (xs !== 1 || !bot.length) return null;   // a whole-number coefficient goes by the slider
  const mt = monoOf(T(top)), mb = monoOf(T(bot));
  if (!mt || !mb || mb.vars[u]) return null;
  if (mt.n % 2 === 0) mt.n /= 2; else mb.n *= 2;
  const tt = monoTerm({ ...mt, neg: false }), bt = monoTerm({ ...mb, neg: false });
  return isOne([bt]) ? tt.f : [Q([tt], [bt])];
}
export function squareOf(S, bi = 0) {
  if (!isEquation(S) || S.rel) return null;
  const u = unknownOf(S), P = pairOf(S, bi).find(P => hasU(P.num, u));
  const h = P && halfCoef(P, u);
  return h && G(h, 2);
}
export function opCompleteSquare(S, bi = 0) {
  const g = squareOf(S, bi);
  if (!g) return null;
  const h = mx(g.f.map(fx).join(''));
  const r = opBalance(S, '+', T([g]), bi);
  return r && r.ok ? { ...r, ok: 'completeSquare', p: { ...r.p, h } } : r;
}
defineMove('completeSquare', 'branch', opCompleteSquare);

/* ---- the hints for this route: a level with divide: true, or an equation where the player has started it ----
   (divided by a, or fractions or a completed square on the side with the unknown) */
const started = E => { const L = E.parts[0]; return !isOne(L.den) || L.num.some(t => t.f.some(f => f.k === 'q' || f.k === 'g')); };
defineBranchStrategy('divide', E => {
  const q = params(E).length && hasU(E.parts[0].num, unknownOf(E)) && quadOf(E);
  return q && Math.abs(q.a) > 1e-9 && (E.divide || started(E)) ? q : null;
}, E => divideHint(E), { before: 'generic' });

const dry = (E, fn) => fn(JSON.parse(JSON.stringify(E)));
const pieces = ts => ts.flatMap(t => t.f);
export function divideHint(E) {
  const u = unknownOf(E), [L, R] = E.parts;
  // 1. x² alone in front: divide both sides by what stands before it
  const t2 = L.num.find(t => uDeg(t, u) === 2);
  if (isOne(L.den) && !started(E) && t2) {
    const A = coefOf(t2, u);
    if (A && (A.n !== 1 || A.neg || Object.keys(A.vars).length)) {
      const v = monoTerm(A);
      return { k: 'hDivA', p: { v: mx(termHTML(v)), u: `<i class="mv">${u}</i>` }, ids: ['op'], balance: { op: ':', value: v } };
    }
  }
  // 2. 0/a is 0, and the big bar splits into one fraction per term
  for (const P of [R, L]) if (!isOne(P.den) && zeroSide(P.num)) return { k: 'hZeroOver', p: { d: mx(sumHTML(P.den)) }, ids: [P.num[0].f[0].id, P.den[0].f[0].id] };
  if (!isOne(L.den) && L.num.length > 1) return { k: 'hSplitBar', p: { x: mx(fracHTML(L)) }, ids: L.num.map(t => t.id), bar: true };
  // 3. cancel inside a fraction (ax²/a), then the terms without the unknown go to the right
  for (const t of L.num) for (const q of t.f.filter(f => f.k === 'q')) for (const x of pieces(q.num)) for (const y of pieces(q.den)) {
    const v = pairCheck(E, locate(E, x.id), locate(E, y.id));
    if (v.type === 'cancel') return { k: 'hCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
  }
  const t0 = L.num.filter(t => !tHasU(t, u));
  // c/a − c/a: like terms first (joined over a, then c − c)
  const hl = hint({ parts: [L], op: null, goal: 'simplify' });
  if (hl.k === 'hLike') return hl;
  // x² + Bx + C with B² = 4C: the square is complete (by the parameters' test values, like quadOf)
  const lq = quadOf({ parts: [L, { num: [T([N(0)])], den: [T([N(1)])] }], op: '=', unknown: u });
  const square = lq && Math.abs(lq.a - 1) < 1e-9 && Math.abs(lq.b * lq.b - 4 * lq.c) < 1e-9 * Math.max(1, lq.c);
  if (t0.length && !square) {
    const t = t0[0], id = L.num.length > 1 ? t.id : t.f[0].id;
    return { k: 'hBalanceTerm', p: { x: mx(sumHTML([t])), op: t.neg ? '+' : '−', v: mx(termHTML(t)), side: 'left' }, ids: [id, 'op'], drag: id };
  }
  // 4. x² + bx/a: add the square of half of b/a
  const g = squareOf(E);
  if (g) return { k: 'hCompleteFrac', p: { x: mx(sumHTML(L.num)), s: mx(fx(g)) }, ids: ['op'], square: true };
  // 5. the left side into (x + b/2a)²: two halves, x out of each fraction, explode, factor in pairs, merge
  if (!loneSquare(L) && square) {
    const xs = t => t.f.reduce((n, f) => n + (f.k === 'v' && f.b === u ? f.e : f.k === 'q' ? pieces(f.num).filter(g => g.k === 'v' && g.b === u).reduce((m, g) => m + g.e, 0) : 0), 0);
    const lin = L.num.filter(t => xs(t) === 1);
    const qx = t => t.f.find(f => f.k === 'q' && f.num.some(n => tHasU(n, u)));
    if (lin.length === 1 && qx(lin[0])) return { k: 'hHalves', p: { x: mx(termHTML(lin[0])) }, ids: [qx(lin[0]).id] };
    for (const t of L.num) { const q = qx(t); if (q) { const x = q.num[0].f.find(f => fHasU(f, u)); return { k: 'hOutOfFrac', p: { x: mx(fx(x)), q: mx(fx(q)) }, ids: [x.id, q.id] }; } }
    for (const t of L.num) for (const f of t.f) if ((f.k === 'v' && f.b === u && f.e === 2 && t.f.length === 1) || (f.k === 'g' && !t.f.some(h => h.k === 'p'))) return { k: f.k === 'g' ? 'hGroup' : 'hExplodeVar', p: { x: mx(fx(f)), b: `<i class="mv">${u}</i>`, y: mx(fx(f)) }, ids: [f.id] };
    for (const t of L.num) { const ps = t.f.filter(f => f.k === 'p'); if (ps.length === 2 && canMerge(ps[0], ps[1])) return { k: 'hMerge', p: { x: mx(fx(ps[0])), y: mx(fx(ps[1])) }, ids: [ps[0].id, ps[1].id] }; }
    // a shared piece of two neighbouring terms (a bracket first)
    for (let i = 0; i + 1 < L.num.length; i++) {
      const [a, b] = [L.num[i], L.num[i + 1]];
      const pick = kinds => { for (const f of a.f) if (kinds(f)) { const m = b.f.find(h => fkey(h) === fkey(f)); if (m) return [f, m]; } return null; };
      const pr = pick(f => f.k === 'p') || (!a.f.some(f => f.k === 'p') && !b.f.some(f => f.k === 'p') && pick(() => true));
      if (pr) return { k: 'hFactor', p: { x: mx(fx(pr[0])), y: mx(fx(pr[1])) }, ids: pr.map(f => f.id) };
    }
  }
  // 6. the right side as one fraction, then the root of both sides
  if (loneSquare(L)) {
    const h = hint({ parts: [R], op: null, goal: 'combine' });
    if (h.k !== 'hDone') return h;
    const r = dry(E, c => opRoot(c));
    if (r && r.ok) { const pid = -loneSquare(L).id; return { k: 'hRoot', p: { s: r.p.s }, ids: [pid, 'op'], drag: pid }; }
  }
  return genHint(E, u);
}
defineHintMove(h => h.k === 'hCompleteFrac', (S, h) => opCompleteSquare(S, h.bi || 0));
defineHintMove(h => h.k === 'hSplitBar', (S, h) => opSplitBar(S, locate(S, h.ids[0]).p));
defineHintMove(h => h.k === 'hHalves', (S, h) => opHalves(S, h.ids[0]));
