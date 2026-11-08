/* Boolean algebra with the same tiles: + is OR, · is AND. Nothing new is magic: every law is a tap.
     in one term (AND):   a · a = a,  a · ¬a = 0,  a · 0 = 0  (a · 1 = a: the 1 just drops, as always)
     across terms (OR):   a + a = a,  a + ¬a = 1,  1 + a = 1  (a + 0 = a: the 0 drops)
   A shared piece goes outside brackets as usual, and that is how absorption is earned: a + ab → a(1 + b) →
   a · 1 → a, and ab + a¬b → a(b + ¬b) → a · 1 → a. NOT explodes by De Morgan: ¬(ab) → ¬a + ¬b, ¬(a + b) →
   ¬a · ¬b, ¬¬a → a. The moves that only hold for numbers (2a, splitting a term, expanding) are gated. */
import { defineGoal, defineHintMove } from '../../core/goals/registry.js';
import { Pr } from '../../core/kinds/bracket.js';
import { N } from '../../core/kinds/number.js';
import { T, cloneF, cloneT, fkey, sumKey } from '../../core/kinds/sums.js';
import { defineWhy } from '../../core/done.js';
import { opExplode, opPair } from '../../core/rules/engine.js';
import { defineAction, defineExplode, defineGate, definePairRule } from '../../core/rules/registry.js';
import { defineUnary } from '../../parse.js';
import { defineHTML, fx, mx, sumHTML, termHTML } from '../../render/text.js';
import { Not, literal } from './kind.js';

const isLogic = S => S.goal === 'logic';
// the ¬ is hidden text (read by screen readers and strip()); the bar over it is what shows
defineHTML('not', 1, f => `<span class="ovn">¬</span><span class="ov">${f.terms.length > 1 || f.terms[0].f.length > 1 ? `<span class="ovn">(</span>${sumHTML(f.terms)}<span class="ovn">)</span>` : sumHTML(f.terms)}</span>`, f => (JSON.stringify(f.terms).match(/"b":"(\w)"/) || [, ''])[1] + '¬');
// ¬a, ¬(a + b): typed with ¬ or !
defineUnary('not', fs => Not(fs.length === 1 && fs[0].k === 'p' && fs[0].e === 1 ? fs[0].terms : [T(fs)]));
// only moves that hold in logic: no 2a, no 1 = 2 − 1, no expanding a fraction
defineGate((S, id) => isLogic(S) && ['splitTwo', 'gather', 'sweep', 'termPair', 'expand', 'toNeg', 'toHalf', 'asPower'].includes(id));

const isN = (f, v) => f.k === 'n' && f.v === v;
const oneTerm = t => t.f.length === 1 && isN(t.f[0], 1);
// x and ¬x
const complement = (x, y) => (x.k === 'not' && sumKey(x.terms) === sumKey([T([cloneF(y)])])) || (y.k === 'not' && sumKey(y.terms) === sumKey([T([cloneF(x)])]));

definePairRule('sum', 'bool', (S, A, B) => {
  if (!isLogic(S)) return undefined;
  const x = A.f, y = B.f;
  if (A.term === B.term) {
    if (isN(x, 0) || isN(y, 0)) return { type: 'andZero' };
    if (fkey(x) === fkey(y)) return { type: 'andSame' };
    if (complement(x, y)) return { type: 'andNot' };
    return { type: 'none' };
  }
  if (oneTerm(A.term) || oneTerm(B.term)) return { type: 'orOne', one: oneTerm(A.term) ? 'A' : 'B' };
  if (sumKey([A.term]) === sumKey([B.term])) return { type: 'orSame' };
  if (A.term.f.length === 1 && B.term.f.length === 1 && complement(x, y)) return { type: 'orNot' };
  if (fkey(x) === fkey(y)) return { type: 'factor', useless: false };
  if (complement(x, y)) return { type: 'fizzle', msg: 'orNotRest', p: { x: mx(termHTML(A.term)), y: mx(termHTML(B.term)) } };
  return { type: 'fizzle', msg: 'boolNoPair', p: { x: mx(termHTML(A.term)), y: mx(termHTML(B.term)) } };
}, { before: 'factorRest' });

