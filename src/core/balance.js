/* Equations: the balance method (do the same to both sides), dragging across the =, isSolved. */
import { numProd } from './hints.js';
import { Pr } from './kinds/bracket.js';
import { V } from './kinds/letter.js';
import { N } from './kinds/number.js';
import { T, cloneF, cloneT, fHasU, tHasU } from './kinds/sums.js';
import { SIDES, addCond, branchCount, eachFactor, eqView, hasU, isClean, isOne, pairOf, params, unknownOf, walkTerms } from './model.js';
import { hasLetter, opRoot, opZero } from './quadratic.js';
import { condHTML, factorsHTML, fracHTML, mx } from '../render/text.js';

/* ---- equations: the balance method ----
   S = { parts: [left, right], op: '=', goal: 'solve' }. Each side keeps every simplifying move.
   A term only crosses the = by doing the same thing to both sides (opBalance); tapping a piece on
   one side and then one on the other is refused (diffSides). */
export const BOPS = { '+': '+', '-': '−', '·': '·', ':': ':' };

export const letters = S => { const bs = new Set(); eachFactor(S, L => { if (L.f.k === 'v') bs.add(L.f.b); }); return [...bs]; };

export const isZeroSide = side => side.length === 1 && side[0].f.length === 1 && side[0].f[0].k === 'n' && side[0].f[0].v === 0;

// v: a monomial Term (its sign counts). op: '+', '-', '·', ':'
export function opBalance(S, op, v, bi = 0) {
  if (S.op !== '=' || !v || !v.f || !v.f.length || bi >= branchCount(S)) return null;
  const u = unknownOf(S), ps = params(S);
  const vNum = v.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);
  const shown = mx((v.neg ? '−' : '') + factorsHTML(v.f, true));
  const mul = op === '·' || op === ':';
  // a bracket only to multiply or divide by (a − c), and never one with the unknown in it
  if (v.f.some(f => f.k === 'g' || (f.k === 'r' && mul) || (f.k === 'p' && (!mul || f.e !== 1 || fHasU(f, u) || !hasLetter(f.terms))))) return { no: 'balanceShape', ids: ['op'] };
  const parts = pairOf(S, bi);
  if (vNum === 0) return { no: op === ':' ? 'balanceDivZero' : op === '·' ? 'balanceMulZero' : 'balanceNothing', ids: ['op'] };
  const born = [];
  let cond = null;
  if (!mul) {
    if (parts.some(P => !isOne(P.den))) return { no: 'balanceFrac', ids: ['op'] };
    for (const P of parts) {
      const t = cloneT(v); if (op === '-') t.neg = !t.neg;
      born.push(...t.f.map(f => f.id));
      // b² added to −4ac reads b² − 4ac
      if (isZeroSide(P.num)) P.num = [t];
      else if (!t.neg && P.num.length === 1 && P.num[0].neg && t.f.some(f => f.k === 'v')) P.num.unshift(t);
      else P.num.push(t);
    }
  } else {
    // the unknown could be 0, and a letter that isn't in the equation means nothing here
    if (v.f.some(f => (f.k === 'v' && (f.b === u || !ps.includes(f.b))) || (f.k === 'p' && f.terms.some(t => t.f.some(g => g.k === 'v' && !ps.includes(g.b))))))
      return { no: 'balanceLetter', p: { v: shown }, ids: ['op'] };
    const sym = v.f.filter(f => f.k !== 'n');
    if (!sym.length && vNum === 1 && !v.neg) return { no: 'balanceOne', ids: ['op'] };
    // numbers past exact arithmetic (only random play gets there)
    let big = 1; parts.forEach(P => walkTerms([...P.num, ...P.den], { depth: 0 }, M => { if (M.kind === 't') big = Math.max(big, numProd(M.term)); }));
    if (big * vNum > 1e12) return { no: 'tooBig', ids: ['op'] };
    for (const P of parts) {
      const side = op === '·' ? 'num' : 'den';
      const fs = [...(vNum !== 1 || !sym.length ? [N(vNum)] : []), ...sym.map(cloneF)]; born.push(...fs.map(f => f.id));
      const ts = P[side];
      if (op === ':' && isOne(ts)) P[side] = [T(fs, v.neg)];
      else if (ts.length === 1) {
        // numbers in front, letters after the term's own number, brackets at the back: 2a, 4a·b, x(a − c)
        const old = ts[0].f, at = old.findIndex(f => f.k !== 'n');
        const lets = fs.filter(f => f.k === 'v'), rest = old.slice();
        rest.splice(at < 0 ? rest.length : at, 0, ...lets);
        ts[0].f = [...fs.filter(f => f.k === 'n'), ...rest, ...fs.filter(f => f.k === 'p')];
        if (v.neg) ts[0].neg = !ts[0].neg;
      }
      else P[side] = [T([...fs, Pr(ts)], v.neg)];   // a sum gets multiplied as a whole: 2(x + 1)
    }
    // each letter or bracket must not be 0
    if (sym.length) cond = sym.map(f => condHTML(addCond(S, f.k === 'p' ? f.terms : [T([V(f.b, 1)])], 'ne'))).join(', ');
  }
  const sides = parts.map(P => fracHTML(P));
  return { ok: cond ? 'balanceIf' : 'balance', p: { op: BOPS[op], v: shown, ex: mx(sides.join(' = ')), c: cond }, born };
}

