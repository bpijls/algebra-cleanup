/* Quadratic equations: root of both sides, product = 0, and their hints. */
import { isSolved, isZeroSide, letters, loneSquare } from './balance.js';
import { genHint, pairHint } from './generic.js';
import { hint, quadSplit, sumProductHint } from './hints.js';
import { F, G, N, Pr, Rt, T, V, addCond, branchCount, canMerge, cleanTerm, cloneF, cloneT, eqView, fHasU, fkey, hasU, isOne, pairOf, params, unknownOf, walkTerms } from './model.js';
import { bx, fracHTML, fx, mx, orWord, sumHTML, termHTML } from './notation.js';

/* ---- quadratic equations: two moves that split an equation into branches ("or") ----
   Branch b is S.parts[2b] = S.parts[2b + 1]. Every other move works inside one branch. */
export const hasLetter = side => { let h = false; walkTerms(side, { depth: 0 }, L => { if (L.kind === 'f' && L.f.k === 'v') h = true; }); return h; };

// the value of a side without letters (null when it has letters)
export function constVal(P) {
  if (hasLetter(P.num) || hasLetter(P.den)) return null;
  return evalTerms(P.num, {}) / evalTerms(P.den, {});
}

export function evalF(f, env) {
  if (f.k === 'n') return f.v;
  if (f.k === 'v') return Math.pow(env[f.b] ?? 0, f.e);
  if (f.k === 'g') return Math.pow(f.f.reduce((p, g) => p * evalF(g, env), 1), f.e);
  if (f.k === 'r') return Math.sqrt(evalTerms(f.terms, env));
  return Math.pow(evalTerms(f.terms, env), f.e);
}

export const evalTerms = (ts, env) => ts.reduce((s, t) => s + (t.neg ? -1 : 1) * t.f.reduce((p, f) => p * evalF(f, env), 1), 0);

// L − R as a·x² + b·x + c, read off from its values at x = 0, 1, 2 (null when it isn't one)
// parameters get fixed values that are unlikely to cancel anything (a − c ≠ 0, b² − 4ac > 0)
export const PVAL = { a: 1.7, b: -2.3, c: 0.73, d: -1.9, p: 2.9, q: 0.57, r: 1.3, s: -0.6, k: 2.1, m: -1.2, n: 0.9 };

export function quadOf(S) {
  const b = unknownOf(S);
  if (!b) return null;
  const env = x => { const e = {}; letters(S).forEach(l => { e[l] = PVAL[l] ?? 1.1 + l.charCodeAt(0) % 5 * 0.37; }); e[b] = x; return e; };
  const f = x => S.parts[0] && evalTerms(S.parts[0].num, env(x)) / evalTerms(S.parts[0].den, env(x)) - evalTerms(S.parts[1].num, env(x)) / evalTerms(S.parts[1].den, env(x));
  const [f0, f1, f2, f3] = [0, 1, 2, 3].map(f);
  const a = (f2 - 2 * f1 + f0) / 2, bb = f1 - f0 - a, c = f0;
  if (![f0, f1, f2, f3].every(isFinite) || Math.abs(a * 9 + bb * 3 + c - f3) > 1e-6 * Math.max(1, Math.abs(f3))) return null;
  return { a, b: bb, c, x: b };
}

// "take the root of both sides": the square on one side, a number ≥ 0 on the other → two branches
export function opRoot(S, bi = 0) {
  if (S.op !== '=' || bi >= branchCount(S)) return null;
  const parts = pairOf(S, bi);
  const u = unknownOf(S);
  const qi = parts.findIndex(P => hasU(P.num, u) || hasU(P.den, u));
  if (qi < 0) return null;
  const Q = parts[qi], O = parts[1 - qi], t = Q.num[0];
  const sq = Q.num.length === 1 && isOne(Q.den) && t.f.find(f => f.e === 2 && f.k !== 'n');
  if (!sq) return { no: 'rootNoSquare', ids: ['op'] };
  if (t.f.length > 1 || t.neg) return { no: 'rootCoef', p: { x: mx(sumHTML([t])), s: mx(fx(sq)) }, ids: [t.id] };
  if (hasU(O.num, u) || hasU(O.den, u)) return { no: 'rootLetter', ids: [sq.id] };
  if (!isOne(O.den)) return { no: 'rootFrac', ids: [sq.id] };
  const v = constVal(O);   // null with letters in it: then it has to be ≥ 0, and the answer says so
  if (v != null && v < -1e-12) return { no: 'rootNeg', p: { s: mx(fx(sq)), v: mx(sumHTML(O.num)) }, ids: [sq.id] };
  const base = () => sq.k === 'v' ? V(sq.b, 1) : sq.k === 'g' ? G(sq.f.map(cloneF), 1) : Pr(sq.terms.map(cloneT), 1);
  const side = (neg) => F([T([Rt(O.num.map(cloneT))], neg)]);
  const branch = neg => { const pair = [F([T([base()])]), side(neg)]; return qi ? pair.reverse() : pair; };
  const add = v != null && Math.abs(v) < 1e-12 ? [...branch(false)] : [...branch(false), ...branch(true)];
  const before = mx(fracHTML(parts[0]) + ' = ' + fracHTML(parts[1]));
  const cond = v == null ? addCond(S, O.num, 'ge') : null;
  S.parts.splice(2 * bi, 2, ...add);
  const ex = Array.from({ length: add.length / 2 }, (_, k) => fracHTML(add[2 * k]) + ' = ' + fracHTML(add[2 * k + 1])).join(` ${orWord()} `);
  return { ok: cond ? 'rootBothIf' : add.length > 2 ? 'rootBoth' : 'rootZero', p: { x: before, ex: mx(ex), s: mx(fx(sq)), c: cond }, born: add.flatMap(P => P.num.flatMap(t => t.f.map(f => f.id))) };
}

