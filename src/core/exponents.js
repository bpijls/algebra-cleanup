/* Negative and half exponents (a⁻², a^½, a^(3/2)), with nothing hidden: a negative power is the same power on
   the other side of the bar (a⁻² = 1/a²), a half is a root (a^½ = √a), and a⁵ · a⁻² only becomes a³ after the
   player has seen a⁻² as 1/a² and cancelled. Exploding does the first two (called from rules/explode.js); two
   tool moves write a result back as a power (1/a² = a⁻², √a = a^½), for levels that ask for that (S.asPower).
   The moves only exist once a problem has such exponents (S.exps), so the earlier levels don't change. */
import { Pr } from './kinds/bracket.js';
import { isWhole } from './kinds/exponent.js';
import { Q } from './kinds/fraction.js';
import { G } from './kinds/group.js';
import { V } from './kinds/letter.js';
import { N } from './kinds/number.js';
import { Rt } from './kinds/root.js';
import { T, cloneF, fkey } from './kinds/sums.js';
import { eachFactor, locate } from './model.js';
import { defineMove } from './rules/registry.js';
import { defineHintMove } from './goals/registry.js';
import { fx, mx } from '../render/text.js';

// the same piece with another exponent
export const withE = (f, e) => f.k === 'v' ? V(f.b, e) : G(f.f.map(cloneF), e);
// what a power is a power of: a letter, or the product in a bracket (a⁵ and a⁻² have the same base)
export const baseKey = f => f.k === 'v' ? 'v' + f.b : f.k === 'g' ? 'g' + fkey({ ...f, e: 1 }) : null;
// a power that isn't a plain whole one: a⁻², a^½
export const oddPower = f => (f.k === 'v' || f.k === 'g') && (f.e < 0 || !isWhole(f.e));
const one = () => T([N(1)]);
const over = f => Q([one()], [T([f])]);   // 1/f

// the bar a piece sits against, when its side is one term: the problem's own bar, or a fraction's in a sum
function barOf(S, L) {
  if (L.qs) return L.in[L.qs].length === 1 ? { P: L.in, side: L.qs } : null;
  if (!L.depth) return S.parts[L.p][L.side].length === 1 ? { P: S.parts[L.p], side: L.side } : null;
  return null;
}
const across = side => side === 'num' ? 'den' : 'num';
// a factor onto one side of a fraction: into its one term, or times the sum as a whole
function putOn(P, side, f) {
  if (P[side].length === 1) P[side][0].f.push(f);
  else P[side] = [T([Pr(P[side]), f])];
}

/* a⁻² → 1/a²: the same power on the other side of the bar, written as a fraction of its own in its place. The
   player then multiplies it in by hand: a⁵ · 1/a² → a⁵/a² (tap a⁵, then the fraction), and against a bar that is
   drawn the small bottom goes across the big bar ((1/a³)/(2a²) → 1/(2a²·a³), fracOnFrac in core/fractions.js).
   So a negative power never jumps across a bar in one step. */
export function flipPower(S, L) {
  const f = L.f, q = over(withE(f, -f.e));
  L.term.f.splice(L.i, 1, q);
  return { ok: 'negPower', p: { x: mx(fx(f)), ex: mx(fx(q)) }, born: [q.id], origins: { [q.id]: [f.id] } };
}

/* a^½ → √a; a^(3/2) → a · a^½ (the whole part comes off first) */
export function halfPower(S, L) {
  const f = L.f;
  if (f.e === 0.5) {
    const r = Rt([T(f.k === 'v' ? [V(f.b, 1)] : f.f.map(cloneF))]);
    L.term.f.splice(L.i, 1, r);
    return { ok: 'halfRoot', p: { x: mx(fx(f)), ex: mx(fx(r)) }, born: [r.id], origins: { [r.id]: [f.id] } };
  }
  const w = withE(f, Math.floor(f.e)), h = withE(f, 0.5);
  L.term.f.splice(L.i, 1, w, h);
  return { ok: 'halfSplit', p: { x: mx(fx(f)), ex: mx(fx(w) + ' · ' + fx(h)), w: mx(fx(w)), h: mx(fx(h)) }, born: [w.id, h.id], origins: { [w.id]: [f.id], [h.id]: [f.id] } };
}

