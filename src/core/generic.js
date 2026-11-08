/* Generic equations: letters for numbers (ax + b = cx + d, ax² + bx + c = 0). */
import { isZeroSide, letters, loneSquare } from './balance.js';
import { hint } from './goals/index.js';
import { V } from './kinds/letter.js';
import { N } from './kinds/number.js';
import { T, cloneF, fHasU, tHasU } from './kinds/sums.js';
import { canMerge, hasU, isOne, locate, walkTerms } from './model.js';
import { opRoot, opZero, sideView } from './quadratic.js';
import { bx, fx, mx, sumHTML, termHTML } from '../render/text.js';

/* ---- generic equations: letters for numbers (ax + b = cx + d, ax² + bx + c = 0) ----
   Solved for the unknown with the same moves; the other letters are treated like numbers that could be anything. */
// a term of numbers and letters as { n, neg, vars }, or null
export function monoOf(t) {
  if (t.f.some(f => f.k !== 'n' && f.k !== 'v')) return null;
  const vars = {};
  t.f.forEach(f => { if (f.k === 'v') vars[f.b] = (vars[f.b] || 0) + f.e; });
  return { n: t.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1), neg: t.neg, vars };
}

export const monoTerm = m => { const vs = Object.keys(m.vars).sort().filter(b => m.vars[b]).map(b => V(b, m.vars[b])); return T(m.n !== 1 || !vs.length ? [N(m.n), ...vs] : vs, m.neg); };

export const monoKey = m => m.n + ':' + Object.keys(m.vars).sort().filter(b => m.vars[b]).map(b => b + m.vars[b]).join('');

export function monoSqrt(m) {
  const r = Math.round(Math.sqrt(m.n));
  if (m.neg || r * r !== m.n || Object.values(m.vars).some(e => e % 2)) return null;
  return { n: r, neg: false, vars: Object.fromEntries(Object.entries(m.vars).map(([b, e]) => [b, e / 2])) };
}

export const monoMul = (a, b) => { const vars = { ...a.vars }; for (const [l, e] of Object.entries(b.vars)) vars[l] = (vars[l] || 0) + e; return { n: a.n * b.n, neg: a.neg !== b.neg, vars }; };

export function monoDiv(a, b) {
  if (a.n % b.n) return null;
  const vars = { ...a.vars };
  for (const [l, e] of Object.entries(b.vars)) { if ((vars[l] || 0) < e) return null; vars[l] -= e; }
  return { n: a.n / b.n, neg: a.neg !== b.neg, vars };
}

// the power of the unknown in a term: 0, 1, 2 … or −1 when it sits inside a bracket or root
export function uDeg(t, u) {
  let d = 0;
  for (const f of t.f) { if (f.k === 'v' && f.b === u) d += f.e; else if (fHasU(f, u)) return -1; }
  return d;
}

export const coefOf = (t, u) => monoOf(T(t.f.filter(f => !(f.k === 'v' && f.b === u)), t.neg));

