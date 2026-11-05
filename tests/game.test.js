const test = require('node:test');
const assert = require('node:assert/strict');
const { load, strip } = require('./load');
const G = load();
const num = S => S.parts[0].num, den = S => S.parts[0].den;
const simplify = parts => ({ parts, op: null, goal: 'simplify' });

test('every level starts messy and can be solved by following the hints', () => {
  G.LEVELS.forEach((_, i) => {
    const S = G.buildLevel(i);
    assert.equal(G.isClean(S), false, `level ${i + 1} is clean at the start`);
    assert.notEqual(G.autoSolve(S), null, `level ${i + 1} cannot be solved`);
  });
});

test('practice generator: every topic and difficulty gives solvable problems', () => {
  for (const topic of Object.keys(G.GEN)) for (const d of [1, 2, 3]) for (let i = 0; i < 25; i++) {
    const S = G.makeProblem([topic], d);
    assert.ok(S, `no problem for ${topic} ${d}`);
    assert.notEqual(G.autoSolve(JSON.parse(JSON.stringify(S))), null);
  }
});

test('no magic: cancelling needs exactly equal pieces (x¹² over x³)', () => {
  const S = simplify([G.F([G.T([G.V('x', 12)])], [G.T([G.V('x', 3)])])]);
  assert.equal(G.opPair(S, num(S)[0].f[0].id, den(S)[0].f[0].id).no, 'cancelUnequal');
  G.opExplode(S, num(S)[0].f[0].id); G.normalize(S);
  const xs = num(S)[0].f.map(f => f.id);
  G.opSweep(S, xs.slice(0, 3)); G.normalize(S);
  G.opSweep(S, num(S)[0].f.slice(1).map(f => f.id)); G.normalize(S);
  assert.equal(G.opPair(S, num(S)[0].f[0].id, den(S)[0].f[0].id).ok, 'cancelVar');
  G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), 'x^9');
});

test('no magic: numbers cancel only when equal (12 over 4)', () => {
  const S = G.buildLevel(8);
  assert.equal(G.opPair(S, num(S)[0].f[0].id, den(S)[0].f[0].id).no, 'cancelUnequalNum');
});

test('no magic: factoring needs exact matches (6a + 9b, a² with a)', () => {
  let S = G.buildLevel(17);
  assert.equal(G.opPair(S, num(S)[0].f[0].id, num(S)[1].f[0].id).no, 'explodeFirst');
  S = G.buildLevel(19);
  assert.equal(G.opPair(S, num(S)[0].f[1].id, num(S)[1].f[1].id).no, 'explodeFirstVar');
});

test('tapping across terms: like terms add, unlike terms explain why not', () => {
  let S = G.buildLevel(4);   // a + a + 3a
  assert.equal(G.opPair(S, num(S)[0].f[0].id, num(S)[1].f[0].id).ok, 'likeAddTap');
  S = G.buildLevel(5);       // 4a² + 2a³ + a²
  assert.equal(G.opPair(S, num(S)[0].f[1].id, num(S)[1].f[1].id).no, 'notLike');
});

test('factoring works in any mode, and opening brackets undoes it', () => {
  const S = simplify([G.F([G.T([G.N(2), G.V('x')]), G.T([G.N(2), G.V('y')])])]);
  const r = G.opPair(S, num(S)[0].f[0].id, num(S)[1].f[0].id); G.normalize(S);
  // allowed in a simplify level, but flagged: 2x and 2y aren't like terms, so it doesn't simplify anything
  assert.equal(r.ok, 'factorUseless'); assert.ok(r.arcs && r.origins);
  assert.equal(strip(G.stateHTML(S)), '2(x + y)');
  G.opExplode(S, num(S)[0].f.find(f => f.k === 'p').id); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), '2x + 2y');
});

test('a swipe is accepted only as one valid move', () => {
  let S = G.buildLevel(3);   // 2a·3a²: letters and numbers mixed
  assert.equal(G.opSweep(S, num(S)[0].f.map(f => f.id)).no, 'sweepMixed');
  S = G.buildLevel(4);       // a + a + 3a: one letter per like term
  const r = G.opSweep(S, num(S).map(t => t.f.find(f => f.k === 'v').id)); G.normalize(S);
  assert.equal(r.ok, 'sweepAdd'); assert.equal(strip(G.stateHTML(S)), '5a');
});

test('division sign cycles: bar → : → · → bar', () => {
  const S = G.buildLevel(8);
  const start = strip(G.stateHTML(S));
  G.opBar(S); G.normalize(S); assert.equal(S.op, ':');
  G.opOp(S); G.normalize(S); assert.equal(S.op, '·');
  G.opOp(S); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), start);
});

test('multiplying fractions by hand: tops with tops, bottoms with bottoms', () => {
  const S = G.buildLevel(13);  // 8x/3y : 3x/y
  G.opOp(S);                   // → 8x/3y · y/3x
  const top8 = S.parts[0].num[0].f[0], bottomX = S.parts[1].den[0].f.find(f => f.k === 'v');
  assert.equal(G.opPair(S, top8.id, bottomX.id).no, 'crossSide');
  assert.equal(G.autoSolve(S) !== null, true);
  assert.equal(strip(G.stateHTML(S)), '[8/9');
});
