/* Logarithms, the moves: the log of a product explodes into the sum of the logs, log(ab) = log a + log b.
   Nothing else. log(a³) is not turned into 3 log a by a rule: explode a³ inside it first, explode the log,
   and the three like terms add up to 3 log a. The rule holds for positive letters, so exploding writes that
   down (a > 0), the way dividing by a letter writes down a ≠ 0. */
import '../../core/goals/index.js';   // the goals exist before a tactic is added to one
import { addTactic, defineHintMove } from '../../core/goals/registry.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { Pr } from '../../core/kinds/bracket.js';
import { F, T, cloneF, cloneT, fkey, sumKey } from '../../core/kinds/sums.js';
import { addCond, eachFactor, primeFactors } from '../../core/model.js';
import { opExplode } from '../../core/rules/engine.js';
import { defineExplode, definePairRule } from '../../core/rules/registry.js';
import { GEN } from '../../practice.js';
import { condHTML, defineHTML, fx, mx, sumHTML, termHTML } from '../../render/text.js';
import { Lg, atomicLog } from './kind.js';

// what a log rule takes for granted: every piece with a letter in it is positive (a letter: a > 0; a bracket: the
// bracket > 0). A number needs nothing, and neither does a power 2ˣ, which is always positive.
function posConds(S, fs) {
  const seen = new Set(), out = [];
  for (const g of fs) {
    if (g.k === 'n' || g.k === 'ex' || !hasLetterIn(g)) continue;
    const t = g.k === 'v' ? T([V(g.b)]) : T([cloneF(g)]), k = sumKey([t]);
    if (seen.has(k)) continue;
    seen.add(k); out.push(condHTML(addCond(S, [t], 'gt')));
  }
  return out.join(', ');
}
const hasLetterIn = g => JSON.stringify(g).includes('"k":"v"');
// log(ab) → log a + log b; c·log(ab) → c·log a + c·log b
defineExplode('log', (S, L, id) => {
  const f = L.f, x = mx(fx(f));
  if (f.terms.length > 1) return { no: 'logSum', p: { x }, ids: [id] };
  const inner = f.terms[0];
  if (inner.neg || atomicLog(f)) return { no: 'logAtom', p: { x }, ids: [id] };
  const g = inner.f.length === 1 ? inner.f[0] : null;
  // log(a/b) → log a − log b: the quotient rule, the twin of the product rule
  if (g && g.k === 'q' && g.num.length === 1 && g.den.length === 1 && !g.num[0].neg && !g.den[0].neg) {
    const before = mx(termHTML(L.term)), others = L.term.f.filter(h => h !== f), origins = {};
    const nts = [[g.num[0], false], [g.den[0], true]].map(([side, minus]) => {
      const lg = Lg([T(side.f.map(cloneF))]); origins[lg.id] = [f.id];
      return T([...others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; }), lg], L.term.neg !== minus);
    });
    L.terms.splice(L.t, 1, ...nts);
    const c = posConds(S, [...g.num[0].f, ...g.den[0].f]);
    return { ok: 'logQuotient', p: { x: before, ex: mx(sumHTML(nts)), c }, born: Object.keys(origins).map(Number), origins, arcs: true };
  }
  // log(2ˣ) → x · log 2, log(a³) → 3 log a: the shortcut, earned by finishing the logarithm skill
  const pw = g && (g.k === 'ex' || (g.k === 'v' && Number.isInteger(g.e) && g.e > 1) || (g.k === 'g' && g.f.length === 1 && g.f[0].k === 'n' && Number.isInteger(g.e) && g.e > 1));
  if (pw && (S.earned || []).includes('logPower')) {
    const exp = g.k === 'ex' ? (g.terms.length === 1 ? g.terms[0].f.map(cloneF) : [Pr(g.terms.map(cloneT))]) : [N(g.e)];
    const neg = g.k === 'ex' && g.terms.length === 1 && g.terms[0].neg;
    const lg = Lg([T([g.k === 'v' ? V(g.b) : N(g.k === 'ex' ? g.b : g.f[0].v)])]);
    const before = mx(fx(f)), nf = [...exp, lg];
    L.term.f.splice(L.i, 1, ...nf); if (neg) L.term.neg = !L.term.neg;
    const c = g.k === 'v' ? condHTML(addCond(S, [T([V(g.b)])], 'gt')) : null;
    return { ok: c ? 'logPowerIf' : 'logPower', p: { x: before, ex: mx(fx(lg).replace(/^/, nf.slice(0, -1).map(fx).join('') + ' · ')), c }, born: nf.map(h => h.id), origins: Object.fromEntries(nf.map(h => [h.id, [f.id]])) };
  }
  if (g && g.k === 'ex') return { no: 'logPowerLocked', p: { x }, ids: [id] };
  if (inner.f.length === 1) return { no: 'logInside', p: { x, y: mx(fx(inner.f[0])) }, ids: [id] };
  const before = mx(termHTML(L.term)), others = L.term.f.filter(g => g !== f), origins = {};
  const nts = inner.f.map(g => {
    const lg = Lg([T([g])]); origins[lg.id] = [f.id];
    return T([...others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; }), lg], L.term.neg);
  });
  L.terms.splice(L.t, 1, ...nts);
  const c = posConds(S, inner.f);
  return { ok: 'logProduct', p: { x: before, ex: mx(sumHTML(nts)), c }, born: Object.keys(origins).map(Number), origins, arcs: true };
});