const th = t => mx(termHTML(t));
defineAction('andZero', (S, A) => {
  const t = A.term, before = th(t), z = N(0);
  t.f = [z];
  return { ok: 'andZero', p: { x: before }, born: [z.id] };
});
defineAction('andSame', (S, A, B) => {
  const t = A.term, before = th(t);
  t.f.splice(t.f.indexOf(B.f), 1);
  return { ok: 'andSame', p: { x: before, ex: th(t), a: mx(fx(A.f)) }, born: [A.f.id] };
});
defineAction('andNot', (S, A, B) => {
  const t = A.term, before = th(t), z = N(0);
  t.f = [z];
  return { ok: 'andNot', p: { x: before, a: mx(fx(literalOf(A.f, B.f))) }, born: [z.id] };
});
const literalOf = (x, y) => x.k === 'not' ? y : x;
defineAction('orOne', (S, A, B, v) => {
  const [O, X] = v.one === 'A' ? [A, B] : [B, A], ts = A.terms, before = mx(sumHTML([O.term, X.term]));
  ts.splice(ts.indexOf(X.term), 1);
  return { ok: 'orOne', p: { x: before, y: th(X.term) }, born: [O.f.id] };
});
defineAction('orSame', (S, A, B) => {
  const ts = A.terms, before = mx(sumHTML([A.term, B.term]));
  ts.splice(ts.indexOf(B.term), 1);
  return { ok: 'orSame', p: { x: before, ex: th(A.term) }, born: A.term.f.map(f => f.id) };
});
defineAction('orNot', (S, A, B) => {
  const ts = A.terms, before = mx(sumHTML([A.term, B.term])), one = T([N(1)]);
  ts.splice(ts.indexOf(A.term), 1, one);
  ts.splice(ts.indexOf(B.term), 1);
  return { ok: 'orNot', p: { x: before, a: mx(fx(literalOf(A.f, B.f))) }, born: [one.f[0].id] };
});

// NOT explodes: ¬¬a → a, ¬(ab) → ¬a + ¬b, ¬(a + b) → ¬a · ¬b, ¬0 → 1, ¬1 → 0
defineExplode('not', (S, L, id) => {
  const f = L.f, x = mx(fx(f)), ts = f.terms, put = made => L.term.f.splice(L.i, 1, ...made);
  const born = made => ({ born: made.map(g => g.id), origins: Object.fromEntries(made.map(g => [g.id, [f.id]])) });
  if (ts.length > 1) {   // ¬(a + b) → ¬a · ¬b
    const made = ts.map(t => Not([T(t.f.map(cloneF))]));
    put(made);
    return { ok: 'deMorganOr', p: { x, ex: mx(made.map(fx).join(' · ')) }, ...born(made) };
  }
  const t = ts[0];
  if (t.f.length > 1) {  // ¬(ab) → ¬a + ¬b
    const br = Pr(t.f.map(g => T([Not([T([cloneF(g)])])])));
    put([br]);
    return { ok: 'deMorganAnd', p: { x, ex: mx(sumHTML(br.terms)) }, ...born([br]) };
  }
  const g = t.f[0];
  if (g.k === 'n') { const n = N(g.v ? 0 : 1); put([n]); return { ok: 'notConst', p: { x, ex: n.v }, ...born([n]) }; }
  if (g.k === 'not') {   // ¬¬a → a
    const inner = g.terms.length === 1 ? g.terms[0].f.map(cloneF) : [Pr(g.terms.map(cloneT))];
    put(inner);
    return { ok: 'notNot', p: { x, ex: mx(inner.map(fx).join(' · ')) }, ...born(inner) };
  }
  if (g.k === 'p') {     // ¬((a + b)): the bracket is the NOT's own
    const made = Not(g.terms.map(cloneT));
    put([made]);
    return { ok: 'notNot', p: { x, ex: mx(fx(made)) }, ...born([made]) };
  }
  return { no: 'notAtom', p: { x }, ids: [id] };
});