// a product that is 0: one of its factors is 0 → a branch for each factor with a letter in it
export function opZero(S, bi = 0) {
  if (S.op !== '=' || bi >= branchCount(S)) return null;
  const parts = pairOf(S, bi);
  const zi = parts.findIndex(P => isZeroSide(P.num) && isOne(P.den));
  if (zi < 0) return null;
  const Q = parts[1 - zi], t = Q.num[0];
  if (Q.num.length !== 1 || !isOne(Q.den)) return { no: 'zeroSum', ids: ['op'] };
  const u = unknownOf(S), fs = t.f.filter(f => fHasU(f, u));
  const seen = new Set(), bases = [];
  for (const f of fs) {
    const b = f.k === 'v' ? V(f.b, 1) : f.k === 'g' ? G(f.f.map(cloneF), 1) : Pr(f.terms.map(cloneT), 1);
    const k = fkey(b); if (!seen.has(k)) { seen.add(k); bases.push(b); }
  }
  if (bases.length < 2 && !fs.some(f => f.e > 1)) return { no: 'zeroOne', ids: ['op'] };
  const add = bases.flatMap(b => { const pair = [F([T([b])]), F([T([N(0)])])]; return zi === 0 ? pair.reverse() : pair; });
  const before = mx(sumHTML([t]) + ' = 0');
  S.parts.splice(2 * bi, 2, ...add);
  const ex = bases.map(b => (b.k === 'p' ? sumHTML(b.terms) : fx(b)) + ' = 0').join(` ${orWord()} `);
  return { ok: 'zeroProduct', p: { x: before, ex: mx(ex) }, born: add.flatMap(P => P.num.flatMap(t => t.f.map(f => f.id))) };
}

export const sideView = P => ({ parts: [P], op: null, goal: 'simplify' });

// several branches: work on the first one that isn't solved yet (bi tells the move which branch)
export function eqHint(S) {
  if (isSolved(S)) return { k: 'hDone', ids: [] };
  for (let b = 0; b < branchCount(S); b++) {
    const E = eqView(S, b);
    if (isSolved(E)) continue;
    const q = quadOf(E);
    const h = params(E).length ? genHint(E, unknownOf(E)) : q && Math.abs(q.a) > 1e-9 ? quadHint(E, q) : pairHint(E);
    return { ...h, bi: b };
  }
  return { k: 'hDone', ids: [] };
}

export const isSquareTerm = t => t.f.some(f => f.e === 2 && f.k !== 'n');

