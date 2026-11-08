/* Exponential equations (2ˣ = 8, 3^(x+1) = 27, 2ˣ = 5): the moves and the hints.
   - exploding 2^(x+1) gives 2ˣ · 2 (one exponent term comes off); exploding 4ˣ explodes its base, 2ˣ · 2ˣ
   - 8 = 2³: a number that is a power of the equation's base can be written as one (a tool button, labelled)
   - the same base on both sides: the exponents are equal (drag the power across the =, opExpBase)
   - otherwise: log of both sides (opLogBoth), and log(2ˣ) = x·log 2 is the earned shortcut (topics/log/rules.js) */
import '../../core/goals/index.js';
import { defineHintMove, defineBranchStrategy } from '../../core/goals/registry.js';
import { hint } from '../../core/goals/index.js';
import { pairHint } from '../../core/generic.js';
import { defineDragHook } from '../../core/balance.js';
import { G } from '../../core/kinds/group.js';
import { N } from '../../core/kinds/number.js';
import { V } from '../../core/kinds/letter.js';
import { F, T, cloneF, cloneT, fHasU, tHasU } from '../../core/kinds/sums.js';
import { eachFactor, hasU, isOne, locate, primeFactors, unknownOf } from '../../core/model.js';
import { hasBranch, pairOf, relOf } from '../../core/problem.js';
import { sideView } from '../../core/quadratic.js';
import { opExplode } from '../../core/rules/engine.js';
import { defineExplode, defineMove } from '../../core/rules/registry.js';
import { GEN, pick } from '../../practice.js';
import { defineHTML, fracHTML, fx, mx, relHTML, sumHTML } from '../../render/text.js';
import { Lg } from '../log/kind.js';
import { Ex } from './kind.js';

const expHTML = terms => terms.length === 1 && terms[0].f.length === 1 && !terms[0].neg ? sumHTML(terms) : `(${sumHTML(terms)})`;
defineHTML('ex', 2, f => `<span class="mn">${f.b}</span><sup>${expHTML(f.terms)}</sup>`);

// 2^(x+1) → 2ˣ · 2¹ (normalize makes that 2); 4ˣ → 2ˣ · 2ˣ (4 = 2 · 2, and each 2 gets the power)
defineExplode('ex', (S, L, id) => {
  const f = L.f, x = mx(fx(f));
  let made;
  if (f.terms.length > 1) made = [Ex(f.b, [cloneT(f.terms[0])]), Ex(f.b, f.terms.slice(1).map(cloneT))];
  else if (primeFactors(f.b).length > 1) made = primeFactors(f.b).map(p => Ex(p, f.terms.map(cloneT)));
  else return { no: 'expAtom', p: { x }, ids: [id] };
  L.term.f.splice(L.i, 1, ...made);
  return { ok: f.terms.length > 1 ? 'expSum' : 'expBaseSplit', p: { x, ex: mx(made.map(fx).join(' · ')), b: f.b, ps: primeFactors(f.b).join(' · ') }, born: made.map(m => m.id), origins: Object.fromEntries(made.map(m => [m.id, [f.id]])) };
});

// the base of an equation's power (the smallest: 4ˣ counts as 2), when there is one
const baseOf = S => { let b = null; eachFactor(S, L => { if (!b && L.f.k === 'ex') b = primeFactors(L.f.b)[0]; }); return b; };
const powerOf = (n, b) => { let k = 0; while (n > 1 && n % b === 0) { n /= b; k++; } return n === 1 ? k : 0; };

/* 8 = 2³: in an equation with 2ˣ, a number that is a power of 2 can be written as one */
export function opAsPower(S, id) {
  const L = locate(S, id), b = baseOf(S);
  if (!b || !L || L.kind !== 'f' || L.f.k !== 'n') return null;
  const k = powerOf(L.f.v, b);
  if (k < 2) return null;
  const g = G([N(b)], k);
  L.term.f.splice(L.i, 1, g);
  return { ok: 'asPowerOf', p: { x: L.f.v, ex: mx(fx(g)), b }, born: [g.id], origins: { [g.id]: [L.f.id] } };
}
defineMove('asPower', 'piece', opAsPower);

