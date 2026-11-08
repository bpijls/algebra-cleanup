// The outside judge: arithmetic. For an equation, also its real solutions: after every move the
// branches (L1 = R1 or L2 = R2 …) together must have exactly the solutions the equation had. A state's value at a few random letter values; every move must keep it.
// For an equation L = R the value is L − R, and a move may scale it by a nonzero constant (+5 on both
// sides: ×1, divide both sides by 3: ×1/3, swap sides: ×−1), never by something that depends on the letters.
const assert = require('node:assert/strict');
const { load } = require('./load');
const G = load();
const VALS = [{ a: 1.7, b: -2.3, x: 0.61, y: 3.1 }, { a: -0.9, b: 1.3, x: 2.2, y: -1.4 }, { a: 2.9, b: 0.47, x: -1.6, y: 0.8 },
  { a: 0.8, b: 2.6, c: 1.9, x: 1.9, y: 0.35 }, { a: 3.3, b: 1.1, c: 0.6, x: 0.45, y: 2.4 }];
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
const values = (S, conds = S.conds) => VALS.map(env => holds(conds, env) ? value(S, env) : null);

// an equation with parameters (ax + b = cx + d) is judged at fixed parameter values, the ones the game uses
// too (a − c ≠ 0, b² − 4ac > 0 …); only the unknown varies
const envOf = (S, x) => { const e = {}; G.letters(S).forEach(l => { e[l] = G.PVAL[l] ?? 1.1 + l.charCodeAt(0) % 5 * 0.37; }); e[G.unknownOf(S) || 'x'] = x; return e; };
// the real solutions of an equation (degree ≤ 2 per branch in the unknown): 'all', or a sorted list.
// A branch under the root of a negative number (√q with q < 0 here) has none.
function solutions(S) {
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
    assert.ok(Math.abs(9 * a + 3 * bb + c - f3) < tol && Math.abs(16 * a + 4 * bb + c - f4) < tol, `branch is not of degree ≤ 2: ${G.stateHTML(S)}`);
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
const eqValues = (S, ref) => XS.map(x => { const [L, R] = S.parts; return evP(L, envOf(ref, x)) - evP(R, envOf(ref, x)); });
function equivalent(u, v) {
  if (u.every(Number.isNaN) && v.every(Number.isNaN)) return true;   // both under the root of a negative number
  const r = u.map((x, i) => v[i] / x);
  return r.every(k => isFinite(k) && Math.abs(k) > 1e-9 && Math.abs(k - r[0]) <= 1e-7 * Math.max(1, Math.abs(r[0])));
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
      const branching = S.op === '=' && (trial.parts.length !== old.parts.length || ['rootBoth', 'rootZero', 'zeroProduct'].includes(r.ok));
      const pair = (X, b) => ({ parts: X.parts.slice(2 * b, 2 * b + 2), op: '=' });
      // an identity to show (goal prove): each side keeps its own value; L − R is 0 everywhere, so a ratio says nothing
      const sides = X => X.parts.map(P => VALS.map(env => holds(trial.conds, env) ? evP(P, env) : null));
      const kept = S.goal === 'prove' ? sides(old).every((u, i) => same(u, sides(trial)[i]))
        : branching ? sameSolutions(solutions(old), solutions(trial))
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
