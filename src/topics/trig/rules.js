/* Goniometry, the moves. Exploding a sine or cosine shows what it is made of, and what that is depends on
   what is inside:
     sin²a           → sin a · sin a                          (a power, like any other)
     sin(a + b)      → sin a cos b + cos a sin b              (the sum formula: the one rule taken from the
     cos(a + b)      → cos a cos b − sin a sin b               unit circle, like log(ab) = log a + log b)
     sin(−a), cos(−a)→ −sin a, cos a                          (the mirror in the x-axis)
     sin 30°         → ½                                      (the height on the unit circle; ½ goes below the bar)
     tan a           → sin a / cos a                          (what tan is)
   sin 2a is not a rule: write 2a as a + a (the split sheet) and explode that. And on a sum, two moves:
   sin²a + cos²a = 1 (tap the two, with exactly equal rest), and the button cos²a = 1 − sin²a. */
import '../../core/goals/index.js';
import { addProveTactic } from '../../core/goals/prove.js';
import { addTactic, defineHintMove } from '../../core/goals/registry.js';
import { Pr } from '../../core/kinds/bracket.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { Q } from '../../core/kinds/fraction.js';
import { Rt } from '../../core/kinds/root.js';
import { F, T, cloneF, cloneT, fkey } from '../../core/kinds/sums.js';
import { MAX_GROUP, containers, eachFactor, locate } from '../../core/model.js';
import { opSplitTwo } from '../../core/moves.js';
import { opExplode, play } from '../../core/rules/engine.js';
import { defineAction, defineExplode, defineMove, definePairRule } from '../../core/rules/registry.js';
import { GEN } from '../../practice.js';
import { defineHTML, fx, mx, sumHTML, termHTML } from '../../render/text.js';
import { OTHER, Tr, atomicTrig, base, exact, pureNum } from './kind.js';

const trFrom = (f, made) => Object.fromEntries(made.map(c => [c.id, [f.id]]));
// the value as text: ½, −½√3, 1
export const valueHTML = v => v.zero ? '0' : (v.sign < 0 ? '−' : '') + (v.den === 2 ? '½' : '') + (v.root > 1 ? '√' + v.root : v.den === 2 ? '' : '1');

