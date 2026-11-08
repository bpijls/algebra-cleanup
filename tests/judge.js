// The outside judge: arithmetic. For an equation, also its real solutions: after every move the
// branches (L1 = R1 or L2 = R2 …) together must have exactly the solutions the equation had. A state's value at a few random letter values; every move must keep it.
// For an equation L = R the value is L − R, and a move may scale it by a nonzero constant (+5 on both
// sides: ×1, divide both sides by 3: ×1/3, swap sides: ×−1), never by something that depends on the letters.
const assert = require('node:assert/strict');
const { load } = require('./load');
const G = load();
// any other letter (p, q, t …) is 1.37 there, inside every kind; the second set has every letter negative, for
// when the conditions a move wrote down (−18p > 0 under a log) exclude every point of the first
const withDefault = (o, d) => new Proxy(o, { get: (t, k) => k in t ? t[k] : typeof k === 'string' && /^[a-z]$/.test(k) ? d : undefined });
const BASE = [{ a: 1.7, b: -2.3, x: 0.61, y: 3.1 }, { a: -0.9, b: 1.3, x: 2.2, y: -1.4 }, { a: 2.9, b: 0.47, x: -1.6, y: 0.8 },
  { a: 0.8, b: 2.6, c: 1.9, x: 1.9, y: 0.35 }, { a: 3.3, b: 1.1, c: 0.6, x: 0.45, y: 2.4 }];
const VALS = BASE.map(o => withDefault(o, 1.37));
const NEG = BASE.map(o => withDefault(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, -Math.abs(v) * 1.13])), -1.37));
// the judge's own arithmetic for the kinds it knows; a kind added later is evaluated by its registry entry
function evF(f, env) {
  if (!'nvgrp'.includes(f.k)) return G.evalF(f, env);
  if (f.k === 'n') return f.v;
  if (f.k === 'v') return Math.pow(env[f.b] ?? 1.37, f.e);
  if (f.k === 'g') return Math.pow(f.f.reduce((p, g) => p * evF(g, env), 1), f.e);
  if (f.k === 'r') return Math.sqrt(evTerms(f.terms, env));
  return Math.pow(evTerms(f.terms, env), f.e);
}
const evT = (t, env) => (t.neg ? -1 : 1) * t.f.reduce((p, f) => p * evF(f, env), 1);
const evTerms = (ts, env) => ts.reduce((s, t) => s + evT(t, env), 0);
const evP = (P, env) => evTerms(P.num, env) / evTerms(P.den, env);
// complex numbers (S.complex): values are [re, im]. The real judge can't see i · i = −1 or √(−4) = 2i.
const C = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  div: (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
  abs: a => Math.hypot(a[0], a[1]),
  sqrt: a => { const r = Math.hypot(a[0], a[1]), re = Math.sqrt((r + a[0]) / 2), im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, a[1] < 0 ? -im : im]; },
  pow(a, e) {
    if (Number.isInteger(e)) { let r = [1, 0]; for (let k = 0; k < Math.abs(e); k++) r = C.mul(r, a); return e < 0 ? C.div([1, 0], r) : r; }
    const m = Math.pow(C.abs(a), e), t = Math.atan2(a[1], a[0]) * e; return [m * Math.cos(t), m * Math.sin(t)];
  },
};
function evFC(f, env) {
  if (f.k === 'n') return [f.v, 0];
  if (f.k === 'v') return [Math.pow(env[f.b] ?? 1.37, f.e), 0];
  if (f.k === 'im') return C.pow([0, 1], f.e);
  if (f.k === 'g') return C.pow(f.f.reduce((p, g) => C.mul(p, evFC(g, env)), [1, 0]), f.e);
  if (f.k === 'p') return C.pow(evTermsC(f.terms, env), f.e);
  if (f.k === 'r') return C.sqrt(evTermsC(f.terms, env));
  if (f.k === 'q') return C.div(evTermsC(f.num, env), evTermsC(f.den, env));
  return [G.evalF(f, env), 0];
}
const evTC = (t, env) => { const v = t.f.reduce((p, f) => C.mul(p, evFC(f, env)), [1, 0]); return t.neg ? [-v[0], -v[1]] : v; };
const evTermsC = (ts, env) => ts.reduce((s, t) => C.add(s, evTC(t, env)), [0, 0]);
const evPC = (P, env) => C.div(evTermsC(P.num, env), evTermsC(P.den, env));
function valueC(S, env) {
  const [a, b] = S.parts.map(P => evPC(P, env));
  if (S.parts.length === 1) return a;
  return S.op === '=' ? C.sub(a, b) : S.op === '·' ? C.mul(a, b) : C.div(a, b);
}
function value(S, env) {
  const [a, b] = S.parts.map(P => evP(P, env));
  if (S.parts.length === 1) return a;
  if (S.op === '=') return a - b;
  if (S.op === '·') return a * b;
  return a / b;   // '/', ':'
}
// the value at each sample point; null where a condition a move wrote down doesn't hold (a > 0 under a log):
// a move may take its own written conditions for granted. Pass the conditions of the later state to compare.
const holds = (conds, env) => (conds || []).every(c => { const v = evTerms(c.terms, env); return c.rel === 'gt' ? v > 0 : c.rel === 'ge' ? v >= 0 : v !== 0; });
const values = (S, conds = S.conds) => { const set = VALS.some(env => holds(conds, env)) ? VALS : NEG; return S.complex ? set.flatMap(env => holds(conds, env) ? valueC(S, env) : [null, null]) : set.map(env => holds(conds, env) ? value(S, env) : null); };