export function genHint(S, u) {
  const [L, R] = S.parts;
  const dry = fn => fn(JSON.parse(JSON.stringify(S)));
  const inL = hasU(L.num, u) || hasU(L.den, u), inR = hasU(R.num, u) || hasU(R.den, u);
  if (!inL && inR) return { k: 'hSwap', p: { b: bx(u) }, ids: ['op'] };
  const z = dry(c => opZero(c));
  if (z && z.ok) { const zid = S.parts.find(P => isZeroSide(P.num)).num[0].f[0].id; return { k: 'hZero', p: { x: z.p.x }, ids: [zid, 'op'], drag: zid }; }
  const t = L.num[0];
  if (L.num.length === 1 && isOne(L.den) && !inR) {
    const ps = t.f.filter(f => f.k === 'p');
    if (ps.length === 2 && canMerge(ps[0], ps[1])) return { k: 'hMerge', p: { x: mx(fx(ps[0])), y: mx(fx(ps[1])) }, ids: [ps[0].id, ps[1].id] };
    const r = dry(c => opRoot(c));
    if (r && (r.ok || r.no === 'rootNeg')) {
      const h = hint(sideView(R)); if (h.k !== 'hDone') return h;
      if (r.no) return { k: 'hNoReal', p: r.p, ids: [] };
      const pid = -loneSquare(L).id;
      return { k: 'hRoot', p: { s: r.p.s }, ids: [pid, 'op'], drag: pid };
    }
  }
  const take = (t, side, terms) => {
    const id = terms.length > 1 ? t.id : (t.f.find(f => fHasU(f, u)) || t.f[0]).id;
    return { k: 'hBalanceTerm', p: { x: mx(sumHTML([t])), op: t.neg ? '+' : '−', v: mx(termHTML(t)), side }, ids: [id, 'op'], drag: id, balance: { op: t.neg ? '+' : '-', value: T(t.f.map(cloneF)) } };
  };
  const deg = Math.max(...L.num.map(t => uDeg(t, u)));
  // a square on its way: put things outside brackets until it is one
  // ax² + bx = 0: x goes outside brackets, then the product is 0 (before tidying, which would undo x·x)
  if (!inR && deg === 2 && isZeroSide(R.num) && L.num.length > 1 && L.num.every(t => uDeg(t, u) > 0)) { const h = hint({ parts: [L], op: null, goal: 'factor' }); if (h.k !== 'hDone') return h; }
  // (a split square has one term without the unknown; q − q is just untidy)
  if (!inR && deg === 2 && L.num.length >= 4 && L.num.filter(t => uDeg(t, u) === 0).length <= 1) { const h = hint({ parts: [L], op: null, goal: 'factor' }); if (h.k !== 'hDone') return h; }
  if (!inR && L.num.length > 1 && L.num.some(t => t.f.some(f => f.k === 'p' && fHasU(f, u)))) { const h = hint({ parts: [L], op: null, goal: 'factor' }); if (h.k !== 'hDone') return h; }
  // tidy each side, but x(a − c) stays: that bracket is what x is multiplied by, and it comes next
  const keeps = h => {
    if (h.k !== 'hOpen') return false;
    const Lc = locate(S, h.ids[0]);
    return Lc && Lc.kind === 'f' && Lc.f.k === 'p' && !fHasU(Lc.f, u) && tHasU(Lc.term, u) && Lc.terms.length === 1 && !Lc.depth;
  };
  for (const P of S.parts) { const h = hint(sideView(P)); if (h.k !== 'hDone' && !keeps(h)) return h; }
  // the unknown below a bar: multiply both sides by the bottom
  for (const P of S.parts) if ((hasU(P.num, u) || hasU(P.den, u)) && !isOne(P.den)) {
    if (P.den.length !== 1) return { k: 'hDone', ids: [] };
    const d = P.den[0];
    return { k: 'hBalanceMul', p: { v: mx(termHTML(d)) }, ids: [d.f[0].id, 'op'], drag: d.f[0].id, balance: { op: '·', value: T(d.f.map(cloneF), d.neg) } };
  }
  const xR = R.num.find(t => tHasU(t, u));
  if (xR) return take(xR, 'right', R.num);
  if (L.num.some(t => uDeg(t, u) < 0)) return { k: 'hDone', ids: [] };
  const t2 = L.num.filter(t => uDeg(t, u) === 2), t1 = L.num.filter(t => uDeg(t, u) === 1), t0 = L.num.filter(t => uDeg(t, u) === 0);
  if (deg === 2) {
    if (t2.length !== 1 || t1.length > 1 || t0.length > 1) return { k: 'hDone', ids: [] };
    if (t1.length && isZeroSide(R.num) && !t0.length) { const h = hint({ parts: [L], op: null, goal: 'factor' }); return h.k !== 'hDone' ? h : { k: 'hDone', ids: [] }; }
    if (!t1.length) return t0.length ? take(t0[0], 'left', L.num) : { k: 'hDone', ids: [] };
    const A = coefOf(t2[0], u), B = coefOf(t1[0], u);
    if (!A || !B) return { k: 'hDone', ids: [] };
    const s = monoSqrt(A);
    if (t0.length) {
      // s²x² ± 2skx + k²: a complete square. Split the middle term in two halves, then factor in pairs
      const k = monoOf(t0[0]), kr = k && monoSqrt(k);
      if (s && kr && monoKey({ ...monoMul(monoMul({ n: 2, neg: false, vars: {} }, s), kr), neg: false }) === monoKey({ ...B, neg: false }) && B.n % 2 === 0) {
        const half = { ...B, n: B.n / 2 };
        return { k: 'hSplitSquare', p: { x: mx(termHTML(t1[0])), h: mx(termHTML(T([...monoTerm(half).f, V(u)], B.neg))), s: mx(`(${termHTML(monoTerm(s))}${bx(u)} ${B.neg ? '−' : '+'} ${termHTML(monoTerm(kr))})²`) }, ids: [t1[0].id], split: (B.neg ? -1 : 1) * B.n / 2 };
      }
      return take(t0[0], 'left', L.num);   // completing the square: the rest goes to the right
    }
    const two = { n: 2, neg: false, vars: {} };
    const k = s && monoDiv({ ...B, neg: false }, monoMul(two, s));
    if (k) {
      const sq = monoMul(k, k), kt = monoTerm(k);
      return { k: 'hCompleteG', p: { x: mx(sumHTML(L.num)), sq: mx(termHTML(monoTerm(sq))), br: mx(`(${termHTML(monoTerm(s))}${bx(u)} ${B.neg ? '−' : '+'} ${termHTML(kt)})²`) }, ids: ['op'], balance: { op: '+', value: monoTerm(sq) } };
    }
    const four = monoMul({ n: 4, neg: false, vars: {} }, A), ft = monoTerm(four);
    return { k: 'hMul4aG', p: { v: mx((four.neg ? '−' : '') + termHTML(T(ft.f))), u: bx(u) }, ids: ['op'], balance: { op: '·', value: ft } };
  }
  // linear: the rest to the right, the unknown outside brackets, then divide by what is left with it
  if (t0.length && !isZeroSide(t0)) return take(t0[0], 'left', L.num);
  if (L.num.length > 1) {
    const pick = t => t.f.find(f => f.k === 'v' && f.b === u);
    return { k: 'hFactorU', p: { x: bx(u), ex: mx(sumHTML(L.num)) }, ids: [pick(L.num[0]).id, pick(L.num[1]).id] };
  }
  const f = t.f.find(g => !fHasU(g, u));
  if (f) return { k: 'hBalanceDivG', p: { x: mx(sumHTML([t])), v: mx((t.neg ? '−' : '') + fx(f)) }, ids: [f.id, 'op'], drag: f.id, balance: { op: ':', value: T([cloneF(f)], t.neg) } };
  if (t.neg) { const x = t.f.find(g => fHasU(g, u)); return { k: 'hBalanceDiv', p: { x: mx(sumHTML([t])), v: '−1' }, ids: [x.id, 'op'], drag: x.id, balance: { op: ':', value: T([N(1)], true) } }; }
  return { k: 'hDone', ids: [] };
}

