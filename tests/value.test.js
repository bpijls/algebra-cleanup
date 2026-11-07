// Every move must leave the value of the expression unchanged (see judge.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, values, same, fuzz, solutions, sameSolutions } = require('./judge');

test('value is preserved by every move: levels, random play', () => {
  G.LEVELS.forEach((_, i) => { for (let r = 0; r < 12; r++) fuzz(G.buildLevel(i), 40, `level ${i + 1}`); });
});

test('value is preserved by every move: practice problems, random play', () => {
  for (const topic of Object.keys(G.GEN)) for (const d of [1, 2, 3]) for (let r = 0; r < 8; r++) {
    const S = G.makeProblem([topic], d);
    fuzz(S, 40, `${topic} ${d}`);
  }
});

test('value is preserved along the hint path (autoSolve)', () => {
  const starts = [...G.LEVELS.map((_, i) => G.buildLevel(i))];
  for (const topic of Object.keys(G.GEN)) for (const d of [1, 2, 3]) for (let r = 0; r < 10; r++) starts.push(G.makeProblem([topic], d));
  for (const S of starts) {
    const v0 = values(S);
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null);
    assert.ok(S.op === '=' ? sameSolutions(solutions(S), solutions(T)) : same(v0, values(T)), `autoSolve changed the value: ${G.stateHTML(S)} → ${G.stateHTML(T)}`);
  }
});

