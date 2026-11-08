/* Fractions inside a sum (x/3 + 2, ½ + ⅓, 1/a + 1/b): splitting one with a sum on top, expanding (top and
   bottom times the same piece), and the hints that bring fractions together over one bottom.
   The pair moves (cancel across its bar, join two over the same bottom, a piece in front onto its top) are
   pair rules in rules/pair.js. */
import { Pr } from './kinds/bracket.js';
import { Q } from './kinds/fraction.js';
import { V } from './kinds/letter.js';
import { N } from './kinds/number.js';
import { Rt } from './kinds/root.js';
import { T, cloneF, cloneT, fkey, sumKey } from './kinds/sums.js';
import { letters } from './balance.js';
import { addCond, containers, eachTerm, fracTerm, isCombined, isOne, joinablePair, locate, rootBelow, primeFactors, tidy, unknownOf } from './model.js';
import { defineExplode, defineMove } from './rules/registry.js';
import { addTactic, defineGoal, defineHintMove } from './goals/registry.js';
import { cancelIn, fractionPair, groups, likeTerms, merges, openBrackets, rootPairs } from './goals/simplify.js';
import { condHTML, factorsHTML, fracHTML, fx, mx, sumHTML, termHTML } from '../render/text.js';

// (a + b)/c → a/c + b/c: a fraction with a sum on top is a sum of fractions over the same bottom
defineExplode('q', (S, L, id) => {
  const f = L.f;
  if (f.num.length < 2) return { no: 'fracTap', p: { x: mx(fx(f)) }, ids: [id] };
  const others = L.term.f.filter(g => g !== f), before = mx(termHTML(L.term)), origins = {};
  const nts = f.num.map(u => {
    const q = Q([T(u.f, false)], f.den.map(cloneT)); origins[q.id] = [f.id];
    return T([...others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; }), q], L.term.neg !== u.neg);
  });
  L.terms.splice(L.t, 1, ...nts);
  return { ok: 'fracSplit', p: { x: before, ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins, arcs: true };
});

/* Expanding: the top and the bottom times the same piece, ½ = (1·3)/(2·3). It works on a fraction in a sum,
   on the fraction of a whole side (1/√2 = √2/(√2·√2)), and on a whole term next to fractions, which is first
   written over 1 (2 − ¾: 2 = 2/1 = (2·4)/(1·4)). By 0 means nothing; by a letter it must not be 0. */
const OK_KINDS = ['n', 'v', 'r', 'p'];
export function expandTarget(S, id) {
  const L = locate(S, id);
  if (!L) return null;
  if (L.kind === 'f' && L.f.k === 'q') return { q: L.f };
  if (L.qs) return { q: L.in };
  if (L.depth) return null;
  const P = S.parts[L.p];
  if (!isOne(P.den) && P[L.side].length === 1) return { q: P, whole: true };
  if (L.terms.length > 1 && !L.term.f.some(f => f.k === 'q') && L.terms.some(t => t.f.some(f => f.k === 'q'))) return { term: L.term };
  return null;
}
export function opExpand(S, id, v) {
  const tg = expandTarget(S, id);
  if (!tg || !v || !v.f || !v.f.length || v.f.some(f => !OK_KINDS.includes(f.k))) return null;
  if (v.neg || v.f.some(f => f.k === 'n' && f.v === 0)) return { no: 'expandZero', ids: [id] };
  if (v.f.every(f => f.k === 'n' && f.v === 1)) return { no: 'expandOne', ids: [id] };
  // by a letter: one of the problem's own, which then must not be 0; never by the unknown of an equation
  const bs = letters(S), u = S.op === '=' ? unknownOf(S) : null;
  if (v.f.some(f => f.k === 'v' && (!bs.includes(f.b) || f.b === u))) return { no: 'expandLetter', p: { v: mx(factorsHTML(v.f, true)) }, ids: [id] };
  const before = mx(tg.term ? termHTML(tg.term) : tg.whole ? fracHTML(tg.q, true) : fx(tg.q));
  let q = tg.q;
  if (tg.term) { q = Q([T(tg.term.f, false)], [T([N(1)])]); tg.term.f = [q]; }
  const born = [];
  const times = side => {
    const fs = v.f.map(cloneF); born.push(...fs.map(f => f.id));
    if (side.length === 1) { side[0].f.push(...fs); return side; }
    return [T([Pr(side), ...fs])];
  };
  q.num = times(q.num); q.den = times(q.den);
  const sym = v.f.filter(f => f.k === 'v' || (f.k === 'p' && f.terms.some(t => t.f.some(g => g.k === 'v'))));
  const c = sym.length ? sym.map(f => condHTML(addCond(S, f.k === 'p' ? f.terms : [T([V(f.b, 1)])], 'ne'))).join(', ') : null;
  return { ok: c ? 'expandIf' : 'expandBy', p: { x: before, v: mx(factorsHTML(v.f, true)), ex: mx(tg.whole ? fracHTML(q, true) : fx(q)), c }, born };
}
defineMove('expand', 'expand', opExpand);

