/* Complex numbers: i · i = −1 is the one new rule, and √(−4) = i · √4 says what a root of a negative number is.
   The rest is the algebra the player already has: like terms (2i + 3i), opening brackets ((2 + i)(3 − i)),
   completing the square past D < 0, root of both sides (allowed with a negative value when S.complex). */
import '../../core/goals/index.js';
import { addTactic, defineHintMove } from '../../core/goals/registry.js';
import { N } from '../../core/kinds/number.js';
import { Rt } from '../../core/kinds/root.js';
import { T, cloneF } from '../../core/kinds/sums.js';
import { eachFactor } from '../../core/model.js';
import { opExplode, opPair } from '../../core/rules/engine.js';
import { EXPLODE, defineAction, defineExplode, definePairRule } from '../../core/rules/registry.js';
import { defineLetter } from '../../parse.js';
import { defineHTML, fx, mx, termHTML } from '../../render/text.js';
import { Im } from './kind.js';

defineHTML('im', 1, f => `<i class="mi">i</i>${f.e !== 1 ? `<sup>${f.e}</sup>` : ''}`);
// typed: i is the imaginary unit, and the problem is about complex numbers
defineLetter('i', { flag: 'complex', make: e => [Im(Number.isInteger(e) && e > 0 ? e : 1)] });

// i³ → i · i · i (the same as a letter); i on its own is as small as it gets
defineExplode('im', (S, L, id) => {
  const f = L.f;
  if (f.e === 1) return { no: 'iAtom', ids: [id] };
  const made = Array.from({ length: f.e }, () => Im(1));
  L.term.f.splice(L.i, 1, ...made);
  return { ok: 'iPow', p: { x: mx(fx(f)), ex: mx(made.map(fx).join(' · ')) }, born: made.map(g => g.id), origins: Object.fromEntries(made.map(g => [g.id, [f.id]])) };
});

// √(−4) → i · √4: the root of a negative number, by what i is (only with complex numbers; a real root refuses)
const realRoot = EXPLODE.r;
defineExplode('r', (S, L, id) => {
  const f = L.f, t = f.terms.length === 1 ? f.terms[0] : null;
  if (!S.complex || !t || !t.neg) return realRoot(S, L, id);
  const before = mx(fx(f)), i = Im(1), rest = T(t.f.map(cloneF)), made = [i];
  const isOne = rest.f.length === 1 && rest.f[0].k === 'n' && rest.f[0].v === 1;
  if (!isOne) made.unshift(Rt([rest]));   // √4 · i: the number it becomes stands in front, 2i
  L.term.f.splice(L.i, 1, ...made);
  return { ok: 'rootI', p: { x: before, ex: mx(made.map(fx).join(' · ')), r: mx(fx(Rt([T(rest.f.map(cloneF))]))) }, born: made.map(g => g.id), origins: Object.fromEntries(made.map(g => [g.id, [f.id]])) };
});

// i · i = −1: tap one i, then another in the same term
definePairRule('sum', 'iSquare', (S, A, B) => A.term === B.term && A.f.k === 'im' && B.f.k === 'im'
  ? (A.f.e === 1 && B.f.e === 1 ? { type: 'iSquare' } : { type: 'fizzle', msg: 'iPowFirst' }) : undefined, { before: 'sameTerm' });
defineAction('iSquare', (S, A) => {
  const t = A.term, before = mx(termHTML(t)), [x, y] = t.f.filter(f => f.k === 'im' && f.e === 1);
  const one = N(1);
  t.f.splice(t.f.indexOf(x), 1, one); t.f.splice(t.f.indexOf(y), 1);
  t.neg = !t.neg;
  return { ok: 'iSquare', p: { x: before, ex: mx(termHTML(t)) }, born: [one.id], origins: { [one.id]: [x.id, y.id] } };
});

// the hints: a root of a negative number, a power of i, then i · i
// (no S.complex check: a side is tidied on its own, as a view without the flag; these pieces only exist with it)
export function complexTidy(S) {
  let h = null;
  eachFactor(S, L => {
    if (h) return;
    const f = L.f;
    if (f.k === 'r' && f.terms.length === 1 && f.terms[0].neg) h = { k: 'hRootI', p: { x: mx(fx(f)) }, ids: [f.id] };
    else if (f.k === 'im' && f.e > 1) h = { k: 'hIPow', p: { x: mx(fx(f)) }, ids: [f.id] };
    else if (f.k === 'im') {
      const other = L.term.f.find(g => g !== f && g.k === 'im' && g.e === 1);
      if (other && L.term.f.indexOf(other) > L.i) h = { k: 'hISquare', p: {}, ids: [f.id, other.id] };
    }
  });
  return h;
}
for (const goal of ['simplify', 'factor']) addTactic(goal, complexTidy, { before: 'rootPairs' });
defineHintMove(h => h.k === 'hRootI' || h.k === 'hIPow', (S, h) => opExplode(S, h.ids[0]));
defineHintMove(h => h.k === 'hISquare', (S, h) => opPair(S, h.ids[0], h.ids[1]));
