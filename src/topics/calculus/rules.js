/* Derivatives, exploded by what is inside (with respect to x):
     (f + g)′ → f′ + g′            (dSum)         (c · f)′ → c · f′     (dConst: c a number, or a letter that isn't x)
     (5)′ → 0                      (dZero)        (x)′ → 1              (dX)
     (f · g)′ → f′ · g + f · g′    (dProduct: the first piece against the rest)
   x³ is exploded first (x · x · x), so the power rule comes out of the product rule; once the derivative skill
   is done, (xⁿ)′ → n · xⁿ⁻¹ is an earned shortcut (dPower). */
import '../../core/goals/index.js';
import { addTactic, defineHintMove } from '../../core/goals/registry.js';
import { Pr } from '../../core/kinds/bracket.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { T, cloneF, cloneT, fHasU } from '../../core/kinds/sums.js';
import { eachFactor } from '../../core/model.js';
import { opExplode } from '../../core/rules/engine.js';
import { defineExplode } from '../../core/rules/registry.js';
import { defineUnary } from '../../parse.js';
import { defineHTML, fx, mx, sumHTML } from '../../render/text.js';
import { D } from './kind.js';

defineHTML('d', 3, f => `(${sumHTML(f.terms)})′`);
defineUnary('prime', terms => D(terms));
export const EARNED_D = ['dPower'];

const withX = f => fHasU(f, 'x');
defineExplode('d', (S, L, id) => {
  const f = L.f, x = mx(fx(f)), ts = f.terms;
  const put = made => { L.term.f.splice(L.i, 1, ...made); return { born: made.map(g => g.id), origins: Object.fromEntries(made.map(g => [g.id, [f.id]])) }; };
  if (ts.length > 1) {   // a sum: one derivative per term
    const made = Pr(ts.map(t => T([D([T(t.f.map(cloneF))])], t.neg)));
    return { ok: 'dSum', p: { x, ex: mx(sumHTML(made.terms)) }, ...put([made]) };
  }
  const t = ts[0];
  if (t.neg) { L.term.neg = !L.term.neg; const made = D([T(t.f.map(cloneF))]); return { ok: 'dNeg', p: { x, ex: mx('−' + fx(made)) }, ...put([made]) }; }
  const consts = t.f.filter(g => !withX(g)), rest = t.f.filter(withX);
  if (!rest.length) { const z = N(0); return { ok: 'dZero', p: { x }, ...put([z]) }; }
  if (consts.length) {   // 3x → 3 · (x)′
    const made = [...consts.map(cloneF), D([T(rest.map(cloneF))])];
    return { ok: 'dConst', p: { x, ex: mx(made.map(fx).join(' · ')) }, ...put(made) };
  }
  if (rest.length === 1) {
    const g = rest[0];
    if (g.k === 'v' && g.e === 1) { const one = N(1); return { ok: 'dX', p: { x }, ...put([one]) }; }
    if (g.k === 'v' && Number.isInteger(g.e) && g.e > 1) {
      if (!(S.earned || []).includes('dPower')) return { no: 'dPowerLocked', p: { x, y: mx(fx(g)) }, ids: [id] };
      const made = [N(g.e), V('x', g.e - 1)];
      return { ok: 'dPower', p: { x, ex: mx(made.map(fx).join('')) }, ...put(made) };
    }
    if (g.k === 'p' && g.e === 1) { const made = D(g.terms.map(cloneT)); return { ok: 'dBracket', p: { x, ex: mx(fx(made)) }, ...put([made]) }; }
    return { no: 'dInsideFirst', p: { x, y: mx(fx(g)) }, ids: [id] };
  }
  // a product: the first piece against the rest
  const [a, ...b] = rest;
  const made = Pr([T([D([T([cloneF(a)])]), ...b.map(cloneF)]), T([cloneF(a), D([T(b.map(cloneF))])])]);
  return { ok: 'dProduct', p: { x, ex: mx(sumHTML(made.terms)) }, ...put([made]) };
});

// the hint: work out the first derivative there is (a power inside it explodes first, unless the shortcut is earned)
export function derivs(S) {
  let h = null;
  eachFactor(S, L => {
    if (h || L.f.k !== 'd') return;
    const ts = L.f.terms, g = ts.length === 1 && !ts[0].neg && ts[0].f.filter(withX);
    if (g && g.length === 1 && ts[0].f.length === 1) {
      const p = g[0];
      if (p.k === 'v' && p.e > 1 && !(S.earned || []).includes('dPower')) { h = { k: 'hDerivPower', p: { x: mx(fx(p)) }, ids: [p.id] }; return; }
      if (p.k === 'p' && p.e > 1) { h = { k: 'hGroup', p: { x: mx(fx(p)) }, ids: [p.id] }; return; }
    }
    h = { k: 'hDeriv', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
  });
  return h;
}
// innermost first would also work; the outer one first keeps the steps in reading order
addTactic('simplify', derivs, { before: 'fractionPair' });
defineHintMove(h => h.k === 'hDeriv' || h.k === 'hDerivPower', (S, h) => opExplode(S, h.ids[0]));
