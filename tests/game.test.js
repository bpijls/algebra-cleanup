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
  let S = G.buildLevel(20);
  assert.equal(G.opPair(S, num(S)[0].f[0].id, num(S)[1].f[0].id).no, 'explodeFirst');
  S = G.buildLevel(22);
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

test('tapping · joins one-row fractions in either order: (A/1)·(1/B) and (1/B)·(A/1) both give A/B', () => {
  const A = () => [G.T([G.N(7), G.N(3), G.V('b', 1), G.V('x', 1)])];
  const B = () => [G.T([G.V('x', 1), G.N(5), G.V('b', 2), G.N(2)])];
  const one = () => [G.T([G.N(1)])];
  const results = [[G.F(A(), one()), G.F(one(), B())], [G.F(one(), B()), G.F(A(), one())]].map(parts => {
    const S = { parts, op: '·', goal: 'simplify' };
    assert.equal(G.opOp(S).ok, 'joined'); G.normalize(S);
    assert.equal(S.parts.length, 1); assert.equal(S.op, null);
    return strip(G.stateHTML(S));
  });
  assert.equal(results[0], results[1]);
  assert.match(results[0], /^\[7.*\/x/);
  // with nothing left to cross-cancel, the hint points at the · sign
  const S = { parts: [G.F([G.T([G.N(1)])], [G.T([G.N(2)])]), G.F([G.T([G.N(3)])])], op: '·', goal: 'simplify' };
  assert.equal(G.hint(S).k, 'hJoin');
});

test('a used-up fraction stays as 1/1 until the player cancels the 1s', () => {
  const one = (neg = false) => [G.T([G.N(1)], neg)];
  for (const [neg, want] of [[false, '[2/3'], [true, '[−2/3']]) {
    const S = { parts: [G.F(one(neg), one()), G.F([G.T([G.N(2)])], [G.T([G.N(3)])])], op: '·', goal: 'simplify' };
    G.normalize(S);
    assert.equal(S.parts.length, 2, '1/1 is not dropped by itself');
    const h = G.hint(S);
    assert.equal(h.k, 'hCancelOnes');
    const r = G.opPair(S, h.ids[0], h.ids[1]);
    assert.equal(r.ok, 'cancelOnes'); G.normalize(S);
    assert.equal(S.parts.length, 1);
    assert.equal(strip(G.stateHTML(S)), want);
  }
  // a 1 only cancels with the 1 below it in the same fraction
  const S = { parts: [G.F(one(), one()), G.F([G.T([G.N(2)])], [G.T([G.N(3)])])], op: '·', goal: 'simplify' };
  const two = S.parts[1].num[0].f[0];
  assert.notEqual(G.opPair(S, S.parts[0].num[0].f[0].id, two.id)?.ok, 'cancelOnes');
});

test('multiplying by hand down to 1/1 leaves the 1/1 on the board', () => {
  const S = G.buildLevel(13);  // 8x/3y : 3x/y
  G.opOp(S); G.normalize(S);  // → 8x/3y · y/3x
  let guard = 0;
  while (S.parts.length > 1 && guard++ < 40) {
    const h = G.hint(S);
    if (h.k === 'hCancelOnes') break;
    const r = h.k === 'hJoin' ? G.opOp(S) : G.opPair(S, h.ids[0], h.ids[1]);
    assert.ok(r && !r.no, h.k); G.normalize(S);
  }
  assert.equal(S.parts.length, 2);
  assert.equal(G.hint(S).k, 'hCancelOnes');
});
