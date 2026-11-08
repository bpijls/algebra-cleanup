/* Tapping two pieces: the rules (what it means, or why not) and the actions (doing it). The order of the rules
   inside a scope is the order they are asked in. */
import { Pr } from '../kinds/bracket.js';
import { V } from '../kinds/letter.js';
import { N } from '../kinds/number.js';
import { T, cloneF, fkey, sumKey } from '../kinds/sums.js';
import { canMerge, cleanTerm, gcd, locate, mergeF, negate, sig, tidy, varPart } from '../model.js';
import { cancelCheck, groupHasBase, opFactor, opMove, related, restOf, termPair, usedUp } from '../moves.js';
import { branchOf, isEquation } from '../problem.js';
import { defineAction, definePairRule } from './registry.js';
import { bx, factorsHTML, fx, mx, sumHTML, termHTML } from '../../render/text.js';

const unequal = (x, y) => { const big = x.e > y.e ? x : y, small = big === x ? y : x; return { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) }; };
const NONE = { type: 'none' };

/* ---- different fractions, or the two sides of an = ---- */
// no "move it across and flip the sign": an equation only changes by doing the same to both sides
definePairRule('parts', 'equation', (S, A, B) => isEquation(S) ? { type: 'fizzle', msg: branchOf(A.p) !== branchOf(B.p) ? 'diffBranch' : 'diffSides' } : undefined);
definePairRule('parts', 'notTimes', S => S.op !== '·' ? { type: 'fizzle', msg: 'diffFrac' } : undefined);
// multiplying fractions by hand: a piece moves to the same row of the other fraction
definePairRule('parts', 'move', (S, A, B) => A.side === B.side ? { type: 'move' } : undefined);
// cross-cancelling, between a lone top and a lone bottom
definePairRule('parts', 'crossCancel', (S, A, B) => {
  const PA = S.parts[A.p], PB = S.parts[B.p];
  if (!(PA[A.side].length === 1 && PB[B.side].length === 1 && !A.depth && !B.depth)) return undefined;
  const cr = cancelCheck(A.f, B.f);
  return cr && cr.type !== 'none' ? cr : undefined;
});
definePairRule('parts', 'crossSide', () => ({ type: 'fizzle', msg: 'crossSide' }));

