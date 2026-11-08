// The outside judge: arithmetic. For an equation, also its real solutions: after every move the
// branches (L1 = R1 or L2 = R2 …) together must have exactly the solutions the equation had. A state's value at a few random letter values; every move must keep it.
// For an equation L = R the value is L − R, and a move may scale it by a nonzero constant (+5 on both
// sides: ×1, divide both sides by 3: ×1/3, swap sides: ×−1), never by something that depends on the letters.
const assert = require('node:assert/strict');
const { load } = require('./load');
const G = load();
const VALS = [{ a: 1.7, b: -2.3, x: 0.61, y: 3.1 }, { a: -0.9, b: 1.3, x: 2.2, y: -1.4 }, { a: 2.9, b: 0.47, x: -1.6, y: 0.8 }];
function evF(f, env) {
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
const values = S => VALS.map(env => value(S, env));

// an equation with parameters (ax + b = cx + d) is judged at fixed parameter values, the ones the game uses
// too (a − c ≠ 0, b² − 4ac > 0 …); only the unknown varies
const envOf = (S, x) => { const e = {}; G.letters(S).forEach(l => { e[l] = G.PVAL[l] ?? 1.1 + l.charCodeAt(0) % 5 * 0.37; }); e[G.unknownOf(S) || 'x'] = x; return e; };
// the real solutions of an equation (degree ≤ 2 per branch in the unknown): 'all', or a sorted list.
// A branch under the root of a negative number (√q with q < 0 here) has none.
function solutions(S) {
  const out = [];
  for (let b = 0; b < S.parts.length / 2; b++) {
    const [L, R] = S.parts.slice(2 * b, 2 * b + 2);
    const f = x => evP(L, envOf(S, x)) - evP(R, envOf(S, x));
    const [f0, f1, f2, f3, f4] = [0, 1, 2, 3, 4].map(f);
    if ([f0, f1, f2, f3, f4].some(Number.isNaN)) continue;
    const a = (f2 - 2 * f1 + f0) / 2, bb = f1 - f0 - a, c = f0;
    const tol = 1e-7 * Math.max(1, Math.abs(f3), Math.abs(f4));
    assert.ok(Math.abs(9 * a + 3 * bb + c - f3) < tol && Math.abs(16 * a + 4 * bb + c - f4) < tol, `branch is not of degree ≤ 2: ${G.stateHTML(S)}`);
    const small = v => Math.abs(v) < 1e-9 * Math.max(1, Math.abs(f0), Math.abs(f1), Math.abs(f2));
    if (small(a) && small(bb)) { if (small(c)) return 'all'; continue; }
    if (small(a)) { out.push(-c / bb); continue; }
    const d = bb * bb - 4 * a * c, scale = bb * bb + Math.abs(4 * a * c);
    if (Math.abs(d) < 1e-9 * scale) out.push(-bb / (2 * a));
    else if (d > 0) out.push((-bb + Math.sqrt(d)) / (2 * a), (-bb - Math.sqrt(d)) / (2 * a));
  }
  return [...new Set(out.map(v => +v.toPrecision(10)))].sort((p, q) => p - q);
}
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
const same = (u, v) => u.every((x, i) => (!isFinite(x) && !isFinite(v[i])) || Math.abs(x - v[i]) <= 1e-7 * Math.max(1, Math.abs(x)));

// every move a player can make from S: explode any factor, tap any pair, sweep any pair, tap the sign/bar, split any term
function candidates(S) {
  const fs = [], ts = [];
  G.walk(S, L => (L.kind === 'f' ? fs : ts).push(L.kind === 'f' ? L.f.id : L.term.id));
  const out = [];
  fs.forEach(id => out.push(s => G.opExplode(s, id)));
  fs.forEach(a => fs.forEach(b => { if (a !== b) out.push(s => G.opPair(s, a, b)); }));
  ts.forEach(id => [-3, 1, 2].forEach(k => out.push(s => G.opSplitTwo(s, id, k))));
  ts.forEach(a => ts.forEach(b => { if (a !== b) out.push(s => G.termPair(s, a, b)); }));
  out.push(s => G.opOp(s), s => G.opBar(s));
  if (S.op === '=') {   // do the same to both sides: with every term, every number, and some things that must be refused
    const mono = t => G.T(t.f.map(G.cloneF), t.neg);
    S.parts.forEach(P => P.num.forEach(t => {
      out.push(s => G.opBalance(s, '-', mono(t)), s => G.opBalance(s, '+', mono(t)));
      t.f.filter(f => f.k === 'n').forEach(f => out.push(s => G.opBalance(s, ':', G.T([G.N(f.v)])), s => G.opBalance(s, '·', G.T([G.N(f.v)], true))));
    }));
    fs.concat(ts).forEach(id => out.push(s => G.opDrag(s, id)));   // drag any piece across the =
    fs.forEach(id => out.push(s => G.opDrag(s, -id)));   // the ² of a lone square (and ids that have none)
    for (let b = 0; b < S.parts.length / 2; b++)   // per branch: swap, root of both sides, product = 0, typed + and ·
      out.push(s => G.opSwap(s, b), s => G.opRoot(s, b), s => G.opZero(s, b), s => G.opBalance(s, '+', G.T([G.N(9)]), b), s => G.opBalance(s, '·', G.T([G.N(4)]), b));
    out.push(s => G.opBalance(s, '·', G.T([G.V('x')])), s => G.opBalance(s, ':', G.T([G.N(0)])), s => G.opBalance(s, '·', G.T([G.N(1)])));
    // by the parameters: · a, : a, + b², · 4a, and a letter that isn't in the equation (refused)
    G.params(S).forEach(l => out.push(s => G.opBalance(s, '·', G.T([G.V(l)])), s => G.opBalance(s, ':', G.T([G.V(l)], true)), s => G.opBalance(s, '+', G.T([G.V(l, 2)])), s => G.opBalance(s, '·', G.T([G.N(4), G.V(l)]))));
    out.push(s => G.opBalance(s, ':', G.T([G.V('z')])));
  }
  return out;
}

function fuzz(start, steps, label) {
  let S = JSON.parse(JSON.stringify(start));
  for (let k = 0; k < steps; k++) {
    const before = values(S), snap = JSON.stringify(S);
    const moves = candidates(S).sort(() => Math.random() - 0.5);
    let moved = false;
    for (const m of moves) {
      const trial = JSON.parse(snap);
      let r;
      try { r = m(trial); } catch (e) { assert.fail(`${label}: a move threw ${e.message}\n${snap}`); }
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
      const kept = branching ? sameSolutions(solutions(old), solutions(trial))
        : S.op === '=' ? old.parts.every((_, i) => i % 2 || equivalent(eqValues(pair(old, i / 2), old), eqValues(pair(trial, i / 2), old)))
        : same(before, values(trial));
      assert.ok(kept, `${label}: move ${r.ok} changed the ${S.op === '=' ? 'solutions' : 'value'}\nbefore ${G.stateHTML(JSON.parse(snap))}\nafter  ${G.stateHTML(trial)}`);
      S = trial; moved = true; break;
    }
    if (!moved || G.isClean(S)) break;
  }
}

const hasText = k => !!(G.I18N.en[k] && G.I18N.nl[k]);
module.exports = { hasText, G, values, same, equivalent, fuzz, solutions, sameSolutions };
