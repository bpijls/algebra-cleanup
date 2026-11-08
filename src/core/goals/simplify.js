/* The simplify and factor goals: their tactics, in the order they are asked. Each is one idea a teacher would
   point at ("these two cancel", "explode that power first", "open the brackets"). */
import { defineGoal } from './registry.js';
import { factorHint, sumProductHint } from '../hints.js';
import { fkey } from '../kinds/sums.js';
import { SIDES, canMerge, containers, eachFactor, eachTerm, isFactored, isOne, isSimplified, isUnit, primeFactors, sig, squareFactor, tidy } from '../model.js';
import { cancelCheck, joinable, usedUp } from '../moves.js';
import { fx, mx, sumHTML, termHTML } from '../../render/text.js';

// two fractions being divided or multiplied: flip, cross-cancel, join, then multiply by hand
export function fractionPair(S) {
  if (S.parts.length < 2) return null;
  if (S.op === '/') return { k: 'hBar', ids: ['op'] };
  if (S.op === ':') return { k: 'hDiv', ids: ['op'] };
  const [P1, P2] = S.parts;
  if (S.op === '·') for (const P of S.parts)
    if (usedUp(P)) return { k: 'hCancelOnes', ids: [P.num[0].f[0].id, P.den[0].f[0].id] };
  for (const [a, b] of [[P1.num, P2.den], [P2.num, P1.den]]) {
    if (a.length !== 1 || b.length !== 1) continue;
    for (const x of a[0].f) for (const y of b[0].f)
      if (cancelCheck(x, y)?.type === 'cancel') return { k: 'hCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
  }
  if (joinable(S)) return { k: 'hJoin', ids: ['op'] };
  for (const side of SIDES) {
    const src = P2[side], dst = P1[side];
    if (isUnit(src)) continue;
    const x = src[0].f[0], y = dst[0].f[0];
    return { k: 'hMove', p: { x: mx(src.length > 1 ? '(' + sumHTML(src) + ')' : fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
  }
  return null;
}

// under a root: a pair comes out, a number with a square in it explodes, numbers merge
export function rootPairs(S) {
  let h = null;
  eachFactor(S, L => {
    if (h || L.f.k !== 'r' || L.f.terms.length !== 1) return;
    const vs = L.f.terms[0].f.filter(f => f.k === 'v' && f.e > 0 && Number.isInteger(f.e));   // √(a·a·a): a pair of a's comes out
    for (let i = 0; !h && i < vs.length; i++) for (let j = i + 1; !h && j < vs.length; j++)
      if (vs[i].b === vs[j].b && vs[i].e === 1 && vs[j].e === 1) h = { k: 'hRootPair', p: { x: mx(fx(L.f)), n: mx(fx(vs[i])) }, ids: [vs[i].id, vs[j].id] };
    const bigV = vs.find(f => f.e > 1);
    if (!h && bigV) h = { k: 'hExplodeRoot', p: { x: mx(fx(L.f)), n: mx(fx(bigV)) }, ids: [bigV.id] };
    if (h) return;
    const ns = L.f.terms[0].f.filter(f => f.k === 'n' && f.v > 1);
    for (let i = 0; !h && i < ns.length; i++) for (let j = i + 1; !h && j < ns.length; j++)
      if (ns[i].v === ns[j].v) h = { k: 'hRootPair', p: { x: mx(fx(L.f)), n: ns[i].v }, ids: [ns[i].id, ns[j].id] };
    const big = ns.find(f => squareFactor(f.v) && primeFactors(f.v).length > 1);
    if (!h && big) h = { k: 'hExplodeRoot', p: { x: mx(fx(L.f)), n: big.v }, ids: [big.id] };
    if (!h && ns.length > 1) h = { k: 'hMerge', p: { x: ns[0].v, y: ns[1].v }, ids: [ns[0].id, ns[1].id] };
  });
  return h;
}

// (2a)³ and, unless factoring, (a + b)²: explode the power
export function groups(S) {
  let h = null;
  eachFactor(S, L => {
    if (h) return;
    if (L.f.k === 'g' || (L.f.k === 'p' && L.f.e > 1 && S.goal !== 'factor')) h = { k: 'hGroup', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
  });
  return h;
}

// a fraction (the whole problem, or one inside a sum): cancel equal pieces, or explode until they are equal
export function cancelAcross(S) {
  const fracs = [S.parts[0]];
  eachFactor(S, L => { if (L.f.k === 'q') fracs.push(L.f); });
  for (const P of fracs) { const h = cancelIn(P); if (h) return h; }
  return null;
}
export function cancelIn(P) {
  if (!(P.num.length === 1 && P.den.length === 1 && !isOne(P.den))) return null;
  const a = P.num[0], b = P.den[0];
  for (const x of a.f) for (const y of b.f)
    if (cancelCheck(x, y)?.type === 'cancel') return { k: 'hCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
  for (const x of a.f) for (const y of b.f) {
    const cr = cancelCheck(x, y);
    if (!cr || cr.type !== 'fizzle' || cr.msg === 'cancelCoprime' || cr.msg === 'mixedSignBar') continue;
    const ids = x.k !== 'n' ? [(x.e > y.e ? x : y).id] : [x, y].filter(f => primeFactors(f.v).length > 1).map(f => f.id);
    return { k: 'hExplodeCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids };
  }
  return null;
}

// two pieces of one term that multiply into one
export function merges(S) {
  let h = null;
  eachTerm(S, L => {
    const t = L.term;
    for (let i = 0; !h && i < t.f.length; i++) for (let j = i + 1; !h && j < t.f.length; j++)
      // (a+b)·(a+b) only folds back into (a+b)² when the goal is to factor; to simplify, it gets opened
      // a · a^½ stays apart unless the level wants one power: it is a√a, and merging would undo the explode
      if (canMerge(t.f[i], t.f[j]) && (t.f[i].k !== 'p' || S.goal === 'factor') && (S.asPower || !(t.f[i].e % 1 || t.f[j].e % 1) || Number.isInteger(t.f[i].e + t.f[j].e))) h = { k: 'hMerge', p: { x: mx(fx(t.f[i])), y: mx(fx(t.f[j])) }, ids: [t.f[i].id, t.f[j].id] };
  });
  return h;
}

// like terms add
export function likeTerms(S) {
  const pick = t => t.f.find(f => f.k === 'v') || t.f.find(f => f.k !== 'n') || t.f[0];   // a letter, else a root, a log …
  for (const ts of containers(S))
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++)
      if (tidy(ts[i]) && tidy(ts[j]) && sig(ts[i]) === sig(ts[j]))
        return { k: 'hLike', p: { x: mx(termHTML(ts[i])), y: mx(termHTML(ts[j])) }, ids: [pick(ts[i]).id, (ts[j].f.find(f => f.k === pick(ts[i]).k && (f.k === 'v' ? f.b === pick(ts[i]).b : fkey(f) === fkey(pick(ts[i])))) || pick(ts[j])).id] };
  return null;
}

// to simplify, brackets get opened (unless the level keeps one)
export function openBrackets(S) {
  if (S.allowB) return null;
  let h = null;
  eachFactor(S, L => { if (!h && L.f.k === 'p') h = { k: 'hOpen', p: { x: mx(termHTML(L.term)) }, ids: [L.f.id] }; });
  return h;
}

defineGoal('simplify', { isDone: isSimplified, tactics: [fractionPair, rootPairs, groups, cancelAcross, merges, likeTerms, openBrackets] });
defineGoal('factor', { isDone: isFactored, tactics: [fractionPair, rootPairs, groups, cancelAcross, factorHint, merges, likeTerms, sumProductHint] });