defineExplode('trig', (S, L, id) => {
  const f = L.f, x = mx(fx(f)), arg = f.terms;
  // sin²a → sin a · sin a
  if (f.e >= 2) {
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    const copies = Array.from({ length: f.e }, () => Tr(f.fn, arg.map(cloneT)));
    L.term.f.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x, ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: trFrom(f, copies) };
  }
  // tan a = sin a / cos a: the cos goes to the other side of the bar, so the term must be a whole top or bottom
  if (f.fn === 'tan') {
    const P = S.parts[L.p], other = L.side === 'num' ? 'den' : 'num';
    if (L.depth || P[L.side].length !== 1 || P[other].length !== 1) return { no: 'tanSum', p: { x }, ids: [id] };
    const s = Tr('sin', arg.map(cloneT)), c = Tr('cos', arg.map(cloneT));
    L.term.f.splice(L.i, 1, s); P[other][0].f.push(c);
    return { ok: 'tanSinCos', p: { x, s: mx(fx(s)), c: mx(fx(c)) }, born: [s.id, c.id], origins: trFrom(f, [s, c]) };
  }
  // the sum formulas: the first term against the rest
  if (arg.length > 1) {
    const u = [cloneT(arg[0])], v = arg.slice(1).map(cloneT), others = L.term.f.filter(g => g !== f), origins = {};
    const mk = (a, b, neg) => {
      const fs = [...others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; }), a, b];
      origins[a.id] = [f.id]; origins[b.id] = [f.id];
      return T(fs, L.term.neg !== neg);
    };
    const U = fn => Tr(fn, u.map(cloneT)), W = fn => Tr(fn, v.map(cloneT));
    const nts = f.fn === 'sin' ? [mk(U('sin'), W('cos'), false), mk(U('cos'), W('sin'), false)] : [mk(U('cos'), W('cos'), false), mk(U('sin'), W('sin'), true)];
    const before = mx(termHTML(L.term));
    L.terms.splice(L.t, 1, ...nts);
    return { ok: f.fn === 'sin' ? 'trigSumSin' : 'trigSumCos', p: { x: before, ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins, arcs: true };
  }
  const t = arg[0];
  // sin(−a) = −sin a, cos(−a) = cos a: the point mirrored in the x-axis
  if (t.neg) {
    t.neg = false;
    if (f.fn === 'sin') L.term.neg = !L.term.neg;
    return { ok: f.fn === 'sin' ? 'trigOdd' : 'trigEven', p: { x, r: mx(fx(f)) }, born: [f.id] };
  }
  // an angle on the table: its exact value
  if (pureNum(t)) {
    const v = exact(f.fn, t.f[0].v);
    if (!v) return { no: 'trigNoValue', p: { x }, ids: [id] };
    const P = S.parts[L.p], other = L.side === 'num' ? 'den' : 'num';
    if (v.zero) {
      if (L.side === 'den') return { no: 'trigZeroDen', p: { x }, ids: [id] };
      const z = N(0); L.term.f = [z]; L.term.neg = false;
      return { ok: 'trigValue', p: { x, v: mx('0') }, born: [z.id] };
    }
    const top = v.root > 1 ? Rt([T([N(v.root)])]) : N(1);
    // inside a sum (or a bracket) the half is a fraction of its own: sin 30° + cos 60° = ½ + ½
    if (v.den === 2 && (L.depth || P[L.side].length !== 1 || P[other].length !== 1)) {
      const q = Q([T([top])], [T([N(2)])]);
      L.term.f.splice(L.i, 1, q);
      if (v.sign < 0) L.term.neg = !L.term.neg;
      return { ok: 'trigValue', p: { x, v: mx(valueHTML(v)) }, born: [q.id] };
    }
    L.term.f.splice(L.i, 1, top);
    if (v.sign < 0) L.term.neg = !L.term.neg;
    const born = [top.id];
    if (v.den === 2) { const two = N(2); P[other][0].f.push(two); born.push(two.id); }
    return { ok: 'trigValue', p: { x, v: mx(valueHTML(v)) }, born };
  }
  // sin 2a is not 2 sin a: split the angle first
  if (t.f.some(g => g.k === 'n' && g.v > 1)) return { no: 'trigDouble', p: { x }, ids: [id] };
  return { no: 'trigAtom', p: { x }, ids: [id] };
});

/* ---- sin²a + cos²a = 1 ---- */
const trIsSq = f => f.k === 'trig' && f.e === 2 && OTHER[f.fn];
const trRest = (t, f) => (t.neg ? '-' : '+') + t.f.filter(g => g !== f).map(fkey).sort().join('.');
// two terms: one with sin²u, one with cos²u, everything else exactly equal
definePairRule('sum', 'pythagoras', (S, A, B) => {
  if (A.term === B.term || !trIsSq(A.f) || !trIsSq(B.f) || A.f.fn === B.f.fn || base(A.f).slice(3) !== base(B.f).slice(3)) return undefined;
  if (trRest(A.term, A.f) === trRest(B.term, B.f)) return { type: 'pyth' };
  return { type: 'fizzle', msg: 'pythUnequal', p: { x: mx(termHTML(A.term)), y: mx(termHTML(B.term)) } };
}, { before: 'sameTerm' });
// two different sines or cosines in two terms: not like terms, and neither goes outside brackets
definePairRule('sum', 'trigs', (S, A, B) => A.f.k === 'trig' && B.f.k === 'trig' && fkey(A.f) !== fkey(B.f) ? { type: 'none' } : undefined, { before: 'likeTerms' });
defineAction('pyth', (S, A, B) => {
  const terms = A.terms, rest = A.term.f.filter(g => g !== A.f).map(cloneF);
  const nt = T(rest.length ? rest : [N(1)], A.term.neg);
  const p = { x: mx(termHTML(A.term)), y: mx(termHTML(B.term)), r: mx(termHTML(nt)) };
  const at = Math.min(terms.indexOf(A.term), terms.indexOf(B.term));
  terms.splice(terms.indexOf(A.term), 1); terms.splice(terms.indexOf(B.term), 1);
  terms.splice(at, 0, nt);
  return { ok: 'pythOne', p, born: nt.f.map(g => g.id) };
});

