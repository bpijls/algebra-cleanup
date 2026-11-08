/* "Done?" pressed too early: say what is still left, without giving the move away. */
import { quadSplit } from './hints.js';
import { sumKey } from './kinds/sums.js';
import { SIDES, coefAbs, gcd, hasU, isClean, isOne, sig, sumClean, tidy, unbare, unknownOf, varPart } from './model.js';
import { branchCount, eqView, isBranched } from './problem.js';
import { bx, fx, mx, termHTML } from '../render/text.js';

/* "Done?" pressed too early: say what is still left, without giving the move away */
export function whyNotDone(S) {
  if (isClean(S)) return null;
  const th = t => mx(termHTML(t));
  // an identity: first what is left on each side, then that the two sides don't read the same yet
  if (S.goal === 'prove') {
    for (const P of S.parts) { const w = whyNotDone({ parts: [P], op: null, goal: 'simplify', conds: S.conds }); if (w) return w; }
    return { k: 'nyProve' };
  }
  if (S.goal === 'solve' && isBranched(S)) {
    for (let b = 0; b < branchCount(S); b++) { const w = whyNotDone(eqView(S, b)); if (w) return w; }
    return null;
  }
  if (S.goal === 'solve') {
    const u = unknownOf(S), has = P => hasU([...P.num, ...P.den], u);
    const [l, r] = S.parts.map(has);
    if (l && r) return { k: 'nyEqBoth' };
    const P = S.parts[l ? 0 : 1], t = P.num[0];
    if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1 || t.f[0].k !== 'v' || t.f[0].e !== 1) return { k: 'nyEqAlone' };
    return { k: 'nyEqTidy' };
  }
  if (S.parts.length > 1) return { k: 'nyTwoParts' };
  const P = S.parts[0];
  if (S.goal === 'factor') {
    if (P.num.length > 1) return { k: 'nyTerms', p: { n: P.num.length } };
    const t = P.num[0], ps = t.f.filter(f => f.k === 'p');
    if (!isOne(P.den) || !ps.length) return { k: 'nyNoBracket' };
    if (!tidy({ f: t.f.filter(f => f.k !== 'p') })) return { k: 'nyTidy', p: { t: th({ f: t.f.filter(f => f.k !== 'p') }) } };
    const seen = new Set();
    for (const f of ps) {
      const x = mx(fx(f)), inner = f.terms, k = sumKey(inner);
      if (seen.has(k)) return { k: 'nySame', p: { x } };
      seen.add(k);
      if (!sumClean(inner) || !inner.every(it => tidy(it))) return { k: 'nyInside', p: { x } };
      let g = 0; inner.forEach(it => { g = gcd(g, coefAbs(it)); });
      if (g > 1 || varPart(inner[0]).some(v => inner.every(it => varPart(it).some(w => w.b === v.b)))) return { k: 'nyShared', p: { x } };
      if (quadSplit(inner)) return { k: 'nySplits', p: { x } };
    }
    return { k: 'nyTidyAll' };
  }
  for (const side of SIDES) {
    const ts = unbare(P[side]);
    const bad = ts.find(t => !tidy(t, !!S.allowB));
    if (bad) return { k: !S.allowB && bad.f.some(f => f.k === 'p' || f.k === 'g') ? 'nyBracket' : 'nyTidy', p: { t: th(bad) } };
    const sigs = ts.map(sig), j = sigs.findIndex((s, i) => sigs.indexOf(s) !== i);
    if (j >= 0) return { k: 'nyLike', p: { a: th(ts[sigs.indexOf(sigs[j])]), b: th(ts[j]) } };
  }
  const all = [...unbare(P.num), ...unbare(P.den)];
  let g = 0; for (const t of all) g = gcd(g, coefAbs(t));
  if (g > 1) return { k: 'nyCancelNum' };
  const b = varPart(all[0]).map(f => f.b).find(b => all.every(t => varPart(t).some(f => f.b === b)));
  if (b) return { k: 'nyCancelVar', p: { b: bx(b) } };
  return { k: 'nyTidyAll' };
}
