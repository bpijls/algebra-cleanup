// The outside judge: arithmetic. A state's value at a few random letter values; every move must keep it.
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
  if (S.op === '·') return a * b;
  return a / b;   // '/', ':'
}
const values = S => VALS.map(env => value(S, env));
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
      assert.ok(same(before, values(trial)), `${label}: move ${r.ok} changed the value\nbefore ${G.stateHTML(JSON.parse(snap))}\nafter  ${G.stateHTML(trial)}`);
      S = trial; moved = true; break;
    }
    if (!moved || G.isClean(S)) break;
  }
}

const hasText = k => !!(G.I18N.en[k] && G.I18N.nl[k]);
module.exports = { hasText, G, values, same, fuzz };