/* the same base on both sides, 2ˣ = 2³: then the exponents are equal, x = 3 */
function powerSide(P) {
  if (P.num.length !== 1 || !isOne(P.den)) return null;
  const t = P.num[0];
  if (t.neg || t.f.length !== 1) return null;
  const f = t.f[0];
  if (f.k === 'ex') return { b: f.b, terms: f.terms.map(cloneT), ex: true };
  if (f.k === 'g' && f.f.length === 1 && f.f[0].k === 'n' && Number.isInteger(f.e)) return { b: f.f[0].v, terms: [T([N(Math.abs(f.e))], f.e < 0)] };
  if (f.k === 'n' && f.v > 1) return { b: f.v, terms: [T([N(1)])] };
  return null;
}
export function opExpBase(S, bi = 0) {
  if (!hasBranch(S, bi) || S.goal === 'prove') return null;
  const parts = pairOf(S, bi), sides = parts.map(powerSide);
  if (!parts.some(P => P.num.some(t => t.f.some(f => f.k === 'ex')))) return null;
  if (sides.some(s => !s)) return { no: 'expBaseShape', ids: [] };
  if (sides[0].b !== sides[1].b) return { no: 'expBaseDiff', p: { a: sides[0].b, b: sides[1].b }, ids: [] };
  const before = mx(parts.map(P => fracHTML(P)).join(` ${relHTML(relOf(S))} `));
  parts.forEach((P, i) => { P.num = sides[i].terms; });
  return { ok: 'expBaseEq', p: { x: before, b: sides[0].b, ex: mx(parts.map(P => fracHTML(P)).join(` ${relHTML(relOf(S))} `)) }, born: [] };
}
defineMove('expBase', 'branch', opExpBase);
// dragging the power across the = (a power alone on its side) is that move
defineDragHook((S, L, { ts, top, bi }) => L.kind === 'f' && L.f.k === 'ex' && L.depth === 0 && ts.length === 1 && top.f.length === 1 ? { run: s => opExpBase(s, bi) } : null);

/* log of both sides: 2ˣ = 5 → log(2ˣ) = log 5. Both sides are positive (a power of a number, a positive number) */
const positive = P => isOne(P.den) && P.num.length === 1 && !P.num[0].neg && P.num[0].f.every(f => f.k === 'n' || f.k === 'ex' || (f.k === 'g' && f.f.every(g => g.k === 'n')));
export function opLogBoth(S, bi = 0) {
  if (!hasBranch(S, bi) || S.goal === 'prove') return null;
  const parts = pairOf(S, bi);
  if (!parts.some(P => P.num.some(t => t.f.some(f => f.k === 'ex')))) return null;
  if (!parts.every(positive)) return { no: 'logBothShape', ids: [] };
  parts.forEach(P => { P.num = [T([Lg(P.num)])]; });
  return { ok: 'logBoth', p: { ex: mx(parts.map(P => fracHTML(P)).join(` ${relHTML(relOf(S))} `)) }, born: parts.map(P => P.num[0].f[0].id) };
}
defineMove('logBoth', 'branch', opLogBoth);