/* 1/a² → a⁻²: a letter (or a power of a product) below the bar goes on top with the opposite exponent */
export function opToNeg(S, id) {
  if (!S.exps) return null;
  const L = locate(S, id);
  if (!L || L.kind !== 'f' || (L.f.k !== 'v' && L.f.k !== 'g')) return null;
  const B = barOf(S, L);
  if (!B || B.side !== 'den') return null;
  const f = L.f, up = withE(f, -f.e), x = mx(fx(over(cloneF(f))));
  L.term.f.splice(L.i, 1);
  putOn(B.P, 'num', up);
  return { ok: 'toNeg', p: { x, ex: mx(fx(up)) }, born: [up.id], origins: { [up.id]: [f.id] } };
}
defineMove('toNeg', 'piece', opToNeg);

/* √a → a^½, √5 → 5^½, √(2a) → (2a)^½: a root of one term is the power ½ */
export function opToHalf(S, id) {
  if (!S.exps) return null;
  const L = locate(S, id);
  if (!L || L.kind !== 'f' || L.f.k !== 'r' || L.f.terms.length !== 1) return null;
  const t = L.f.terms[0];
  if (t.neg || !t.f.every(g => g.k === 'n' || g.k === 'v')) return null;
  const g = t.f[0], nf = t.f.length === 1 && g.k === 'v' && g.e === 1 ? V(g.b, 0.5) : G(t.f.map(cloneF), 0.5);
  L.term.f.splice(L.i, 1, nf);
  return { ok: 'toHalf', p: { x: mx(fx(L.f)), ex: mx(fx(nf)) }, born: [nf.id], origins: { [nf.id]: [L.f.id] } };
}
defineMove('toHalf', 'piece', opToHalf);

/* ---- what is left, for Done? and isSimplified ---- */
// a negative or half power still to write out (unless the level asks for powers), or, when it does, a root or
// a letter below the bar still to write as a power
export function powerLeft(S) {
  let hit = null;
  eachFactor(S, L => {
    if (hit) return;
    const f = L.f;
    if (!S.asPower) { if (oddPower(f)) hit = { k: f.e < 0 ? 'nyNegPower' : 'nyHalfPower', f }; return; }
    if (f.k === 'r' && f.terms.some(t => t.f.some(g => g.k === 'v'))) hit = { k: 'nyAsRoot', f };
    else if ((f.k === 'v' || f.k === 'g') && ((L.qs === 'den') || (!L.qs && !L.depth && L.side === 'den'))) hit = { k: 'nyAsBar', f };
  });
  return hit;
}

/* ---- hints ---- */
// a⁻²: explode it (in a level that asks for powers, only when it has to meet a positive power of the same base)
// (in a level that asks for powers only when a positive power of the same base is in the same term: a⁵ · a⁻²;
// a bottom goes up instead, 1/a² = a⁻²)
export function negPowers(S) {
  if (!S.exps) return null;
  let h = null;
  eachFactor(S, L => {
    if (h || !baseKey(L.f) || L.f.e >= 0) return;
    if (S.asPower && !L.term.f.some(g => baseKey(g) === baseKey(L.f) && g.e > 0)) return;
    h = { k: 'hNegPower', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
  });
  return h;
}
// a^½: explode it into a root (after merging: a^½ · a^½ = a first)
export function halfPowers(S) {
  if (!S.exps || S.asPower) return null;
  let h = null;
  eachFactor(S, L => { if (!h && oddPower(L.f) && L.f.e > 0) h = { k: 'hHalfPower', p: { x: mx(fx(L.f)) }, ids: [L.f.id] }; });
  return h;
}
// written as a power: a root of letters becomes a power ½, a letter below the bar goes up with a minus
export function asPowers(S) {
  if (!S.asPower) return null;
  const left = powerLeft(S);
  if (!left) return null;
  return { k: left.k === 'nyAsRoot' ? 'hToHalf' : 'hToNeg', p: { x: mx(fx(left.f)) }, ids: [left.f.id] };
}
defineHintMove(h => h.k === 'hToNeg', (S, h) => opToNeg(S, h.ids[0]));
defineHintMove(h => h.k === 'hToHalf', (S, h) => opToHalf(S, h.ids[0]));