// ax² + bx + c = d. In order: the shapes that split into branches (a product = 0, a square = a number),
// a factoring under way, tidy up, then choose: sum-product when the numbers allow it, otherwise complete the square
// (with a·x² not a square, or b not even: first multiply both sides by 4a, the way to the abc-formula)
export function quadHint(S, q) {
  const [L, R] = S.parts;
  if (!hasLetter(L.num) && !hasLetter(L.den)) return { k: 'hSwap', p: { b: bx(q.x) }, ids: ['op'] };
  const dry = fn => { const c = JSON.parse(JSON.stringify(S)); return fn(c); };
  const z = dry(c => opZero(c));
  if (z && z.ok) {
    const zid = S.parts.find(P => isZeroSide(P.num)).num[0].f[0].id;
    return { k: 'hZero', p: { x: z.p.x }, ids: [zid, 'op'], drag: zid };
  }
  if (!hasLetter(R.num)) {
    const t = L.num[0];
    // a square that is still written as a product of two equal brackets
    if (L.num.length === 1 && isOne(L.den)) {
      const ps = t.f.filter(f => f.k === 'p');
      if (ps.length === 2 && canMerge(ps[0], ps[1])) return { k: 'hMerge', p: { x: mx(fx(ps[0])), y: mx(fx(ps[1])) }, ids: [ps[0].id, ps[1].id] };
    }
    const r = dry(c => opRoot(c));
    if (r && (r.ok || r.no === 'rootNeg')) {
      const h = hint(sideView(R)); if (h.k !== 'hDone') return h;
      if (r.no) return { k: 'hNoReal', p: r.p, ids: [] };
      const pid = -loneSquare(S.parts.find(P => loneSquare(P) && (hasLetter(P.num)))).id;
      return { k: 'hRoot', p: { s: r.p.s }, ids: [pid, 'op'], drag: pid };
    }
    if (r && r.no === 'rootCoef') {   // 2x² = 18: the square on its own first
      const n = t.f.filter(f => f.k === 'n'), a = n.reduce((p, f) => p * f.v, 1);
      return { k: 'hBalanceDiv', p: { x: mx(sumHTML([t])), v: mx((t.neg ? '−' : '') + a) }, ids: [(n[0] || t.f[0]).id, 'op'], drag: (n[0] || t.f[0]).id, balance: { op: ':', value: T([N(a)], t.neg) } };
    }
  }
  const disc = q.b * q.b - 4 * q.a * q.c;
  // factoring under way: to reach a product = 0, or the square of a complete square
  const lq = quadOf({ parts: [L, F([T([N(0)])])], op: '=' });
  const lSquare = lq && Math.abs(lq.b * lq.b - 4 * lq.a * lq.c) < 1e-6 && Math.abs(lq.c) > 1e-9;
  const underWay = L.num.length >= 4 || L.num.some(t => t.f.some(f => f.k === 'p' && hasLetter(f.terms)));
  const noC = lq && Math.abs(lq.c) < 1e-9 && isZeroSide(R.num);   // a·x² + b·x = 0: x goes outside brackets
  if (!hasLetter(R.num) && (isZeroSide(R.num) || lSquare) && L.num.length > 1 && (underWay || noC)) {
    const h = hint({ parts: [L], op: null, goal: 'factor' });
    if (h.k !== 'hDone') return h;
  }
  for (const P of S.parts) { const h = hint(sideView(P)); if (h.k !== 'hDone') return h; }
  const b = q.x;
  const hasX = t => { let h = false; walkTerms([t], { depth: 0 }, M => { if (M.kind === 'f' && M.f.k === 'v' && M.f.b === b) h = true; }); return h; };
  const take = (t, side, terms) => {
    const id = terms.length > 1 ? t.id : (t.f.find(f => f.k !== 'n') || t.f[0]).id;
    return { k: 'hBalanceTerm', p: { x: mx(sumHTML([t])), op: t.neg ? '+' : '−', v: mx(termHTML(t)), side }, ids: [id, 'op'], drag: id, balance: { op: t.neg ? '+' : '-', value: T(t.f.map(cloneF)) } };
  };
  const xR = R.num.find(hasX);
  if (xR) return take(xR, 'right', R.num);
  const A = Math.round(lq.a), B = Math.round(lq.b), C = Math.round(lq.c), D = constVal(R);
  const cL = L.num.find(t => !hasX(t));
  if (!B) return cL ? take(cL, 'left', L.num) : { k: 'hDone', ids: [] };
  // a complete square on the left: write it as a square
  if (lSquare && L.num.length === 3) { const h = sumProductHint({ parts: [L] }); if (h) return h; }
  if (C === D) {   // a·x² + b·x = 0: everything to the left, then x goes outside brackets
    if (!isZeroSide(R.num)) return take(R.num[0], 'right', R.num);
    const h = hint({ parts: [L], op: null, goal: 'factor' }); if (h.k !== 'hDone') return h;
  }
  const split = Number.isInteger(D) && quadSplit([T([N(Math.abs(A)), V(b, 2)], A < 0), T([N(Math.abs(B)), V(b)], B < 0), T([N(Math.abs(C - D) || 1)], C - D < 0)].map(cleanTerm));
  if (split && Math.abs(disc) > 1e-9) {
    if (!isZeroSide(R.num)) return take(R.num[0], 'right', R.num);   // everything to the left: … = 0
    const h = sumProductHint({ parts: [L] }); if (h) return h;
  }
  if (disc < -1e-9) return { k: 'hNoRealD', ids: [] };
  if (cL) return take(cL, 'left', L.num);   // completing the square: the number goes to the right
  const s = Math.round(Math.sqrt(A));
  if (A > 0 && s * s === A && B % (2 * s) === 0) {
    const k = B / (2 * s);
    return { k: 'hComplete', p: { x: mx(sumHTML(L.num)), half: mx(termHTML(T([N(Math.abs(k))]))), sq: k * k, br: mx(`(${s > 1 ? s : ''}${b} ${k < 0 ? '−' : '+'} ${Math.abs(k)})²`) }, ids: ['op'], balance: { op: '+', value: T([N(k * k)]) } };
  }
  return { k: 'hMul4a', p: { a: A, v: 4 * A }, ids: ['op'], balance: { op: '·', value: T([N(Math.abs(4 * A))], A < 0) } };
}