/* ---- hints: an exponential equation, branch by branch ---- */
const hasEx = E => { let h = false; eachFactor(E, L => { if (L.f.k === 'ex') h = true; }); return h; };
const hasLog = E => { let h = false; eachFactor(E, L => { if (L.f.k === 'log') h = true; }); return h; };
export function expHint(E) {
  const u = unknownOf(E), [L, R] = E.parts;
  // a side that is one power (2ˣ, 2³) stays as it is: tidying 2³ would undo writing 8 as a power
  for (const P of E.parts) { if (powerSide(P)) continue; const h = hint(sideView(P)); if (h.k !== 'hDone') return h; }
  const inL = hasU([...L.num, ...L.den], u), inR = hasU([...R.num, ...R.den], u);
  if (!inL && inR) return { k: 'hSwap', p: { b: mx(`<i class="mv">${u}</i>`) }, ids: ['op'] };
  if (L.num.length !== 1 || !isOne(L.den)) return pairHint(E);
  const t = L.num[0], ex = t.f.find(f => f.k === 'ex');
  // log(2ˣ): the shortcut makes it x · log 2
  const lg = t.f.find(f => f.k === 'log' && f.terms.some(it => tHasU(it, u)));
  if (lg) return { k: 'hLogPower', p: { x: mx(fx(lg)) }, ids: [lg.id] };
  if (ex) {
    const others = t.f.filter(f => f !== ex);
    if (others.length) {   // 5 · 2ˣ = 40: divide by 5 first
      if (others.some(f => f.k !== 'n')) return pairHint(E);
      const v = T(others.map(cloneF), t.neg);
      return { k: 'hExpDiv', p: { v: mx(fx(others[0])) }, ids: [others[0].id, 'op'], drag: others[0].id, balance: { op: ':', value: v } };
    }
    if (primeFactors(ex.b).length > 1) return { k: 'hExpSplit', p: { x: mx(fx(ex)), b: ex.b }, ids: [ex.id] };
    const r = R.num.length === 1 && isOne(R.den) && !R.num[0].neg && R.num[0].f.length === 1 ? R.num[0].f[0] : null;
    if (r && r.k === 'n' && r.v !== ex.b && powerOf(r.v, ex.b) >= 2) return { k: 'hAsPowerOf', p: { x: r.v, b: ex.b }, ids: [r.id] };
    if (r && powerSide(R) && powerSide(R).b === ex.b) return { k: 'hExpBase', p: { b: ex.b }, ids: [ex.id, 'op'] };
    return { k: 'hLogBoth', p: { x: mx(fx(ex)) }, ids: ['op'] };
  }
  // x · log 2 = log 5: divide both sides by log 2
  const c = t.f.find(f => f.k === 'log' && !fHasU(f, u));
  if (c && t.f.some(f => f.k === 'v' && f.b === u)) return { k: 'hExpDivLog', p: { v: mx(fx(c)) }, ids: [c.id, 'op'], drag: c.id, balance: { op: ':', value: T([cloneF(c)]) } };
  return pairHint(E);
}
defineBranchStrategy('exponential', E => hasEx(E) || hasLog(E), E => expHint(E), { before: 'generic' });
defineHintMove(h => h.k === 'hExpSplit' || h.k === 'hLogPower', (S, h) => opExplode(S, h.ids[0]));
defineHintMove(h => h.k === 'hAsPowerOf', (S, h) => opAsPower(S, h.ids[0]));
defineHintMove(h => h.k === 'hExpBase', (S, h) => opExpBase(S, h.bi || 0));
defineHintMove(h => h.k === 'hLogBoth', (S, h) => opLogBoth(S, h.bi || 0));

/* ---- practice ---- */
const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// log(2ˣ) = x·log 2 is earned in the logarithm skill; a problem that needs it says it has it
export const EARNED = ['logPower'];
const eq = (L, R, u = 'x', earned) => ({ parts: [F(L), F(R)], op: '=', goal: 'solve', ...(u !== 'x' ? { unknown: u } : {}), ...(earned ? { earned: EARNED } : {}) });
const x = (u = 'x') => T([V(u, 1)]);
GEN.expeq = d => {
  const b = pick([2, 3]), k = r(2, b === 2 ? 5 : 3), c = r(2, 6);
  if (d === 1) return eq([T([Ex(b, [x()])])], [T([N(b ** k)])]);
  if (d === 2) return pick([
    () => eq([T([Ex(b, [x(), T([N(1)])])])], [T([N(b ** (k + 1))])]),
    () => eq([T([N(c), Ex(b, [x()])])], [T([N(c * b ** k)])]),
  ])();
  return pick([
    () => eq([T([Ex(b * b, [x()])])], [T([N(b ** (2 * k - 1))])]),
    () => eq([T([Ex(b, [x()])])], [T([N(pick([5, 7, 10, 11].filter(n => n % b)))])], 'x', true),
    () => eq([T([N(c), Ex(b, [x(), T([N(1)])])])], [T([N(c * b ** (k + 1))])]),
  ])();
};
// growth: a start value times a factor per step (doubling, tripling), unknown t
GEN.growth = d => {
  const b = d === 1 ? 2 : pick([2, 3]), k = r(2, b === 2 ? 6 : 4), c = d === 1 ? 1 : pick([3, 5, 10, 100]);
  return eq(c === 1 ? [T([Ex(b, [x('t')])])] : [T([N(c), Ex(b, [x('t')])])], [T([N(c * b ** k)])], 't');
};
