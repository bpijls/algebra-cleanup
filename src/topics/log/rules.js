/* Logarithms, the moves: the log of a product explodes into the sum of the logs, log(ab) = log a + log b.
   Nothing else. log(a³) is not turned into 3 log a by a rule: explode a³ inside it first, explode the log,
   and the three like terms add up to 3 log a. The rule holds for positive letters, so exploding writes that
   down (a > 0), the way dividing by a letter writes down a ≠ 0. */
import '../../core/goals/index.js';   // the goals exist before a tactic is added to one
import { addTactic, defineHintMove } from '../../core/goals/registry.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { F, T, cloneF, fkey } from '../../core/kinds/sums.js';
import { addCond, eachFactor, primeFactors } from '../../core/model.js';
import { opExplode } from '../../core/rules/engine.js';
import { defineExplode, definePairRule } from '../../core/rules/registry.js';
import { GEN } from '../../practice.js';
import { condHTML, defineHTML, fx, mx, sumHTML, termHTML } from '../../render/text.js';
import { Lg, atomicLog } from './kind.js';

// log(ab) → log a + log b; c·log(ab) → c·log a + c·log b
defineExplode('log', (S, L, id) => {
  const f = L.f, x = mx(fx(f));
  if (f.terms.length > 1) return { no: 'logSum', p: { x }, ids: [id] };
  const inner = f.terms[0];
  if (inner.neg || atomicLog(f)) return { no: 'logAtom', p: { x }, ids: [id] };
  if (inner.f.length === 1) return { no: 'logInside', p: { x, y: mx(fx(inner.f[0])) }, ids: [id] };
  const before = mx(termHTML(L.term)), others = L.term.f.filter(g => g !== f), origins = {};
  const nts = inner.f.map(g => {
    const lg = Lg([T([g])]); origins[lg.id] = [f.id];
    return T([...others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; }), lg], L.term.neg);
  });
  L.terms.splice(L.t, 1, ...nts);
  const letters = [...new Set(inner.f.filter(g => g.k === 'v').map(g => g.b))];
  const c = letters.map(b => condHTML(addCond(S, [T([V(b)])], 'gt'))).join(', ');
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
    if (inner.length > 1) h = { k: 'hExplodeLog', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
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
