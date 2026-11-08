/* The moves that aren't a tap on two pieces: putting outside brackets (opFactor, used by the factor action), splitting a
   term in two, sweeps, adding terms, the fraction sign, moving a piece between fractions; and the helpers the pair
   rules use (cancelCheck, restOf, related). Each move returns {ok,p,born} after mutating, or {no,p,ids} without mutating. */
import { Pr } from './kinds/bracket.js';
import { N } from './kinds/number.js';
import { KINDS } from './kinds/registry.js';
import { F, T, cloneF, cloneT, fkey, sumKey } from './kinds/sums.js';
import { canMerge, cleanTerm, coef, eachFactor, eachTerm, gcd, isOne, isUnit, locate, mergeF, negate, sig, tidy, varPart } from './model.js';
import { isEquation, isFractionPair } from './problem.js';
import { pairCheck } from './rules/engine.js';
import { defineMove } from './rules/registry.js';
import { blockHTML, factorsHTML, fx, mx, sumHTML, termHTML } from '../render/text.js';

export function related(x, y) { return canMerge(x, y) || (x.k === 'v' && y.k === 'v' && x.b === y.b); }

export function groupHasBase(g, b) { return g.k === 'g' && g.f.some(f => f.k === 'v' && f.b === b); }

// only exactly equal pieces cancel: x³ with x³, 2 with 2
export function cancelCheck(x, y) {
  if (x.k === 'v' && y.k === 'v' && x.b === y.b) {
    if (x.e === y.e) return { type: 'cancel' };
    const big = x.e > y.e ? x : y, small = big === x ? y : x;
    return { type: 'fizzle', msg: 'cancelUnequal', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
  }
  if (x.k === 'p' && y.k === 'p' && sumKey(x.terms) === sumKey(y.terms)) {
    if (x.e === y.e) return { type: 'cancel' };
    const big = x.e > y.e ? x : y, small = big === x ? y : x;
    return { type: 'fizzle', msg: 'cancelUnequal', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
  }
  // a root, or a kind that says what it is apart from its power (sin a in sin²a): equal pieces cancel
  if (x.k === y.k && (x.k === 'r' || KINDS[x.k]?.base) && (x.k === 'r' ? fkey(x) === fkey(y) : KINDS[x.k].base(x) === KINDS[y.k].base(y))) {
    if (x.e === y.e) return { type: 'cancel' };
    const big = x.e > y.e ? x : y, small = big === x ? y : x;
    return { type: 'fizzle', msg: 'cancelUnequal', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
  }
  if (x.k === 'n' && y.k === 'n') {
    if (x.v === y.v) return x.v === 1 ? { type: 'none' } : { type: 'cancel' };
    if (gcd(x.v, y.v) === 1) return { type: 'fizzle', msg: 'cancelCoprime', p: { a: x.v, b: y.v } };
    return { type: 'fizzle', msg: 'cancelUnequalNum', p: { a: x.v, b: y.v } };
  }
  return null;
}

export const usedUp = P => isUnit(P.num) && isUnit(P.den);

// x(x − 5) + x − 5: the loose terms x − 5 together are the bracket (x − 5) once (or −1 times).
// Returns those terms when B's term is one of them, else null.
export function restOf(A, B) {
  if (A.f.k !== 'p' || A.f.e !== 1 || A.depth || B.term === A.term || A.terms !== B.terms) return null;
  const k = A.f.terms.length, key = sumKey(A.f.terms);
  const neg = sumKey(A.f.terms.map(t => ({ ...t, neg: !t.neg })));
  const others = A.terms.filter(t => t !== A.term && t !== B.term);
  const pickK = (from, n, start = 0, acc = []) => {
    if (acc.length === n) return [acc];
    const out = [];
    for (let i = start; i < from.length; i++) out.push(...pickK(from, n, i + 1, [...acc, from[i]]));
    return out;
  };
  for (const more of pickK(others, k - 1)) {
    const set = [B.term, ...more], sk = sumKey(set);
    if (sk === key) return { set, sign: 1 };
    if (sk === neg) return { set, sign: -1 };
  }
  return null;
}

/* Putting outside brackets: only from the two terms the player tapped, only the tapped pieces.
   The sign of the first term goes in front with it, so −3x + 6 becomes −3(x − 2). */
export function opFactor(S, A, B) {
  const terms = A.terms;
  const [first, second] = [A, B].sort((p, q) => terms.indexOf(p.term) - terms.indexOf(q.term));
  const set = [first.term, second.term], picked = [first.f, second.f];
  const c = cloneF(first.f), lead = first.term.neg;
  const ex = mx(sumHTML(set)), key = c.k === 'p' ? sumKey(c.terms) : null, bex = key && mx(blockHTML(set, key));
  const inner = set.map((t, i) => { t.f.splice(t.f.indexOf(picked[i]), 1); t.neg = t.neg !== lead; return cleanTerm(t); });
  const wrap = Pr(inner), nt = T([c, wrap], lead);
  const at = terms.indexOf(set[0]);
  set.forEach(t => terms.splice(terms.indexOf(t), 1));
  terms.splice(at, 0, nt);
  const leftOne = inner.some(t => t.f.length === 1 && t.f[0].k === 'n' && t.f[0].v === 1);
  const ok = lead ? 'factorNeg' : leftOne ? 'factorOne' : key ? 'factorBlock' : 'factor';
  return { ok, p: { c: mx(fx(c)), ex, r: mx(termHTML(nt)), bex, br: key && mx(blockHTML([nt], key)) }, born: [c.id], origins: { [c.id]: picked.map(f => f.id) }, arcs: true, wrap: wrap.id };
}

export const sgn = n => String(n).replace('-', '−');

/* Write a·x as p·x + q·x with p + q = a (the step behind the sum-product method). */
export function opSplitTwo(S, tid, p) {
  const L = locate(S, tid);
  if (!L || L.kind !== 't') return null;
  const t = L.term, c = coef(t), vp = varPart(t);
  if (!tidy(t) || !vp.length || !Number.isInteger(p) || p === 0 || p === c) return { no: 'splitTwoNo', ids: [tid] };
  const q = c - p;
  // everything but the number goes into both halves: letters, and a root (−p√q = p√q − 2p√q)
  const rest = t.f.filter(f => f.k !== 'n');
  const mk = k => T([...(Math.abs(k) !== 1 ? [N(Math.abs(k))] : []), ...rest.map(cloneF)], k < 0);
  const nts = [mk(p), mk(q)];
  L.terms.splice(L.t, 1, ...nts);
  return { ok: 'splitTwo', p: { x: mx(sumHTML([t])), ex: mx(sumHTML(nts)), a: sgn(p), b: q < 0 ? `(${sgn(q)})` : q, c: sgn(c) }, born: nts.flatMap(n => n.f.map(f => f.id)) };
}

export function opGather(S, id) {
  const L = locate(S, id), arr = L.term.f;
  const same = arr.filter(f => canMerge(L.f, f));
  if (same.length < 2) return { no: 'nothingGather', p: { x: mx(fx(L.f)) }, ids: [id] };
  const r = same.reduce((a, b) => mergeF(a, b));
  const first = arr.indexOf(same[0]);
  const ex = mx(same.map(fx).join(' · '));
  L.term.f = arr.filter(f => !same.includes(f));
  L.term.f.splice(first, 0, r);
  return { ok: 'gather', p: { ex, r: mx(fx(r)) }, born: [r.id], origins: { [r.id]: same.map(f => f.id) } };
}

export function addTermsIn(terms, list) {
  const rest = list[0].f.filter(f => f.k !== 'n');
  const total = list.reduce((s, t) => s + coef(t), 0);
  const ex = mx(sumHTML(list));
  const at = terms.indexOf(list[0]);
  list.forEach(t => terms.splice(terms.indexOf(t), 1));
  if (total === 0) { if (!terms.length) terms.push(T([N(0)])); return { ex, r: '0', born: [], nt: null }; }
  const nf = [], origins = {};
  if (Math.abs(total) !== 1 || !rest.length) {
    const n = N(Math.abs(total)); nf.push(n);
    origins[n.id] = list.map(t => (t.f.find(f => f.k === 'n') || t.f[0]).id);
  }
  rest.forEach((f, k) => {
    const cf = cloneF(f); nf.push(cf);
    origins[cf.id] = list.map(t => t.f.filter(g => g.k !== 'n')[k]).filter(Boolean).map(g => g.id);
  });
  const nt = T(nf, total < 0);
  terms.splice(Math.min(at, terms.length), 0, nt);
  return { ex, r: mx(sumHTML([nt])), born: nf.map(f => f.id), nt, origins };
}

/* A sweep is accepted only as ONE valid move: group matching pieces inside one term,
   or add like terms by sweeping one matching piece in each. Otherwise nothing happens. */
export function opSweep(S, ids) {
  const locs = ids.map(id => locate(S, id)).filter(L => L && L.kind === 'f' && L.f.k !== 'p');
  if (locs.length < 2) return null;
  const all = locs.map(L => L.f.id);
  const first = locs[0].f;
  if (!locs.every(L => canMerge(first, L.f)))
    return { no: 'sweepMixed', p: { list: mx(locs.map(L => fx(L.f)).join(' , ')) }, ids: all };
  const terms = [...new Set(locs.map(L => L.term))];
  if (terms.length === 1) {
    const term = terms[0], same = locs.map(L => L.f);
    const r = same.reduce((a, b) => mergeF(a, b));
    const at = Math.min(...same.map(f => term.f.indexOf(f)));
    const ex = mx(same.map(fx).join(' · '));
    term.f = term.f.filter(f => !same.includes(f));
    term.f.splice(at, 0, r);
    return { ok: 'gather', p: { ex, r: mx(fx(r)) }, born: [r.id], origins: { [r.id]: same.map(f => f.id) } };
  }
  if (terms.length !== locs.length || !locs.every(L => L.terms === locs[0].terms))
    return { no: 'sweepSplit', ids: all };
  if (!terms.every(t => tidy(t))) return { no: 'untidy', ids: all };
  if (new Set(terms.map(sig)).size > 1) return { no: 'sweepTerms', ids: all };
  const container = locs[0].terms;
  terms.sort((a, b) => container.indexOf(a) - container.indexOf(b));
  const r = addTermsIn(container, terms);
  if (!r.nt) return { ok: 'likeZero', p: { ex: r.ex } };
  return { ok: 'sweepAdd', p: { ex: r.ex, r: r.r }, born: r.born, origins: r.origins };
}

export function termPair(S, aId, bId) {
  const A = locate(S, aId), B = locate(S, bId);
  if (A.p !== B.p) return { no: isEquation(S) ? 'diffSides' : 'diffFrac', ids: [aId, bId] };
  if (A.terms !== B.terms) return { no: A.side !== B.side ? 'termSide' : 'bracketWall', ids: [aId, bId] };
  if (!tidy(A.term) || !tidy(B.term)) return { no: 'untidy', ids: [aId, bId] };
  if (sig(A.term) !== sig(B.term)) return { no: 'notLike', p: { v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) }, ids: [aId, bId] };
  const vp = A.term.f.filter(f => f.k !== 'n');
  const r = addTermsIn(A.terms, [A.term, B.term].sort((a, b) => A.terms.indexOf(a) - A.terms.indexOf(b)));
  if (!r.nt) return { ok: 'likeZero', p: { ex: r.ex } };
  return { ok: 'likeAdd', p: { v: vp.length ? mx(factorsHTML(vp)) : '1', ex: r.ex, r: r.r }, born: r.born, origins: r.origins };
}

export function flipPart(P) { [P.num, P.den] = [P.den, P.num]; return [...P.num, ...P.den].flatMap(t => t.f.map(f => f.id)); }

// (A/1)·(1/B) or (1/B)·(A/1): every top piece sits in one fraction and every bottom piece in the other
export function joinable(S) {
  if (S.parts.length !== 2 || S.op !== '·') return null;
  const [P, Q] = S.parts;
  if (isUnit(P.den) && isUnit(Q.num)) return { top: P, bottom: Q };
  if (isUnit(P.num) && isUnit(Q.den)) return { top: Q, bottom: P };
  return null;
}

export function opOp(S) {
  if (!isFractionPair(S)) return null;
  if (S.op === '/') { S.op = ':'; return { ok: 'toDiv' }; }
  if (S.op === ':') { const born = flipPart(S.parts[1]); S.op = '·'; return { ok: 'flip', born }; }
  // tops times tops, bottoms times bottoms: with only 1's left to multiply by, the two fractions become one
  const j = joinable(S);
  if (j) {
    const ones = [j.top.den[0], j.bottom.num[0]].filter(t => t.neg).length;
    S.parts = [F(j.top.num, j.bottom.den)];
    if (ones % 2) negate(S.parts[0].num);
    return { ok: 'joined' };
  }
  const born = flipPart(S.parts[1]); S.op = '/';
  return { ok: 'toBar', born };
}

// tapping the bar of a single fraction writes it as top : bottom
export function opBar(S) {
  if (S.parts.length !== 1 || isOne(S.parts[0].den)) return null;
  const P = S.parts[0];
  S.parts = [F(P.num), F(P.den)];
  S.op = ':';
  return { ok: 'toDiv' };
}

// multiplying fractions by hand: move a piece into the same row of the other fraction
export function opMove(S, A, B) {
  const src = S.parts[A.p][A.side];
  let moving, whole = false;
  const label = mx(src.length > 1 || A.depth > 0 ? '(' + sumHTML(src) + ')' : fx(A.f));
  if (src.length > 1 || A.depth > 0) {
    moving = [src.length > 1 ? Pr(src.map(cloneT)) : null].filter(Boolean);
    if (src.length === 1) moving = src[0].f.map(cloneF);   // a single term that contains a bracket: move the whole term
    const neg = src.length === 1 && src[0].neg;
    S.parts[A.p][A.side] = [T([N(1)], neg)];
    whole = true;
  } else {
    const t = src[0];
    t.f.splice(t.f.indexOf(A.f), 1);
    if (!t.f.length) t.f = [N(1)];
    moving = [A.f];
  }
  const dst = S.parts[B.p][B.side];
  let target, at;
  if (dst.length > 1) { target = T([Pr(dst)]); S.parts[B.p][B.side] = [target]; at = target.f.length; }
  else { target = dst[0]; at = B.depth === 0 ? target.f.indexOf(B.f) + 1 : target.f.length; }
  target.f.splice(at, 0, ...moving);
  return { ok: whole ? 'moveWhole' : (A.side === 'num' ? 'moveNum' : 'moveDen'), p: { x: label }, born: moving.map(f => f.id) };
}

export function partnersOf(S, sel) {
  const out = new Set();
  if (!sel) return out;
  const A = locate(S, sel.id);
  if (!A) return out;
  if (sel.t === 'f') {
    eachFactor(S, B => {
      if (B.f.id === sel.id) return;
      const r = pairCheck(S, A, B);
      if (r.type === 'merge' || r.type === 'rootOut' || r.type === 'factorRest' || r.type === 'cancel' || r.type === 'move' || r.type === 'addTerms' || (r.type === 'factor' && !r.useless)) out.add(B.f.id);
    });
  } else {
    eachTerm(S, B => {
      if (B.term.id === sel.id || B.terms !== A.terms) return;
      if (tidy(A.term) && tidy(B.term) && sig(A.term) === sig(B.term)) out.add(B.term.id);
    });
  }
  return out;
}

defineMove('gather', 'piece', opGather);
defineMove('sweep', 'sweep', opSweep);
defineMove('termPair', 'terms', termPair);
defineMove('splitTwo', 'split', opSplitTwo);
defineMove('sign', 'board', opOp);
defineMove('bar', 'board', opBar);