export function pairHint(S) {
  // first tidy each side with the usual moves
  for (const P of S.parts) { const h = hint(sideView(P)); if (h.k !== 'hDone') return h; }
  const [L, R] = S.parts, bs = letters(S);
  if (bs.length !== 1) return { k: 'hDone', ids: [] };
  const b = bs[0];
  const hasX = t => { let h = false; walkTerms([t], { depth: 0 }, M => { if (M.kind === 'f' && M.f.k === 'v' && M.f.b === b) h = true; }); return h; };
  const monoOf = t => T(t.f.map(cloneF));
  // the piece to drag: the term, or on a side of its own a non-number tile (dragging the 3 of 3x would divide)
  const take = (t, side, terms) => {
    const id = terms.length > 1 ? t.id : (t.f.find(f => f.k !== 'n') || t.f[0]).id;
    return { k: 'hBalanceTerm', p: { x: mx(sumHTML([t])), op: t.neg ? '+' : '−', v: mx(termHTML(t)), side }, ids: [id, 'op'], drag: id, balance: { op: t.neg ? '+' : '-', value: monoOf(t) } };
  };
  // a fraction: multiply both sides by what is below the bar
  for (const P of S.parts) if (!isOne(P.den)) {
    if (P.den.length !== 1 || P.den[0].f.some(f => f.k !== 'n')) return { k: 'hDone', ids: [] };
    const d = P.den[0];
    return { k: 'hBalanceMul', p: { v: mx(termHTML(d)) }, ids: [d.f[0].id, 'op'], drag: d.f[0].id, balance: { op: '·', value: T(d.f.map(cloneF), d.neg) } };
  }
  // letters to the left, numbers to the right
  if (!L.num.some(hasX) && R.num.some(hasX)) return { k: 'hSwap', p: { b: bx(b) }, ids: ['op'] };
  const xR = R.num.find(hasX);
  if (xR) return take(xR, 'right', R.num);
  const cL = L.num.find(t => !hasX(t));
  if (cL && !isZeroSide([cL])) return take(cL, 'left', L.num);
  // a·x = c: divide both sides by a
  if (L.num.length === 1) {
    const t = L.num[0], n = t.f.filter(f => f.k === 'n');
    const rest = t.f.filter(f => f.k !== 'n');
    if (rest.length === 1 && rest[0].k === 'v' && rest[0].e === 1 && (n.length || t.neg)) {
      const a = n.reduce((p, f) => p * f.v, 1);
      return { k: 'hBalanceDiv', p: { x: mx(sumHTML([t])), v: mx((t.neg ? '−' : '') + a) }, ids: [(n[0] || rest[0]).id, 'op'], drag: (n[0] || rest[0]).id, balance: { op: ':', value: T([N(a)], t.neg) } };
    }
  }
  return { k: 'hDone', ids: [] };
}
