// The outside judge: arithmetic. A state's value at a few random letter values; every move must keep it.
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
// an equation keeps its solutions when L − R changes by the same nonzero constant everywhere
function equivalent(u, v) {
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
  ts.forEach(id => out.push(s => G.opSplit(s, id)));
  ts.forEach(id => [-3, 1, 2].forEach(k => out.push(s => G.opSplitTwo(s, id, k))));
  ts.forEach(a => ts.forEach(b => { if (a !== b) out.push(s => G.termPair(s, a, b)); }));
  out.push(s => G.opOp(s), s => G.opBar(s));
  if (S.op === '=') {   // do the same to both sides: with every term, every number, and some things that must be refused
    const mono = t => G.T(t.f.map(G.cloneF), t.neg);
    S.parts.forEach(P => P.num.forEach(t => {
      out.push(s => G.opBalance(s, '-', mono(t)), s => G.opBalance(s, '+', mono(t)));
      t.f.filter(f => f.k === 'n').forEach(f => out.push(s => G.opBalance(s, ':', G.T([G.N(f.v)])), s => G.opBalance(s, '·', G.T([G.N(f.v)], true))));
    }));
    out.push(s => G.opSwap(s), s => G.opBalance(s, '·', G.T([G.V('x')])), s => G.opBalance(s, ':', G.T([G.N(0)])), s => G.opBalance(s, '·', G.T([G.N(1)])));
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
      const kept = S.op === '=' ? equivalent(before, values(trial)) : same(before, values(trial));
      assert.ok(kept, `${label}: move ${r.ok} changed the ${S.op === '=' ? 'solutions' : 'value'}\nbefore ${G.stateHTML(JSON.parse(snap))}\nafter  ${G.stateHTML(trial)}`);
      S = trial; moved = true; break;
    }
    if (!moved || G.isClean(S)) break;
  }
}

const hasText = k => !!(G.I18N.en[k] && G.I18N.nl[k]);
module.exports = { hasText, G, values, same, equivalent, fuzz };