// an equation with parameters (ax + b = cx + d) is judged at fixed parameter values, the ones the game uses
// too (a − c ≠ 0, b² − 4ac > 0 …); only the unknown varies
const envOf = (S, x) => { const e = {}; G.letters(S).forEach(l => { e[l] = G.PVAL[l] ?? 1.1 + l.charCodeAt(0) % 5 * 0.37; }); e[G.unknownOf(S) || 'x'] = x; return e; };
// the real solutions of an equation (degree ≤ 2 per branch in the unknown): 'all', or a sorted list.
// A branch under the root of a negative number (√q with q < 0 here) has none.
function numericRoots(f) {
  const roots = [];
  for (let k = -3000; k < 3000; k++) {
    let lo = k / 100, hi = (k + 1) / 100, fl = f(lo), fh = f(hi);
    if (!Number.isFinite(fl) || !Number.isFinite(fh)) continue;
    if (fl === 0) { roots.push(lo); continue; }
    if (fl * fh > 0) continue;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, fm = f(m); if (fl * fm <= 0) hi = m; else { lo = m; fl = fm; } }
    roots.push((lo + hi) / 2);
  }
  return roots;
}
// the complex solutions of each branch (degree ≤ 2, complex coefficients): sorted, as [re, im, re, im …]
function solutionsC(S) {
  const out = [];
  for (let b = 0; b < S.parts.length / 2; b++) {
    const [L, R] = S.parts.slice(2 * b, 2 * b + 2);
    const f = x => C.sub(evPC(L, envOf(S, x)), evPC(R, envOf(S, x)));
    const [f0, f1, f2, f3, f4] = [0, 1, 2, 3, 4].map(f);
    const a = C.mul(C.add(C.sub(f2, C.mul([2, 0], f1)), f0), [0.5, 0]), bb = C.sub(C.sub(f1, f0), a), c = f0;
    const at = x => C.add(C.add(C.mul(a, [x * x, 0]), C.mul(bb, [x, 0])), c), tol = 1e-7 * Math.max(1, C.abs(f3), C.abs(f4));
    assert.ok(C.abs(C.sub(at(3), f3)) < tol && C.abs(C.sub(at(4), f4)) < tol, `branch is not of degree ≤ 2: ${G.stateHTML(S)}`);
    const small = v => C.abs(v) < 1e-9 * Math.max(1, C.abs(f0), C.abs(f1), C.abs(f2));
    if (small(a) && small(bb)) { if (small(c)) return 'all'; continue; }
    if (small(a)) { out.push(C.div([-c[0], -c[1]], bb)); continue; }
    const d = C.sqrt(C.sub(C.mul(bb, bb), C.mul([4, 0], C.mul(a, c)))), a2 = C.mul([2, 0], a), nb = [-bb[0], -bb[1]];
    out.push(C.div(C.add(nb, d), a2), C.div(C.sub(nb, d), a2));
  }
  const key = z => z.map(v => +v.toPrecision(9) || 0);
  const uniq = [...new Map(out.map(z => [key(z).join(','), key(z)])).values()];
  return uniq.sort((p, q) => p[0] - q[0] || p[1] - q[1]).flat();
}
function solutions(S) {
  if (S.complex) return solutionsC(S);
  const out = [];
  for (let b = 0; b < S.parts.length / 2; b++) {
    const [L, R] = S.parts.slice(2 * b, 2 * b + 2);
    // with the unknown below a bar (4/x = 2), L − R times every bottom is a polynomial again; its roots where a
    // bottom is 0 are no solutions
    const dens = []; G.walk({ parts: [L, R] }, M => { if (M.kind === 'f' && M.f.k === 'q') dens.push(M.f.den); });
    dens.push(L.den, R.den);
    const below = x => dens.reduce((p, d) => p * evTerms(d, envOf(S, x)), 1);
    const f = x => (evP(L, envOf(S, x)) - evP(R, envOf(S, x))) * below(x);
    // sampled at 0 … 4; a bottom that is 0 at one of them (4/x at 0) moves the samples half a step
    const nan = h => [0, 1, 2, 3, 4].map(k => f(k + h)).some(Number.isNaN);
    const h = nan(0) && !nan(0.5) && dens.some(d => d.some(t => t.f.some(g => g.k === 'v'))) ? 0.5 : 0;
    const [f0, f1, f2, f3, f4] = [0, 1, 2, 3, 4].map(k => f(k + h));
    if ([f0, f1, f2, f3, f4].some(Number.isNaN)) continue;
    const a = (f2 - 2 * f1 + f0) / 2, bb = f1 - f0 - a, c = f0;
    const tol = 1e-7 * Math.max(1, Math.abs(f3), Math.abs(f4));
    // not a polynomial of degree ≤ 2 (2ˣ = 5, log of the unknown): its roots by sign changes on −30 … 30, refined by bisection
    if (!(Math.abs(9 * a + 3 * bb + c - f3) < tol && Math.abs(16 * a + 4 * bb + c - f4) < tol)) { out.push(...numericRoots(f)); continue; }
    const small = v => Math.abs(v) < 1e-9 * Math.max(1, Math.abs(f0), Math.abs(f1), Math.abs(f2));
    if (small(a) && small(bb)) { if (small(c)) return 'all'; continue; }
    const roots = [];
    if (small(a)) roots.push(-c / bb);
    else {
      const d = bb * bb - 4 * a * c, scale = bb * bb + Math.abs(4 * a * c);
      if (Math.abs(d) < 1e-9 * scale) roots.push(-bb / (2 * a));
      else if (d > 0) roots.push((-bb + Math.sqrt(d)) / (2 * a), (-bb - Math.sqrt(d)) / (2 * a));
    }
    out.push(...roots.map(t => t + h).filter(x => Math.abs(below(x)) > 1e-9));
  }
  return [...new Set(out.map(v => +v.toPrecision(10)))].sort((p, q) => p - q);
}
// the unknown below a bar somewhere (4/x = 2, x/(x + 1) …): L − R is not a polynomial
const belowBar = S => { const u = G.unknownOf(S); let b = false; G.walk(S, L => { if (L.kind === 'f' && L.f.k === 'v' && L.f.b === u && (L.qs === 'den' || L.side === 'den')) b = true; }); return b; };
// each answer makes the two sides of the equation equal
const satisfies = (S, xs) => xs !== 'all' && xs.length > 0 && xs.every(x => { const [L, R] = S.parts, l = evP(L, envOf(S, x)), r = evP(R, envOf(S, x)); return Math.abs(l - r) <= 1e-7 * Math.max(1, Math.abs(l)); });
const sameSolutions = (u, v) => u === 'all' || v === 'all' ? u === v
  : u.length === v.length && u.every((x, i) => Math.abs(x - v[i]) <= 1e-6 * Math.max(1, Math.abs(x)));
