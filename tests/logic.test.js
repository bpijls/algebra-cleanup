// Boolean logic: + is OR, · is AND, the bar is NOT. The judge compares whole truth tables.
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, fuzz, values } = require('./judge');
const { strip } = require('./load');

const parse = src => G.parseProblem(src, 'logic').S;

test('a + a is a, never 2a; a · a is a, never a²', () => {
  const S = parse('a+a');
  assert.equal(G.opPair(S, S.parts[0].num[0].f[0].id, S.parts[0].num[1].f[0].id).ok, 'orSame'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), 'a');
  const P = parse('a·a');
  assert.equal(G.opPair(P, P.parts[0].num[0].f[0].id, P.parts[0].num[0].f[1].id).ok, 'andSame');
});

test('the moves that only hold for numbers are refused in logic', () => {
  const S = parse('a+a');
  const [t0, t1] = S.parts[0].num;
  assert.equal(G.termPair(S, t0.id, t1.id), null);
  assert.equal(G.opSweep(S, [t0.f[0].id, t1.f[0].id]), null);
  assert.equal(G.opSplitTwo(S, t0.id, 2), null);
  assert.equal(G.parseProblem('a·0+b').err, 'pZeroNum');   // a · 0 is only a move in logic
});

test('absorption is earned by factoring: a + ab → a(1 + b) → a', () => {
  const S = parse('a+a·b');
  const [t0, t1] = S.parts[0].num;
  assert.equal(G.opPair(S, t0.f[0].id, t1.f[0].id).ok, 'factorOne'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), 'a(1 + b)');
  assert.equal(G.whyNotDone(S).k, 'nyOr');
});

test('every logic level and practice problem is simplified by the hints, keeping its truth table', () => {
  const starts = G.LEVELS.filter(L => /^(logic|logicsimp|demorgan)\./.test(L.id)).map(L => [L.id, G.buildLevel(G.levelIndex(L.id))]);
  for (const k of ['logic', 'logicsimp', 'demorgan']) for (let i = 0; i < 12; i++) starts.push([k, G.makeProblem([k], 1)]);
  for (const [name, S] of starts) {
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null, `${name}: ${strip(G.stateHTML(S))}`);
    assert.ok(G.isClean(T), name);
    assert.deepEqual(values(T), values(S), `${name}: ${strip(G.stateHTML(S))} → ${strip(G.stateHTML(T))}`);
    for (let k = 0; k < 3; k++) fuzz(S, 30, name);
  }
});