// two different logs in two terms: not like terms, and neither can go outside brackets
definePairRule('sum', 'logs', (S, A, B) => A.f.k === 'log' && B.f.k === 'log' && fkey(A.f) !== fkey(B.f) ? { type: 'none' } : undefined, { before: 'likeTerms' });

// the hint: explode a log of a product; a power or a composite number inside explodes first
export function explodeLogs(S) {
  let h = null;
  eachFactor(S, L => {
    if (h || L.f.k !== 'log' || atomicLog(L.f) || L.f.terms.length > 1) return;
    const inner = L.f.terms[0].f;
    if (inner.length > 1 || inner[0].k === 'q') h = { k: 'hExplodeLog', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
    else if ((inner[0].k === 'v' && inner[0].e > 1) || (inner[0].k === 'n' && primeFactors(inner[0].v).length > 1))
      h = { k: 'hExplodeLogInside', p: { x: mx(fx(L.f)), y: mx(fx(inner[0])) }, ids: [inner[0].id] };
  });
  return h;
}
addTactic('simplify', explodeLogs, { before: 'merges' });
defineHintMove(h => h.k === 'hExplodeLog' || h.k === 'hExplodeLogInside', (S, h) => opExplode(S, h.ids[0]));

defineHTML('log', 2, f => `<span class="mfn">log</span>(${sumHTML(f.terms)})`);

// practice: d1 a product, d2 a power inside, d3 a difference that leaves less
const L1 = (...fs) => Lg([T(fs)]);
GEN.logs = d => {
  const [p, q, r] = ['a', 'b', 'c'];
  const forms = d === 1 ? [() => [T([L1(V(p), V(q))])], () => [T([L1(V(p), V(q), V(r))])], () => [T([N(2), L1(V(p), V(q))])]]
    : d === 2 ? [() => [T([L1(V(p, 2))])], () => [T([L1(V(p, 3))])], () => [T([L1(V(p, 2), V(q))])], () => [T([L1(V(p), V(q, 2))])]]
      : [() => [T([L1(V(p, 2), V(q))]), T([L1(V(q))], true)], () => [T([L1(V(p, 3))]), T([L1(V(p))], true)], () => [T([L1(V(p), V(q))]), T([L1(V(p))])]];
  return { parts: [F(forms[Math.floor(Math.random() * forms.length)]())], goal: 'simplify' };
};