// an equation keeps its solutions when L − R changes by the same nonzero constant for every value of the unknown
const XS = [0.61, 2.2, -1.6, 3.3];
// (each value carries the size of its sides, .mag: 2ˣ/4096² − 4096 = … − 4096 loses digits to rounding, not to the move)
const eqValues = (S, ref) => { let mag = 0; const out = XS.map(x => { const [L, R] = S.parts, l = evP(L, envOf(ref, x)), r = evP(R, envOf(ref, x)); mag = Math.max(mag, Math.abs(l) + Math.abs(r)); return l - r; }); out.mag = mag; return out; };
function equivalent(u, v) {
  if (u.every(Number.isNaN) && v.every(Number.isNaN)) return true;   // both under the root of a negative number
  const r = u.map((x, i) => v[i] / x);
  if (!r.every(k => isFinite(k) && Math.abs(k) > 1e-9)) return false;
  const j = u.reduce((m, x, i) => Math.abs(x) > Math.abs(u[m]) ? i : m, 0), k = r[j];
  const noise = 1e-12 * ((v.mag || 0) + Math.abs(k) * (u.mag || 0));
  return u.every((x, i) => Math.abs(v[i] - k * x) <= 1e-7 * Math.max(Math.abs(v[i]), Math.abs(k * x), 1e-300) + noise);
}
// the same for complex values: L − R changes by one nonzero complex constant
const eqValuesC = (S, ref) => { let mag = 0; const out = XS.map(x => { const [L, R] = S.parts, l = evPC(L, envOf(ref, x)), r = evPC(R, envOf(ref, x)); mag = Math.max(mag, C.abs(l) + C.abs(r)); return C.sub(l, r); }); out.mag = mag; return out; };
function equivalentC(u, v) {
  const j = u.reduce((m, x, i) => C.abs(x) > C.abs(u[m]) ? i : m, 0), k = C.div(v[j], u[j]);
  if (!(isFinite(k[0]) && isFinite(k[1]) && C.abs(k) > 1e-9)) return false;
  const noise = 1e-12 * ((v.mag || 0) + C.abs(k) * (u.mag || 0));
  return u.every((x, i) => C.abs(C.sub(v[i], C.mul(k, x))) <= 1e-7 * Math.max(C.abs(v[i]), C.abs(C.mul(k, x))) + noise);
}
// times the unknown (4/x = 2 · x, allowed because x is below a bar and so not 0): L − R is multiplied by exactly that
const scaled = (u, t, ref) => u.map((v, i) => v * evT(t, envOf(ref, XS[i])));
// where the state before is undefined because of a root of a negative number (√a · √a, a^½ at a < 0), a move may take
// the root's own condition for granted: √a · √a = a holds wherever √a means something
const same = (u, v) => u.some((x, i) => x !== null && v[i] !== null)
  && u.every((x, i) => x === null || v[i] === null || Number.isNaN(x) || (!isFinite(x) && !isFinite(v[i])) || Math.abs(x - v[i]) <= 1e-7 * Math.max(1, Math.abs(x)));

