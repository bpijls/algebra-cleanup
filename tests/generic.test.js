// Letters for numbers: solve for x while a, b, c … are numbers nobody knows. The general solution
// (and in the end the abc-formula) comes out of the same moves, with the conditions it takes for granted.
const test = require('node:test');
const assert = require('node:assert/strict');
const { strip } = require('./load');
const { G, fuzz, solutions, sameSolutions, hasText } = require('./judge');

const eq = src => { const r = G.parseProblem(src, 'solve'); assert.ok(!r.err, `${src}: ${r.err}`); return r.S; };
const show = S => strip(G.stateHTML(S));
const conds = S => (S.conds || []).map(c => strip(c.html)).join(', ');

// [typed, the answer the hints leave, the conditions it needs]
const FORMS = [
  ['ax=b', 'x = [b/a', 'a ≠ 0'],
  ['ax+b=c', 'x = [c − b/a', 'a ≠ 0'],
  ['ax+b=cx+d', 'x = [d − b/a − c', 'a − c ≠ 0'],   // where y = ax + b and y = cx + d cross
  ['ax-b=cx', 'x = [b/a − c', 'a − c ≠ 0'],
  ['a(x-b)=cx', 'x = [ab/a − c', 'a − c ≠ 0'],
  ['3x+a=x+b', 'x = [b − a/2', ''],
  ['x/a=b', 'x = ab', 'a ≠ 0'],
  ['x^2=a', 'x = √a ∨ x = −√a', 'a ≥ 0'],
  ['(x+p)^2=q', 'x = √q − p ∨ x = −√q − p', 'q ≥ 0'],
  ['(x-a)(x-b)=0', 'x = a ∨ x = b', ''],
  ['px^2+qx=0', 'x = 0 ∨ x = [−q/p', 'p ≠ 0'],
  ['x^2+2px+q=0', 'x = √p^2 − q − p ∨ x = −√p^2 − q − p', 'p^2 − q ≥ 0'],
  ['x^2+px+q=0', 'x = [√p^2 − 4q − p/2 ∨ x = [−√p^2 − 4q − p/2', 'p^2 − 4q ≥ 0'],
  ['ax^2+bx+c=0', 'x = [√b^2 − 4ac − b/2a ∨ x = [−√b^2 − 4ac − b/2a', 'a ≠ 0, b^2 − 4ac ≥ 0'],
];

test('every generic form is solved by the hints to its textbook answer, with its conditions', () => {
  for (const [src, want, cond] of FORMS) {
    const S0 = eq(src), S = JSON.parse(JSON.stringify(S0)), sol = solutions(S0);
    for (let k = 0; k < 60 && !G.isClean(S); k++) {
      const h = G.hint(S); assert.ok(hasText(h.k), `${src}: ${h.k}`);
      const r = G.autoSolveStep(S);
      assert.ok(r, `${src}: stuck at ${show(S)} (${h.k})`);
      assert.ok(hasText(r.ok), `${src}: ${r.ok}`);
      assert.ok(sameSolutions(sol, solutions(S)), `${src}: lost a solution at ${show(S)}`);
    }
    assert.equal(show(S), want, src);
    assert.equal(conds(S), cond, src);
    assert.equal(G.whyNotDone(S), null, src);
    for (let k = 0; k < 3; k++) fuzz(S0, 25, src);
  }
});

test('the answers are the formulas: x = (d − b)/(a − c) and x = (−b ± √(b² − 4ac))/2a', () => {
  const { a, b, c, d } = G.PVAL;
  const line = eq('ax+b=cx+d'); G.autoSolve(line);
  assert.ok(sameSolutions(solutions(line), [(d - b) / (a - c)]));
  const quad = eq('ax^2+bx+c=0'); G.autoSolve(quad);
  const D = Math.sqrt(b * b - 4 * a * c);
  assert.ok(sameSolutions(solutions(quad), [(-b - D) / (2 * a), (-b + D) / (2 * a)].sort((p, q) => p - q)));
});

test('dividing by a letter is allowed, with a condition; by the unknown or a stranger it is not', () => {
  const S = eq('ax+b=cx+d');
  const snap = JSON.stringify(S);
  assert.equal(G.opBalance(S, '·', G.T([G.V('x')])).no, 'balanceLetter');   // x could be 0
  assert.equal(G.opBalance(S, ':', G.T([G.V('z')])).no, 'balanceLetter');   // z isn't in it
  assert.equal(JSON.stringify(S), snap);
  const r = G.opBalance(S, ':', G.T([G.V('a')]));
  assert.equal(r.ok, 'balanceIf');
  assert.equal(conds(S), 'a ≠ 0');
  // dragging a parameter out of a term alone on its side divides by it
  const T = eq('ax=b'), a = T.parts[0].num[0].f.find(f => f.b === 'a');
  assert.equal(G.opDrag(T, a.id).ok, 'balanceIf');
  G.normalize(T);
  assert.equal(show(T), '[ax/a = [b/a');
  // a root of letters: two branches, and it needs what is under it to be ≥ 0
  const Q = eq('x^2=a'), sq = G.loneSquare(Q.parts[0]);
  assert.equal(G.opDrag(Q, -sq.id).ok, 'rootBothIf');
  assert.equal(conds(Q), 'a ≥ 0');
});

test('the unknown can be another letter, and the parser says when it can’t tell', () => {
  const S = G.parseProblem('ap+b=c', 'solve', 'p').S;
  assert.equal(G.unknownOf(S), 'p');
  G.autoSolve(S);
  assert.equal(show(S), 'p = [c − b/a');
  assert.equal(G.parseProblem('2y+a=b', 'solve').err, 'pEqWhich');
  assert.equal(G.parseProblem('ax=b', 'solve', 'y').err, 'pEqUnknown');
  assert.equal(G.unknownOf(eq('2a-5=3a+1')), 'a');   // one letter: that is the unknown, as before
});

test('practice: letters for numbers, every difficulty', () => {
  for (const d of [1, 2, 3]) for (let r = 0; r < 20; r++) {
    const S = G.makeProblem(['generic'], d);
    assert.ok(S, `no problem at difficulty ${d}`);
    assert.ok(G.params(S).length, show(S));
  }
});

test('splitting a term with a root keeps the root in both halves', () => {
  const t = G.T([G.N(2), G.V('p'), G.Rt([G.T([G.V('q')])])]);
  const S = { parts: [G.F([G.T([G.V('x')])]), G.F([t])], op: '=', goal: 'solve', unknown: 'x' };
  assert.equal(G.opSplitTwo(S, t.id, 3).ok, 'splitTwo');
  assert.equal(show(S), 'x = 3p√q − p√q');
});
