// Formulas: a given value is written in by a move of its own, then worked out; sequences, sums by their
// formulas, and physics formulas solved for one letter (letters for numbers).
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, fuzz, values, same, solutions, sameSolutions } = require('./judge');
const { strip } = require('./load');

const level = id => G.buildLevel(G.levelIndex(id));
const solved = id => { const S = level(id); assert.notEqual(G.autoSolve(S), null, id); return strip(G.stateHTML(S)); };

test('the answers', () => {
  assert.equal(solved('sequences.1'), '39');
  assert.equal(solved('sequences.2'), 'n = 10');
  assert.equal(solved('sequences.3'), '54');
  assert.equal(solved('sequences.4'), 'n = 5');
  assert.equal(solved('sums.1'), '5050');
  assert.equal(solved('sums.2'), '210');
  assert.equal(solved('physics.2'), 't = [v − u/a');
  assert.equal(solved('physics.4'), 't = [pv/nr');
});

test('a given letter is written in by a move, and Done? waits for it', () => {
  const S = level('sums.3');                       // n² with n = 12
  assert.equal(G.isClean(S), false);
  assert.equal(G.whyNotDone(S).k, 'nySubst');
  const n = S.parts[0].num[0].f[0];
  assert.equal(G.opSubstitute(S, n.id).ok, 'substitute'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), '12^2');
  const P = G.parseProblem('3+4n').S;               // no value given: no move
  assert.equal(G.opSubstitute(P, P.parts[0].num[1].f[1].id), null);
});

test('every formula level and practice problem is solved by the hints, keeping its value or solutions', () => {
  const starts = G.LEVELS.filter(L => /^(sequences|sums|physics)\./.test(L.id)).map(L => [L.id, level(L.id)]);
  for (const k of ['sequences', 'sums', 'physics']) for (const d of [1, 2, 3]) for (let i = 0; i < 6; i++) starts.push([`${k} ${d}`, G.makeProblem([k], d)]);
  for (const [name, S] of starts) {
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null, `${name}: ${strip(G.stateHTML(S))}`);
    assert.ok(G.isClean(T), name);
    if (S.op === '=') assert.ok(sameSolutions(solutions(S), solutions(T)), `${name}: ${strip(G.stateHTML(T))}`);
    else assert.ok(same(values(S), values(T)), name);
    for (let k = 0; k < 3; k++) fuzz(S, 30, name);
  }
});