// every move a player can make from S: each registered move (G.MOVES) with every argument its gesture allows,
// plus, for equations, balance values that must work and ones that must be refused
function argsOf(S, gesture) {
  const fs = [], ts = [];
  G.walk(S, L => (L.kind === 'f' ? fs : ts).push(L.kind === 'f' ? L.f.id : L.term.id));
  const pairs = ids => ids.flatMap(a => ids.filter(b => b !== a).map(b => [a, b]));
  const eq = S.op === '=', branches = Array.from({ length: eq ? S.parts.length / 2 : 0 }, (_, b) => b);
  switch (gesture) {
    case 'piece': return fs.map(id => [id]);
    case 'pieces': return pairs(fs);
    case 'terms': return pairs(ts);
    case 'split': return ts.flatMap(id => [-3, 1, 2].map(k => [id, k]));
    case 'sweep': return pairs(fs).map(ab => [ab]);
    case 'board': return [[]];
    case 'expand': return fs.flatMap(id => [G.T([G.N(2)]), G.T([G.N(3)]), G.T([G.V('a')]), G.T([G.N(0)]), G.T([G.N(1)])].map(v => [id, v]));   // 0 and 1: refused
    case 'drag': return eq ? [...fs, ...ts, ...fs.map(id => -id)].map(id => [id]) : [];   // a piece, or the ² of a lone square
    case 'branch': return branches.map(b => [b]);
    case 'balance': {
      if (!eq) return [];
      const out = [], mono = t => G.T(t.f.map(G.cloneF), t.neg);
      S.parts.forEach(P => P.num.forEach(t => {   // with every term and every number
        out.push(['-', mono(t)], ['+', mono(t)]);
        t.f.filter(f => f.k === 'n').forEach(f => out.push([':', G.T([G.N(f.v)])], ['·', G.T([G.N(f.v)], true)]));
      }));
      branches.forEach(b => out.push(['+', G.T([G.N(9)]), b], ['·', G.T([G.N(4)]), b]));
      out.push(['·', G.T([G.V('x')])], [':', G.T([G.N(0)])], ['·', G.T([G.N(1)])]);   // refused: by the unknown, by 0, by 1
      // by the parameters: · a, : a, + b², · 4a, and a letter that isn't in the equation (refused)
      G.params(S).forEach(l => out.push(['·', G.T([G.V(l)])], [':', G.T([G.V(l)], true)], ['+', G.T([G.V(l, 2)])], ['·', G.T([G.N(4), G.V(l)])]));
      out.push([':', G.T([G.V('z')])]);
      return out;
    }
  }
  throw new Error(`the judge doesn't know the gesture ${gesture}`);
}
function candidates(S) {
  return G.MOVES.flatMap(m => argsOf(S, m.gesture).map(args => s => m.run(s, ...args)));
}

