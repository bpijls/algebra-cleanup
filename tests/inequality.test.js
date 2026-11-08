// Inequalities: the balance method with a sign that turns round, checked by where the inequality holds.
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, sameTruth, fuzz } = require('./judge');
const { strip } = require('./load');

test('times or divided by a negative number turns the sign round, and says why', () => {
  const S = G.parseProblem('-2x<6').S;
  const r = G.opBalance(S, ':', G.T([G.N(2)], true)); G.normalize(S);
  assert.equal(r.ok, 'balanceFlip'); assert.equal(S.rel, '>');
  const P = G.parseProblem('x+3<7').S;
  assert.equal(G.opBalance(P, '-', G.T([G.N(3)])).ok, 'balance'); assert.equal(P.rel, '<');
});

test('swapping the sides mirrors the sign; the answer reads with the letter on the left', () => {
  const S = G.parseProblem('3>x').S;
  assert.equal(G.isClean(S), false);
  assert.equal(G.whyNotDone(S).k, 'nyIneqLeft');
  G.opSwap(S);
  assert.equal(strip(G.stateHTML(S)), 'x &lt; 3'); assert.equal(G.isClean(S), true);
});

test('no letters, no roots, no product = 0 in an inequality', () => {
  const S = G.parseProblem('4/x<2').S;   // times x is allowed in 4/x = 2, but x could be negative here
  assert.equal(G.opBalance(S, '·', G.T([G.V('x')])).no, 'ineqLetter');
  const Q = G.parseProblem('x^2<9').S;
  assert.equal(G.opRoot(Q).no, 'ineqBranch');
});

test('every inequality level and practice problem is solved by the hints, keeping where it holds', () => {
  const starts = G.LEVELS.filter(L => L.id.startsWith('ineq.')).map(L => G.buildLevel(G.levelIndex(L.id)));
  for (const d of [1, 2, 3]) for (let k = 0; k < 15; k++) starts.push(G.makeProblem(['ineq'], d));
  for (const S of starts) {
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null, strip(G.stateHTML(S)));
    assert.ok(G.isClean(T), strip(G.stateHTML(T)));
    assert.ok(sameTruth(S, T), `${strip(G.stateHTML(S))} → ${strip(G.stateHTML(T))}`);
    for (let k = 0; k < 3; k++) fuzz(S, 25, strip(G.stateHTML(S)));
  }
});
