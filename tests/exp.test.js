// Exponential equations, growth and the log rules: the same base gives equal exponents, otherwise the log of
// both sides; log(aˣ) = x · log a is a shortcut that is earned. Checked by the solutions (judge.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, fuzz, solutions, sameSolutions, values, same } = require('./judge');
const { strip } = require('./load');

const level = id => G.buildLevel(G.levelIndex(id));
const solved = id => { const S = level(id); assert.notEqual(G.autoSolve(S), null, id); return strip(G.stateHTML(S)); };

test('the textbook answers', () => {
  assert.equal(solved('expeq.1'), 'x = 3');
  assert.equal(solved('expeq.2'), 'x = 2');
  assert.equal(solved('expeq.3'), 'x = 3');
  assert.equal(solved('expeq.4'), 'x = [3/2');
  assert.equal(solved('expeq.5'), 'x = [log(5)/log(2)');
  assert.equal(solved('growth.2'), 't = 3');
  assert.equal(solved('logrules.2'), '2log(a) − log(b)');
  assert.equal(solved('logrules.4'), '2log(a)');
});

test('equal exponents only when each side is one power of the same base', () => {
  const S = level('expeq.1');                                    // 2ˣ = 8: write 8 as a power first
  assert.equal(G.opExpBase(JSON.parse(JSON.stringify(S))).no, 'expBaseDiff');
  const D = level('expeq.3');                                    // 5 · 2ˣ = 40: divide the 5 away first
  assert.equal(G.opExpBase(D).no, 'expBaseShape');
  assert.equal(G.opLogBoth(JSON.parse(JSON.stringify(D))).no, undefined);   // 5 · 2ˣ and 40 are positive: allowed
  const P = level('expeq.1');
  G.opAsPower(P, P.parts[1].num[0].f[0].id); G.normalize(P);
  assert.equal(G.opExpBase(P).ok, 'expBaseEq'); G.normalize(P);
  assert.equal(strip(G.stateHTML(P)), 'x = 3');
});

test('log(aˣ) = x · log a is a shortcut earned by finishing Logarithms', () => {
  const S = level('expeq.5');
  G.opLogBoth(S); G.normalize(S);
  const lg = S.parts[0].num[0].f[0];
  const locked = JSON.parse(JSON.stringify(S)); delete locked.earned;
  assert.equal(G.opExplode(locked, lg.id).no, 'logPowerLocked');
  assert.match(G.opExplode(S, lg.id).ok, /^logPower/);
  const logs = G.SKILLS.logs.levels, won = Object.fromEntries(logs.map(id => [id, 3]));
  assert.deepEqual(G.earnedFor('expeq', {}), ['logPower']);      // expeq builds on logs (through logrules)
  assert.deepEqual(G.earnedFor('logs', won), []);                 // never inside the skill that earns it
  assert.deepEqual(G.earnedFor('powers', {}), []);
  assert.deepEqual(G.earnedFor('powers', won), ['logPower']);
});

test('the quotient rule writes down its conditions; equal pieces only go outside brackets', () => {
  const S = level('logrules.1');
  assert.equal(G.opExplode(S, S.parts[0].num[0].f[0].id).ok, 'logQuotient');
  assert.deepEqual(S.conds.map(c => c.rel), ['gt', 'gt']);
  const T = level('expeq.2');                                    // 3^(x+1) → 3ˣ · 3: 3ˣ and 3^(x+1) are not the same piece
  const v0 = values(T);
  G.opExplode(T, T.parts[0].num[0].f[0].id); G.normalize(T);
  assert.ok(same(v0, values(T)));
});

test('every new level and practice problem is solved by the hints, keeping its solutions or value', () => {
  const starts = G.LEVELS.filter(L => /^(expeq|growth|logrules)\./.test(L.id)).map(L => [L.id, level(L.id)]);
  for (const k of ['expeq', 'growth', 'logrules']) for (const d of [1, 2, 3]) for (let i = 0; i < 8; i++) starts.push([`${k} ${d}`, G.makeProblem([k], d)]);
  for (const [name, S] of starts) {
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null, `${name}: ${strip(G.stateHTML(S))}`);
    assert.ok(G.isClean(T), `${name}: ${strip(G.stateHTML(T))}`);
    if (S.op === '=') assert.ok(sameSolutions(solutions(S), solutions(T)), `${name}: ${strip(G.stateHTML(S))} → ${strip(G.stateHTML(T))}`);
    else assert.ok(same(values(S), values(T)), name);
    for (let k = 0; k < 3; k++) fuzz(S, 25, name);
  }
});