// the button: cos²a = 1 − sin²a (and sin²a = 1 − cos²a), the same fact read the other way
export function opPythSwap(S, id) {
  const L = locate(S, id);
  if (!L || L.kind !== 'f' || !trIsSq(L.f)) return null;
  const f = L.f, others = L.term.f.filter(g => g !== f);
  const keep = () => others.map(cloneF);
  const o = Tr(OTHER[f.fn], f.terms.map(cloneT), 2);
  const nts = [T(others.length ? keep() : [N(1)], L.term.neg), T([...keep(), o], !L.term.neg)];
  L.terms.splice(L.t, 1, ...nts);
  return { ok: 'pythSwap', p: { x: mx(fx(f)), ex: mx('1 − ' + fx(o)) }, born: nts.flatMap(t => t.f.map(g => g.id)), origins: trFrom(f, nts.flatMap(t => t.f)) };
}
defineMove('pythSwap', 'piece', opPythSwap);

/* ---- hints ---- */
const trTries = (S, run) => { const { r } = play(S, run); return r && !r.no; };
// explode what isn't atomic yet: a power of one that is, tan, a mirrored angle, a table angle, a sum; split 2a
export function explodeTrig(S) {
  let h = null;
  eachFactor(S, L => {
    if (h || L.f.k !== 'trig') return;
    const f = L.f, x = mx(fx(f));
    if (atomicTrig(f)) return;
    const t = f.terms[0];
    if (f.e === 1 && f.fn !== 'tan' && f.terms.length === 1 && !t.neg && !pureNum(t) && t.f.some(g => g.k === 'n' && g.v > 1)) {
      const piece = t.f.find(g => g.k !== 'n');
      if (piece) h = { k: 'hSplitAngle', p: { x, t: mx(termHTML(t)) }, ids: [piece.id], term: t.id, split: 1 };
      return;
    }
    if (trTries(S, s => opExplode(s, f.id))) h = { k: 'hExplodeTrig', p: { x }, ids: [f.id] };
  });
  return h;
}
// sin²a + cos²a with the same rest: they make 1
export function pythPairs(S) {
  for (const ts of containers(S))
    for (const a of ts) for (const b of ts) {
      if (a === b) continue;
      const fa = a.f.find(trIsSq), fb = fa && b.f.find(g => trIsSq(g) && g.fn !== fa.fn && base(g).slice(3) === base(fa).slice(3));
      if (fb && trRest(a, fa) === trRest(b, fb)) return { k: 'hPyth', p: { x: mx(termHTML(a)), y: mx(termHTML(b)) }, ids: [fa.id, fb.id] };
    }
  return null;
}
addTactic('simplify', explodeTrig, { before: 'merges' });
addTactic('simplify', pythPairs, { before: 'likeTerms' });
// across the =: one side has cos²a where the other has sin²a only: write it as 1 − sin²a
export function pythAcross(S) {
  const sq = P => { const out = []; [...P.num, ...P.den].forEach(t => t.f.forEach(g => { if (trIsSq(g)) out.push(g); })); return out; };
  const [l, r] = S.parts.map(sq);
  for (const [mine, theirs] of [[l, r], [r, l]])
    for (const f of mine) {
      const arg = base(f).slice(3), has = (list, fn) => list.some(g => g.fn === fn && base(g).slice(3) === arg);
      if (!has(theirs, f.fn) && has(theirs, OTHER[f.fn])) return { k: 'hPythSwap', p: { x: mx(fx(f)), y: mx('1 − ' + fx(Tr(OTHER[f.fn], f.terms, 2))) }, ids: [f.id] };
    }
  return null;
}
addProveTactic(pythAcross);
defineHintMove(h => h.k === 'hExplodeTrig', (S, h) => opExplode(S, h.ids[0]));
defineHintMove(h => h.k === 'hSplitAngle', (S, h) => opSplitTwo(S, h.term, h.split));
defineHintMove(h => h.k === 'hPythSwap', (S, h) => opPythSwap(S, h.ids[0]));