/* ---- a common bottom ---- */
// what a bottom is made of, as powers of prime numbers, letters, brackets and roots; null if it holds anything else
function partsOf(den) {
  const m = new Map(), add = (key, f, e) => { const o = m.get(key); m.set(key, { f, e: (o ? o.e : 0) + e }); };
  if (den.length !== 1) { add('s' + sumKey(den), Pr(den.map(cloneT)), 1); return m; }
  if (den[0].neg) return null;
  for (const f of den[0].f) {
    if (f.k === 'n') primeFactors(f.v).forEach(p => add('n' + p, N(p), 1));
    else if (f.k === 'v') add('v' + f.b, V(f.b, 1), f.e);
    else if (f.k === 'p') add('p' + sumKey(f.terms), Pr(f.terms.map(cloneT)), f.e);
    else if (f.k === 'r') add('r' + fkey(f), f, 1);
    else return null;
  }
  return m;
}
// the smallest bottom every one of these bottoms goes into, as a map like partsOf's
function lcdOf(maps) {
  const all = new Map();
  for (const m of maps) for (const [k, o] of m) if (!all.has(k) || all.get(k).e < o.e) all.set(k, o);
  return all;
}
// the piece that takes this bottom to the common one (null when it already is): 6 over 2 is · 3
function missing(m, lcd) {
  const fs = [];
  let n = 1;
  for (const [k, o] of lcd) {
    const d = o.e - (m.get(k)?.e || 0);
    if (d <= 0) continue;
    if (o.f.k === 'n') n *= o.f.v ** d;
    else if (o.f.k === 'v') fs.push(V(o.f.b, d));
    else if (o.f.k === 'p') fs.push(Pr(o.f.terms.map(cloneT), d));
    else for (let i = 0; i < d; i++) fs.push(Rt(o.f.terms.map(cloneT)));
  }
  if (n === 1 && !fs.length) return null;
  return T([...(n > 1 ? [N(n)] : []), ...fs]);
}
// the common bottom of some bottoms, as one term (an equation is multiplied by it); null if one isn't simple
export function lcdTerm(dens) {
  const maps = dens.map(partsOf);
  if (maps.some(m => !m)) return null;
  return missing(new Map(), lcdOf(maps));
}

/* ---- hints ---- */
// 3 · x/4: put the 3 on top first (unless it is a number fraction in front of letters: ⅔x)
export function intoFrac(S) {
  let h = null;
  eachTerm(S, L => {
    const t = L.term, q = t.f.find(f => f.k === 'q');
    if (h || !q || t.f.length < 2 || (tidy(t) && S.goal !== 'combine')) return;
    const o = t.f.find(f => f !== q);
    h = { k: 'hIntoFrac', p: { x: mx(fx(o)), q: mx(fx(q)) }, ids: [o.id, q.id] };
  });
  return h;
}
// two fractions over the same bottom: join them
export function joinFracs(S) {
  for (const ts of containers(S)) {
    const pair = joinablePair(ts);
    if (pair) { const [a, b] = pair.map(fracTerm); return { k: 'hJoinFrac', p: { x: mx(fx(a)), y: mx(fx(b)), d: mx(sumHTML(a.den)) }, ids: [a.id, b.id] }; }
  }
  return null;
}
// to write a sum as one fraction: expand each term to the common bottom
export function expandToCommon(S) {
  if (S.parts.length !== 1 || !isOne(S.parts[0].den)) return null;
  const ts = S.parts[0].num;
  if (ts.length < 2 || !ts.some(fracTerm) || ts.some(t => t.f.some(f => f.k === 'q') && !fracTerm(t))) return null;
  const maps = ts.map(t => partsOf(fracTerm(t) ? fracTerm(t).den : [T([N(1)])]));
  if (maps.some(m => !m)) return null;
  const lcd = lcdOf(maps);
  for (let i = 0; i < ts.length; i++) {
    const v = missing(maps[i], lcd);
    if (!v) continue;
    const q = fracTerm(ts[i]);
    return { k: 'hExpandTo', p: { x: mx(termHTML(ts[i])), v: mx(termHTML(v)), d: mx(termHTML(missing(new Map(), lcd))) }, ids: [q ? q.id : ts[i].f[0].id], expand: v };
  }
  return null;
}
defineHintMove(h => h.k === 'hExpandTo', (S, h) => opExpand(S, h.ids[0], h.expand));

// 1/√2 → √2/(√2·√2): a root below the bar goes away by expanding with that root (when the level asks)
export function rationalize(S) {
  if (!S.rootFree || S.parts.length !== 1) return null;
  const r = rootBelow(S.parts[0]);
  if (!r) return null;
  // √3 · √3 below the bar: merge them into √(3·3) first (cancelling one against the top would undo the expanding)
  const rs = S.parts[0].den[0].f.filter(f => f.k === 'r' && fkey(f) === fkey(r));
  if (rs.length > 1) return { k: 'hMerge', p: { x: mx(fx(rs[0])), y: mx(fx(rs[1])) }, ids: [rs[0].id, rs[1].id] };
  return { k: 'hRationalize', p: { x: mx(fx(r)) }, ids: [r.id], expand: T([Rt(r.terms.map(cloneT))]) };
}
defineHintMove(h => h.k === 'hRationalize', (S, h) => opExpand(S, h.ids[0], h.expand));
addTactic('simplify', rationalize, { before: 'cancelAcross' });

// in simplify, a fraction's own pieces go on top and fractions over the same bottom join
addTactic('simplify', intoFrac, { before: 'likeTerms' });
addTactic('simplify', joinFracs, { before: 'openBrackets' });
// written as one fraction (the combine goal): the same, and then everything over one bottom. Only the result is
// cancelled: cancelling a fraction just expanded would undo the expansion (½ + ⅓ → 3/6 + … → ½ + … again)
const cancelWhole = S => cancelIn(S.parts[0]);
defineGoal('combine', { isDone: S => isCombined(S), tactics: [fractionPair, rootPairs, groups, cancelWhole, merges, intoFrac, likeTerms, joinFracs, expandToCommon, openBrackets] });