/* ---- in the same sum ---- */
// x(x − 5) + x − 5: the loose terms are the bracket once
definePairRule('sum', 'factorRest', (S, A, B) => A.term !== B.term && (restOf(A, B) || restOf(B, A)) ? { type: 'factorRest' } : undefined);
// √(3·3·2): two equal numbers under a root come out as one, √(3·3) = 3
definePairRule('sum', 'rootOut', (S, A, B) => {
  const x = A.f, y = B.f;
  if (!(A.term === B.term && A.in && A.in.k === 'r' && A.in.terms.length === 1 && x.k === 'n' && y.k === 'n')) return undefined;
  if (x.v === y.v && x.v > 1) return { type: 'rootOut' };
  if (x.v !== y.v && x.v > 1 && y.v > 1) return { type: 'merge' };
  return undefined;
});
// two pieces of one term: they multiply into one when they can
definePairRule('sum', 'sameTerm', (S, A, B) => A.term === B.term ? (canMerge(A.f, B.f) ? { type: 'merge' } : NONE) : undefined);
// a(x+2) + 3(x+2): the same bracket in both terms goes outside
definePairRule('sum', 'sharedBracket', (S, A, B) => {
  const x = A.f, y = B.f;
  if (!(x.k === 'p' && y.k === 'p' && canMerge(x, y))) return undefined;
  return x.e === y.e ? { type: 'factor', useless: false } : { type: 'fizzle', msg: 'explodeFirstVar', p: unequal(x, y) };
});
// from here on: the same kind of piece in two terms
definePairRule('sum', 'different', (S, A, B) => {
  const x = A.f, y = B.f;
  return x.k !== y.k || x.k === 'g' || x.k === 'p' || (x.k === 'v' && x.b !== y.b) || (x.k === 'r' && fkey(x) !== fkey(y)) ? NONE : undefined;
});
// like terms add: a + a = 2a
definePairRule('sum', 'likeTerms', (S, A, B) => tidy(A.term) && tidy(B.term) && sig(A.term) === sig(B.term) ? { type: 'addTerms' } : undefined);
// not like terms: a shared number goes outside brackets, but only exactly equal pieces (6 and 9: explode first)
definePairRule('sum', 'numbers', (S, A, B) => {
  const x = A.f, y = B.f;
  if (!(x.k === 'n' && x.v !== y.v)) return undefined;
  if (gcd(x.v, y.v) === 1) return { type: 'fizzle', msg: S.goal === 'factor' ? 'noCommon' : 'notLike', p: { a: x.v, b: y.v, v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) } };
  return { type: 'fizzle', msg: 'explodeFirst', p: { a: x.v, b: y.v } };
});
definePairRule('sum', 'ones', (S, A) => A.f.k === 'n' && A.f.v === 1 ? NONE : undefined);
// a² with a: explode a² first
definePairRule('sum', 'powers', (S, A, B) => {
  const x = A.f, y = B.f;
  if (!(x.k === 'v' && x.e !== y.e)) return undefined;
  if (S.goal !== 'factor' && tidy(A.term) && tidy(B.term)) return { type: 'fizzle', msg: 'notLike', p: { v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) } };
  return { type: 'fizzle', msg: 'explodeFirstVar', p: unequal(x, y) };
});
// the same piece in two terms: outside brackets (allowed in every mode; flagged when it only makes things longer)
definePairRule('sum', 'factor', (S, A, B) => ({ type: 'factor', useless: S.goal !== 'factor' && tidy(A.term) && tidy(B.term) }));

/* ---- a bracket wall between them ---- */
definePairRule('wall', 'wall', (S, A, B) => {
  if (!related(A.f, B.f)) return NONE;
  return { type: 'fizzle', msg: A.side === B.side ? 'bracketWall' : 'cancelSum' };
});

/* ---- across one fraction bar ---- */
// a used-up fraction while multiplying: 1 over 1 cancels away, and the fraction with it
definePairRule('bar', 'ones', (S, A) => S.op === '·' && usedUp(S.parts[A.p]) ? { type: 'ones' } : undefined);
// only exactly equal pieces cancel, and never out of a sum
definePairRule('bar', 'cancel', (S, A, B) => {
  const x = A.f, y = B.f, P = S.parts[A.p];
  const sameVar = x.k === 'v' && y.k === 'v' && x.b === y.b;
  const nums = x.k === 'n' && y.k === 'n';
  const brk = x.k === 'p' && y.k === 'p' && sumKey(x.terms) === sumKey(y.terms);
  const grp = (x.k === 'g' && (y.k === 'g' || (y.k === 'v' && groupHasBase(x, y.b)) || y.k === 'n'))
    || (y.k === 'g' && ((x.k === 'v' && groupHasBase(y, x.b)) || x.k === 'n'));
  if (!sameVar && !nums && !grp && !brk) return NONE;
  if (P.num.length > 1 || P.den.length > 1) return { type: 'fizzle', msg: 'cancelSum' };
  if (grp) return { type: 'fizzle', msg: 'cancelGroup' };
  return cancelCheck(x, y);
});

/* ---- the actions ---- */
defineAction('move', (S, A, B) => opMove(S, A, B));