/* ---- notation: sin²(a + b), sin(30°) ---- */
const argHTML = ts => ts.map((t, i) => (i === 0 ? (t.neg ? '−' : '') : (t.neg ? ' − ' : ' + ')) + termHTML(t) + (pureNum(t) ? '°' : '')).join('');
defineHTML('trig', 2, f => `<span class="mfn">${f.fn}</span>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}(${argHTML(f.terms)})`);

/* ---- practice ---- */
const trPick = a => a[Math.floor(Math.random() * a.length)];
const trDeg = (fn, d) => Tr(fn, [T([N(d)])]);
const HALF = [['sin', 30], ['sin', 150], ['cos', 60], ['cos', 300]];   // the angles whose value is ½
const trAng = (fn, b, e = 1) => Tr(fn, [T([V(b)])], e);
// exact values: d1 one value times a number, d2 a product with roots, d3 tan and sums of whole values
GEN.trigvals = d => {
  const forms = d === 1
    ? [() => { const [fn, a] = trPick(HALF); return [T([N(trPick([2, 4, 6, 8])), trDeg(fn, a)])]; },
      () => [T([trDeg('sin', trPick([90, 270]))]), T([trDeg('cos', trPick([0, 180, 360]))])]]
    : d === 2
      ? [() => [T([trDeg('sin', 60), trDeg('cos', 30)])], () => [T([N(2), trDeg('sin', 45), trDeg('cos', 45)])], () => [T([N(4), trDeg('sin', 30), trDeg('cos', 60)])]]
      : [() => [T([trDeg('tan', trPick([45, 60]))])], () => [T([trDeg('tan', 45)])], () => [T([trDeg('sin', 90)]), T([trDeg('cos', 180)]), T([trDeg('sin', 270)], true)]];
  return { parts: [F(trPick(forms)())], goal: 'simplify' };
};
// identities: d1 Pythagoras and tan, d2 with brackets, d3 the sum and double-angle formulas
const IDS = {
  1: [b => [[T([N(3), trAng('sin', b, 2)]), T([N(3), trAng('cos', b, 2)])], [T([N(3)])]],
      b => [[T([Tr('tan', [T([V(b)])]), trAng('cos', b)])], [T([trAng('sin', b)])]],
      b => [[T([N(1)]), T([trAng('sin', b, 2)], true)], [T([trAng('cos', b, 2)])]]],
  2: [b => [[T([Pr2(T([trAng('sin', b)]), T([trAng('cos', b)]))])], [T([N(1)]), T([N(2), trAng('sin', b), trAng('cos', b)])]],
      b => [[T([trAng('cos', b, 2)]), T([trAng('sin', b, 2)], true)], [T([N(2), trAng('cos', b, 2)]), T([N(1)], true)]],
      b => [[T([Pr1(T([N(1)]), T([trAng('sin', b)], true)), Pr1(T([N(1)]), T([trAng('sin', b)]))])], [T([trAng('cos', b, 2)])]]],
  3: [b => [[T([Tr('sin', [T([N(2), V(b)])])])], [T([N(2), trAng('sin', b), trAng('cos', b)])]],
      b => [[T([Tr('cos', [T([N(2), V(b)])])])], [T([N(1)]), T([N(2), trAng('sin', b, 2)], true)]],
      b => [[T([Tr('sin', [T([V(b)]), T([N(90)])])])], [T([trAng('cos', b)])]],
      b => [[T([Tr('cos', [T([N(180)]), T([V(b)], true)])])], [T([trAng('cos', b)], true)]]],
};
const Pr1 = (...ts) => Pr(ts), Pr2 = (...ts) => Pr(ts, 2);
GEN.trigid = d => { const [L, R] = trPick(IDS[d])(trPick(['a', 'x', 'b'])); return { parts: [F(L), F(R)], op: '=', goal: 'prove' }; };