/* ---- the goal: nothing left to tap ---- */
// every sum in the expression, innermost last; each with the factor that holds it (null at the top)
function sums(S) {
  const out = [];
  const visit = (terms, owner) => { out.push({ terms, owner }); for (const t of terms) for (const f of t.f) if (f.terms && (f.k === 'p' || f.k === 'not')) visit(f.terms, f); };
  for (const P of S.parts) visit(P.num, null);
  return out;
}
const lits = t => t.f.every(literal) ? t.f.map(fkey) : null;
const subset = (a, b) => a.every(k => b.includes(k));
export function logicHint(S) {
  if (!isLogic(S)) return null;
  const all = sums(S);
  // a NOT over more than one letter: open it (De Morgan)
  for (const { terms } of all) for (const t of terms) for (const f of t.f) if (f.k === 'not' && !literal(f)) return { k: 'hNot', p: { x: mx(fx(f)) }, ids: [f.id] };
  // in a term: 0, twice the same, a letter with its NOT
  for (const { terms } of all) for (const t of terms) {
    const z = t.f.find(f => isN(f, 0));
    if (z && t.f.length > 1) return { k: 'hAndZero', p: { x: th(t) }, ids: [z.id, t.f.find(f => f !== z).id] };
    for (let i = 0; i < t.f.length; i++) for (let j = i + 1; j < t.f.length; j++) {
      if (fkey(t.f[i]) === fkey(t.f[j])) return { k: 'hAndSame', p: { x: th(t) }, ids: [t.f[i].id, t.f[j].id] };
      if (complement(t.f[i], t.f[j])) return { k: 'hAndNot', p: { x: th(t) }, ids: [t.f[i].id, t.f[j].id] };
    }
  }
  // across terms: a 1, the same term twice, a letter and its NOT
  for (const { terms } of all) {
    if (terms.length < 2) continue;
    const one = terms.find(oneTerm);
    if (one) { const o = terms.find(t => t !== one); return { k: 'hOrOne', p: { x: th(o) }, ids: [one.f[0].id, o.f[0].id] }; }
    for (let i = 0; i < terms.length; i++) for (let j = i + 1; j < terms.length; j++) {
      const a = terms[i], b = terms[j];
      if (sumKey([a]) === sumKey([b])) return { k: 'hOrSame', p: { x: th(a) }, ids: [a.f[0].id, b.f[0].id] };
      if (a.f.length === 1 && b.f.length === 1 && complement(a.f[0], b.f[0])) return { k: 'hOrNot', p: { x: mx(sumHTML([a, b])) }, ids: [a.f[0].id, b.f[0].id] };
    }
    // absorption (a + ab) and a pair that differs in one letter only (ab + a¬b): a shared piece goes outside
    for (let i = 0; i < terms.length; i++) for (let j = 0; j < terms.length; j++) {
      if (i === j) continue;
      const a = lits(terms[i]), b = lits(terms[j]);
      if (!a || !b) continue;
      const absorb = subset(a, b);
      const adjacent = a.length === b.length && a.filter(k => !b.includes(k)).length === 1
        && complement(terms[i].f.find(f => !b.includes(fkey(f))), terms[j].f.find(f => !a.includes(fkey(f))));
      if (!absorb && !adjacent) continue;
      const shared = terms[i].f.find(f => b.includes(fkey(f)));
      if (!shared) continue;
      const other = terms[j].f.find(f => fkey(f) === fkey(shared));
      return { k: absorb ? 'hAbsorb' : 'hAdjacent', p: { x: mx(sumHTML([terms[i], terms[j]])), a: mx(fx(shared)) }, ids: [shared.id, other.id] };
    }
  }
  // a bracket with nothing left inside: open it
  for (const { terms } of all) for (const t of terms) for (const f of t.f) if (f.k === 'p') return { k: 'hOpen', p: {}, ids: [f.id] };
  return null;
}
defineGoal('logic', { isDone: S => S.parts.length === 1 && !logicHint(S), tactics: [S => logicHint(S)] });
defineHintMove(h => h.k === 'hNot', (S, h) => opExplode(S, h.ids[0]));
defineHintMove(h => ['hAndZero', 'hAndSame', 'hAndNot', 'hOrOne', 'hOrSame', 'hOrNot', 'hAbsorb', 'hAdjacent'].includes(h.k), (S, h) => opPair(S, h.ids[0], h.ids[1]));

// Done? too early: what kind of thing is still left (not which move)
const WHY = { hNot: 'nyNot', hAndZero: 'nyAnd', hAndSame: 'nyAnd', hAndNot: 'nyAnd', hOrOne: 'nyOr', hOrSame: 'nyOr', hOrNot: 'nyOr', hAbsorb: 'nyAbsorb', hAdjacent: 'nyAdjacent', hOpen: 'nyLogicBracket' };
defineWhy('logic', S => { const h = logicHint(S); return h ? { k: WHY[h.k] } : null; });