defineAction('factorRest', (S, A, B) => {
  const [P, Q] = restOf(A, B) ? [A, B] : [B, A], { set, sign } = restOf(P, Q), terms = P.terms;
  const ex = mx(sumHTML([P.term, ...set].sort((u, v) => terms.indexOf(u) - terms.indexOf(v))));
  const c = cloneF(P.f), lead = P.term.neg;
  const rest = cleanTerm(T(P.term.f.filter(f => f !== P.f), false));
  const wrap = Pr([rest, T([N(1)], (sign < 0) !== lead)]), nt = T([c, wrap], lead);
  const at = Math.min(terms.indexOf(P.term), ...set.map(t => terms.indexOf(t)));
  [P.term, ...set].forEach(t => terms.splice(terms.indexOf(t), 1));
  terms.splice(at, 0, nt);
  return { ok: 'factorRest', p: { b: mx(fx(P.f)), t: mx(sumHTML(set)), ex, r: mx(termHTML(nt)), one: sign < 0 ? '−1' : '1' }, born: [c.id], origins: { [c.id]: [P.f.id] }, arcs: true, wrap: wrap.id };
});

defineAction('rootOut', (S, A, B) => {
  const out = locate(S, A.in.id), arr = A.term.f, shown = mx(fx(A.in));
  arr.splice(arr.indexOf(A.f), 1); arr.splice(arr.indexOf(B.f), 1);
  if (!arr.length) arr.push(N(1));
  const n = N(A.f.v);
  out.term.f.splice(out.i, 0, n);
  return { ok: 'rootOut', p: { x: shown, n: A.f.v, r: mx(fx(out.f)) }, born: [n.id], origins: { [n.id]: [A.f.id, B.f.id] } };
});

defineAction('ones', (S, A) => {
  const P = S.parts[A.p], other = S.parts[1 - A.p];
  if (P.num[0].neg !== P.den[0].neg) negate(other.num);   // −1 over 1: the minus goes to the other fraction
  S.parts.splice(A.p, 1);
  return { ok: 'cancelOnes', cancel: true };
});

defineAction('factor', (S, A, B, v) => {
  const v1 = mx(termHTML(A.term)), v2 = mx(termHTML(B.term));
  const res = opFactor(S, A, B);
  if (v.useless) { res.ok = 'factorUseless'; res.p.v1 = v1; res.p.v2 = v2; }
  return res;
});

defineAction('addTerms', (S, A, B) => {
  const vp = varPart(A.term);
  const res = termPair(S, A.term.id, B.term.id);
  if (res.ok === 'likeAdd' && vp.length) {   // a + a = 2a, unlike a · a = a²
    const one = factorsHTML(vp), sq = factorsHTML(vp.map(f => V(f.b, f.e * 2)));
    res.p.extra = { v: mx(one), two: mx('2' + one), sq: mx(sq) };
    res.ok = 'likeAddTap';
  }
  return res;
});

defineAction('merge', (S, A, B, v, ids) => {
  const x = A.f, y = B.f;
  if (x.k === 'n' && x.v * y.v > 1e12) return { no: 'tooBig', ids };   // beyond exact arithmetic
  const m = mergeF(x, y);
  const arr = A.term.f;
  arr.splice(A.i, 1, m);
  arr.splice(arr.indexOf(y), 1);
  const origins = { [m.id]: [x.id, y.id] };
  if (x.k === 'v') return { ok: 'mergeVar', p: { x: mx(fx(x)), y: mx(fx(y)), r: mx(fx(m)), b: bx(x.b), m: x.e, n: y.e, s: m.e }, born: [m.id], origins };
  if (x.k === 'n') return { ok: 'mergeNum', p: { x: x.v, y: y.v, r: m.v }, born: [m.id], origins };
  return { ok: 'mergeGroup', p: { x: mx(fx(x)), y: mx(fx(y)), r: mx(fx(m)) }, born: [m.id], origins };
});

defineAction('cancel', (S, A, B) => {
  const x = A.f, y = B.f, shown = mx(fx(x));
  if (x.k === 'n') { x.v = 1; y.v = 1; } else { x.e = 0; y.e = 0; }
  return { ok: 'cancelVar', p: { x: shown }, cancel: true };
});
