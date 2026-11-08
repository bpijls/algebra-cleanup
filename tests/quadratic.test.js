// Quadratic equations: roots, branches ("or"), and finding the abc-formula with the ordinary moves.
const test = require('node:test');
const assert = require('node:assert/strict');
const { strip } = require('./load');
const { G, fuzz, solutions, sameSolutions, hasText } = require('./judge');

const eq = src => { const r = G.parseProblem(src, 'solve'); assert.ok(!r.err, src); return r.S; };
const show = S => strip(G.stateHTML(S));

test('taking the root of both sides gives two branches, and refuses what has no root', () => {
  const S = eq('(x+3)^2=5');
  assert.equal(G.opRoot(S).ok, 'rootBoth'); G.normalize(S);
  assert.equal(show(S), 'x + 3 = √5 ∨ x + 3 = −√5');
  const no = (src, key) => { const T = eq(src), snap = JSON.stringify(T); assert.equal(G.opRoot(T)?.no, key, src); assert.equal(JSON.stringify(T), snap); };
  no('x^2=-4', 'rootNeg');          // a square is never negative
  no('2x^2=18', 'rootCoef');        // the square on its own first
  no('x^2+x=6', 'rootNoSquare');
  no('x^2=x+2', 'rootLetter');
  const Z = eq('x^2=0'); assert.equal(G.opRoot(Z).ok, 'rootZero'); G.normalize(Z);
  assert.equal(show(Z), 'x = 0');   // only one branch: 0 has one root
});

test('dragging the ² of a lone square across the = takes the root; dragging the 0 onto a product splits it', () => {
  const S = eq('(x+3)^2=5'), sq = G.loneSquare(S.parts[0]);
  assert.equal(sq.k, 'p');
  assert.equal(G.opDrag(S, -sq.id).ok, 'rootBoth'); G.normalize(S);
  assert.equal(show(S), 'x + 3 = √5 ∨ x + 3 = −√5');
  assert.equal(G.loneSquare(eq('2x^2=8').parts[0]), null);      // a number in front: no ² to drag yet
  assert.equal(G.loneSquare(eq('-x^2=-4').parts[0]), null);
  const N = eq('x^2=-4'), snap = JSON.stringify(N);
  assert.equal(G.opDrag(N, -G.loneSquare(N.parts[0]).id).no, 'rootNeg'); assert.equal(JSON.stringify(N), snap);
  const Z = eq('(x-2)(x+5)=0'), zero = Z.parts[1].num[0].f[0];
  assert.equal(G.opDrag(Z, zero.id).ok, 'zeroProduct'); G.normalize(Z);
  assert.equal(show(Z), 'x − 2 = 0 ∨ x + 5 = 0');
  const W = eq('x^2+5x+6=0');
  assert.equal(G.opDrag(W, W.parts[1].num[0].f[0].id).no, 'zeroSum');
});

test('a product that is 0 splits into a branch per factor with the letter', () => {
  const S = eq('3x(x-2)(x+5)=0');
  assert.equal(G.opZero(S).ok, 'zeroProduct'); G.normalize(S);
  assert.equal(show(S), 'x = 0 ∨ x − 2 = 0 ∨ x + 5 = 0');   // the 3 can't be 0
  assert.equal(G.opZero(eq('x^2+5x+6=0'))?.no, 'zeroSum');
  assert.equal(G.opZero(eq('3(x-2)=0'))?.no, 'zeroOne');
});

test('a pair under the root comes out as one, only once it is visible', () => {
  const S = eq('x^2=12');
  G.opRoot(S); G.normalize(S);
  const root = () => { let r; G.walk(S, L => { if (!r && L.kind === 'f' && L.f.k === 'r') r = L.f; }); return r; };
  assert.equal(G.opExplode(S, root().id).no, 'rootTap');
  G.opExplode(S, root().terms[0].f[0].id); G.normalize(S);           // 12 → 2·2·3 under the root
  const [a, b] = root().terms[0].f.filter(f => f.v === 2);
  assert.equal(G.opPair(S, a.id, b.id).ok, 'rootOut'); G.normalize(S);
  assert.match(show(S), /^x = 2√3 ∨/);
});

test('tiles in different branches do not combine', () => {
  const S = eq('x^2=9'); G.opRoot(S); G.normalize(S);
  const xs = []; G.walk(S, L => { if (L.kind === 'f' && L.f.k === 'v') xs.push(L.f.id); });
  assert.equal(G.opPair(S, xs[0], xs[1]).no, 'diffBranch');
});

test('x(x − 5) + x − 5: the loose terms are the bracket once', () => {
  const S = eq('x(x-5)+x-5=0');
  let b, t;
  G.walk(S, L => { if (L.kind === 'f' && L.f.k === 'p' && !b) b = L.f; if (L.kind === 'f' && L.f.k === 'v' && L.depth === 0 && L.term.f.length === 1) t = L.f; });
  assert.equal(G.opPair(S, b.id, t.id).ok, 'factorRest'); G.normalize(S);
  assert.equal(show(S), '(x − 5)(x + 1) = 0');
});

test('every quadratic level and practice problem is solved by the hints, keeping its solutions, with text all the way', () => {
  const starts = G.LEVELS.map((L, i) => i).filter(i => G.LEVELS[i].goal === 'solve').map(i => G.buildLevel(i));
  for (const d of [1, 2, 3]) for (let r = 0; r < 25; r++) { const S = G.makeProblem(['quadratic'], d); assert.ok(S, `no problem at difficulty ${d}`); starts.push(S); }
  for (const S0 of starts) {
    const S = JSON.parse(JSON.stringify(S0)), sol = solutions(S0);
    for (let k = 0; k < 80 && !G.isClean(S); k++) {
      const h = G.hint(S); assert.ok(hasText(h.k), h.k);
      assert.ok(G.autoSolveStep(S), `${show(S0)}: stuck at ${show(S)} (${h.k})`);
      assert.ok(sameSolutions(sol, solutions(S)), `${show(S0)}: lost a solution at ${show(S)}`);
      if (k % 4 === 0) fuzz(S, 12, `${show(S0)} from ${show(S)}`);   // random play from the branched states too
    }
    assert.ok(G.isClean(S), show(S0));
    assert.equal(G.whyNotDone(S), null);
  }
});

test('multiplying by 4a and completing the square lands on the abc-formula', () => {
  // for each a, b, c the game's answer is (−b ± √(b² − 4ac)) / 2a
  const cases = [[1, 3, 1], [2, 3, -1], [3, 5, 1], [2, -7, -8], [1, -5, 3], [3, -7, -8]];
  for (const [a, b, c] of cases) {
    const src = `${a === 1 ? '' : a}x^2${b < 0 ? '-' : '+'}${Math.abs(b)}x${c < 0 ? '-' : '+'}${Math.abs(c)}=0`;
    const S = eq(src);
    assert.notEqual(G.autoSolve(S), null, src);
    const d = Math.sqrt(b * b - 4 * a * c), want = [(-b - d) / (2 * a), (-b + d) / (2 * a)].sort((p, q) => p - q);
    assert.ok(sameSolutions(solutions(S), want), `${src}: ${show(S)}`);
    let usedRoot = false; G.walk(S, L => { if (L.kind === 'f' && L.f.k === 'r') usedRoot = true; });
    assert.ok(usedRoot, `${src}: the answer has a root in it`);
  }
});
