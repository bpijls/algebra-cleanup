// Complex numbers: i · i = −1 is the one new rule, and the judge evaluates with complex arithmetic.
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, fuzz, solutions, sameSolutions, values, same } = require('./judge');
const { strip } = require('./load');

const level = id => G.buildLevel(G.levelIndex(id));
const solved = id => { const S = level(id); assert.notEqual(G.autoSolve(S), null, id); return strip(G.stateHTML(S)); };

test('the answers, past D < 0', () => {
  assert.equal(solved('complex.3'), '3i');
  assert.equal(solved('complex.4'), '7 + i');
  assert.equal(solved('complex.5'), 'x = 2i ∨ x = −2i');
  assert.equal(solved('complex.6'), 'x = 2i − 1 ∨ x = −2i − 1');
  assert.deepEqual(solutions(level('complex.6')), [-1, -2, -1, 2]);   // the judge's own: −1 ± 2i
});

test('i · i = −1 is a tap, not a merge; a real problem still refuses the root of a negative number', () => {
  const S = G.parseProblem('3i·2i').S;
  const [, i1, , i2] = S.parts[0].num[0].f;
  assert.equal(G.opPair(S, i1.id, i2.id).ok, 'iSquare'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), '−3·2');
  const P = G.parseProblem('i^3').S;
  assert.equal(G.opExplode(P, P.parts[0].num[0].f[0].id).ok, 'iPow'); G.normalize(P);   // i³ = i · i · i, then the rule
  assert.equal(strip(G.stateHTML(P)), 'iii');
  const R = G.parseProblem('x^2=-4').S;                        // typed without i: real numbers
  assert.equal(G.opRoot(R).no, 'rootNeg');
  assert.equal(G.hint(R).k, 'hNoReal');
  const T = level('complex.5');
  assert.equal(G.opRoot(T).ok, 'rootBoth');
});

test('every complex level and practice problem is solved by the hints, keeping its value or solutions', () => {
  const starts = G.LEVELS.filter(L => L.id.startsWith('complex.')).map(L => [L.id, level(L.id)]);
  for (const d of [1, 2, 3]) for (let k = 0; k < 10; k++) starts.push([`complex ${d}`, G.makeProblem(['complex'], d)]);
  for (const [name, S] of starts) {
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null, `${name}: ${strip(G.stateHTML(S))}`);
    assert.ok(G.isClean(T), name);
    if (S.op === '=') assert.ok(sameSolutions(solutions(S), solutions(T)), `${name}: ${strip(G.stateHTML(T))}`);
    else assert.ok(same(values(S), values(T)), name);
    for (let k = 0; k < 3; k++) fuzz(S, 30, name);
  }
});