export function opSwap(S, bi = 0) {
  if (S.op !== '=' || bi >= branchCount(S)) return null;
  const [a, b] = pairOf(S, bi);
  S.parts.splice(2 * bi, 2, b, a);
  return { ok: 'swapSides', p: { ex: mx(fracHTML(b) + ' = ' + fracHTML(a)) } };
}

// dragging a piece across the = undoes what it does on its side, on both sides:
//   a term in a sum → take it away (3x + 5: drag 5 → − 5), the number in 3x → divide by 3,
//   what is below the bar → multiply by it, a lone −x → divide by −1
// a square on its own side (x², (x + 3)², not 2x² or −x²): its ² is a tile of its own that can be dragged across
export function loneSquare(P) {
  const t = P.num[0];
  if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1) return null;
  const f = t.f[0];
  return f.e === 2 && f.k !== 'n' && f.k !== 'r' ? f : null;
}

// the ² of a lone square has the id −(the square's id); dragging it takes the root of both sides,
// and dragging the 0 of '… = 0' onto a product splits it (a product is 0 when one of its factors is)
export function dragBalance(S, id) {
  if (S.op !== '=') return null;
  if (id < 0) {
    const pi = S.parts.findIndex(P => loneSquare(P)?.id === -id && hasU(P.num, unknownOf(S)));
    return pi < 0 ? null : { root: true, bi: pi >> 1 };
  }
  for (const [pi, P] of S.parts.entries()) for (const side of SIDES) for (const top of P[side]) {
    let L = null;
    walkTerms([top], { depth: 0 }, M => { if (!L && (M.kind === 't' ? M.term.id : M.f.id) === id) L = M; });
    if (!L) continue;
    const ts = P[side], bi = pi >> 1;
    if (side === 'num' && L.kind === 'f' && L.f.k === 'n' && L.f.v === 0 && isZeroSide(ts) && isOne(P.den)) return { zero: true, bi };
    if (side === 'den') return ts.length === 1 ? { op: '·', value: T(top.f.map(cloneF), top.neg), bi } : { no: 'dragDenSum' };
    const whole = { op: top.neg ? '+' : '-', value: T(top.f.map(cloneF)), bi };
    if (ts.length > 1 || L.kind === 't') return whole;
    // the only term on its side: a number in front divides, and so does a letter or bracket in a term with the
    // unknown (ax: drag a → : a). A lone minus divides by −1; anything else takes the term away
    const u = unknownOf(S);
    if (L.depth === 0 && L.f.k === 'n' && top.f.length > 1) return { op: ':', value: T([N(L.f.v)], top.neg), bi };
    if (L.depth === 0 && top.f.length > 1 && tHasU(top, u) && !fHasU(L.f, u) && (L.f.k === 'v' || (L.f.k === 'p' && L.f.e === 1)))
      return { op: ':', value: T([cloneF(L.f)], top.neg), bi };
    if (top.neg && !top.f.some(f => f.k === 'n')) return { op: ':', value: T([N(1)], true), bi };
    return whole;
  }
  return null;
}

export function opDrag(S, id) {
  const d = dragBalance(S, id);
  if (!d) return null;
  if (d.no) return { no: d.no, ids: [id] };
  if (d.root || d.zero) {
    const r = d.root ? opRoot(S, d.bi) : opZero(S, d.bi);
    if (r && r.no) r.ids = [id];
    return r;
  }
  if ((d.op === '+' || d.op === '-') && d.value.f.some(f => f.k === 'p' || f.k === 'g')) return { no: 'dragBracket', ids: [id] };
  const r = opBalance(S, d.op, d.value, d.bi);
  if (r && r.no) r.ids = [id, ...(r.ids || [])];
  return r;
}

// solved: one side is the letter on its own, the other side a clean value without it
export function isSolved(S) {
  if (S.op !== '=' || S.parts.length < 2 || S.parts.length % 2) return false;
  if (S.parts.length > 2) return Array.from({ length: branchCount(S) }, (_, b) => isSolved(eqView(S, b))).every(Boolean);
  return S.parts.some((P, i) => {
    const t = P.num[0];
    if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1 || t.f[0].k !== 'v' || t.f[0].e !== 1 || t.f[0].b !== unknownOf(S)) return false;
    const other = S.parts[1 - i], b = t.f[0].b;
    let has = false; walkTerms([...other.num, ...other.den], { depth: 0 }, L => { if (L.kind === 'f' && L.f.k === 'v' && L.f.b === b) has = true; });
    return !has && isClean({ parts: [other], op: null, goal: 'simplify' });
  });
}
