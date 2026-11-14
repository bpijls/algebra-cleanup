/* Exploding: tapping a piece twice shows what it is made of. One handler per kind of piece. */
import { Pr } from '../kinds/bracket.js';
import { G } from '../kinds/group.js';
import { V } from '../kinds/letter.js';
import { N } from '../kinds/number.js';
import { T, cloneF, cloneT } from '../kinds/sums.js';
import { isWhole } from '../kinds/exponent.js';
import { MAX_GROUP, MAX_VAR, primeFactors } from '../model.js';
import { flipPower, halfPower } from '../exponents.js';
import { defineExplode } from './registry.js';
import { bx, fx, mx, sumHTML, termHTML } from '../../render/text.js';

const fromOne = (f, made) => Object.fromEntries(made.map(c => [c.id, [f.id]]));

// a root is a tile, not a product: its number explodes (√(2·2·3)), the root itself doesn't
defineExplode('r', (S, L, id) => ({ no: 'rootTap', ids: [id] }));

// x³ → x · x · x
defineExplode('v', (S, L, id) => {
  const f = L.f;
  if (f.e < 0) return flipPower(S, L);         // a⁻² → 1/a²
  if (!isWhole(f.e)) return halfPower(S, L);   // a^½ → √a
  if (f.e < 2) return { no: 'atom', p: { x: mx(fx(f)) }, ids: [id] };
  if (f.e > MAX_VAR) return { no: 'tooBig', ids: [id] };
  const copies = Array.from({ length: f.e }, () => V(f.b, 1));
  L.term.f.splice(L.i, 1, ...copies);
  return { ok: 'explodeVar', p: { x: mx(fx(f)), n: f.e, b: bx(f.b), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: fromOne(f, copies) };
});

// 12 → 2 · 2 · 3
defineExplode('n', (S, L, id) => {
  const f = L.f;
  if (f.v === 1) return { no: 'atom', p: { x: mx('1') }, ids: [id] };
  const pf = primeFactors(f.v);
  if (pf.length < 2) return { no: 'prime', p: { n: f.v }, ids: [id] };
  const parts = pf.map(N);
  L.term.f.splice(L.i, 1, ...parts);
  return { ok: 'explodeNum', p: { n: f.v, ex: mx(pf.join(' · ')) }, born: parts.map(c => c.id), origins: fromOne(f, parts) };
});

// (a + b)² → (a + b)(a + b); 3(x + 2) → 3x + 3·2 (open the brackets: everything outside times every term inside)
defineExplode('p', (S, L, id) => {
  const f = L.f;
  if (f.e >= 2) {
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    const copies = Array.from({ length: f.e }, () => Pr(f.terms.map(cloneT)));
    L.term.f.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x: mx(fx(f)), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: fromOne(f, copies) };
  }
  const before = mx(termHTML(L.term));
  const others = L.term.f.filter(g => g !== f);
  const origins = {};
  const nts = f.terms.map(it => {
    const copies = others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; });
    // inner pieces keep their identity and slide; another bracket goes behind: a(c + d), not (c + d)a
    return T([...copies.filter(c => c.k !== 'p'), ...it.f, ...copies.filter(c => c.k === 'p')], L.term.neg !== it.neg);
  });
  L.terms.splice(L.t, 1, ...nts);
  return { ok: others.length ? 'distribute' : L.term.neg ? 'unwrapNeg' : 'unwrapSum', p: { x: before, ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins, arcs: true };
});

// (2a)³ → (2a)(2a)(2a); (2a) → 2 · a
defineExplode('g', (S, L, id) => {
  const f = L.f;
  if (f.e < 0) return flipPower(S, L);         // 2⁻³ → 1/2³
  if (!isWhole(f.e)) return halfPower(S, L);   // 9^½ → √9
  if (f.e >= 2) {
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    // one piece inside (2³, (a²)³) gives plain copies of it, not brackets: 2 · 2 · 2, which then multiply to 8
    const copies = Array.from({ length: f.e }, () => f.f.length === 1 ? cloneF(f.f[0]) : G(f.f.map(cloneF), 1));
    L.term.f.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x: mx(fx(f)), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: fromOne(f, copies) };
  }
  const items = f.f.map(cloneF);
  L.term.f.splice(L.i, 1, ...items);
  return { ok: 'unwrap', p: { x: mx(fx(f)), ex: mx(items.map(fx).join(' · ')) }, born: items.map(c => c.id), origins: fromOne(f, items) };
});