// an inequality keeps its solution set: at many values of the unknown, it holds before exactly when it holds after
const XT = [-7.3, -3.7, -1.6, -0.3, 0.61, 1.45, 2.2, 3.3, 4.9, 7.3, 11.9];
const REL = { '<': (a, b) => a < b, '>': (a, b) => a > b, '≤': (a, b) => a <= b, '≥': (a, b) => a >= b };
const truths = (S, ref) => XT.map(x => { const [L, R] = S.parts, l = evP(L, envOf(ref, x)), r = evP(R, envOf(ref, x)); return Number.isNaN(l - r) ? null : REL[S.rel](l, r); });
const sameTruth = (S, T) => { const u = truths(S, S), v = truths(T, S); return u.every((x, i) => x === null || v[i] === null || x === v[i]); };

function fuzz(start, steps, label) {
  let S = JSON.parse(JSON.stringify(start));
  for (let k = 0; k < steps; k++) {
    const snap = JSON.stringify(S);
    const moves = candidates(S).sort(() => Math.random() - 0.5);
    let moved = false;
    for (const m of moves) {
      const trial = JSON.parse(snap);
      let r;
      try { r = m(trial); } catch (e) { assert.fail(`${label}: a move threw ${e.message}\n${(e.stack || "").split("\n").slice(1, 4).join("\n")}\n${snap}`); }
      if (!r) continue;
      const key = r.ok || r.no;
      assert.ok(G.I18N.en[key] && G.I18N.nl[key], `${label}: message ${key} has no text`);
      if (r.no) { assert.equal(JSON.stringify(trial), snap, `${label}: refused move ${r.no} changed the state`); continue; }
      G.normalize(trial);
      // an equation: a move inside a branch keeps that branch's L − R up to a constant; a move that makes
      // branches (root of both sides, product = 0) keeps the solutions of all branches together
      const old = JSON.parse(snap);
      const branching = S.op === '=' && (trial.parts.length !== old.parts.length || ['rootBoth', 'rootZero', 'zeroProduct', 'expBaseEq', 'logBoth'].includes(r.ok));
      const pair = (X, b) => ({ parts: X.parts.slice(2 * b, 2 * b + 2), op: '=' });
      // an identity to show (goal prove): each side keeps its own value; L − R is 0 everywhere, so a ratio says nothing
      const sides = X => X.parts.map(P => VALS.map(env => holds(trial.conds, env) ? evP(P, env) : null));
      const kept = S.goal === 'prove' ? sides(old).every((u, i) => same(u, sides(trial)[i]))
        : branching ? sameSolutions(solutions(old), solutions(trial))
        : S.op === '=' && S.complex ? old.parts.every((_, i) => i % 2 || equivalentC(eqValuesC(pair(old, i / 2), old), eqValuesC(pair(trial, i / 2), old)))
        : S.op === '=' ? old.parts.every((_, i) => i % 2 || equivalent(eqValues(pair(old, i / 2), old), eqValues(pair(trial, i / 2), old))
          || (r.scale && equivalent(scaled(eqValues(pair(old, i / 2), old), r.scale, old), eqValues(pair(trial, i / 2), old))))
        : same(values(old, trial.conds), values(trial));
      if (old.rel) assert.ok(sameTruth(old, trial), `${label}: move ${r.ok} changed where the inequality holds\nbefore ${G.stateHTML(old)}\nafter  ${G.stateHTML(trial)}`);
      assert.ok(kept, `${label}: move ${r.ok} changed the ${S.op === '=' ? 'solutions' : 'value'}\nbefore ${G.stateHTML(JSON.parse(snap))}\nafter  ${G.stateHTML(trial)}`);
      S = trial; moved = true; break;
    }
    if (!moved || G.isClean(S)) break;
  }
}

const hasText = k => !!(G.I18N.en[k] && G.I18N.nl[k]);
module.exports = { hasText, G, values, same, equivalent, fuzz, solutions, sameSolutions, belowBar, satisfies, sameTruth };
