// Textbook-style exercises, chapter by chapter (Dutch klas 2–3 algebra), typed the way a student would type them.
// Each one must parse, be solved by following the hints, end clean, and keep its value (judge.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { strip } = require('./load');
const { G, values, same, equivalent, fuzz, hasText } = require('./judge');

const CHAPTERS = {
  'machten (powers)': [
    ['3a^2·2a^5', '6a^7'], ['a^3·a^4·a', 'a^8'], ['(a^2)^3', 'a^6'], ['(2a)^3', '8a^3'], ['(3a^2b)^2', '9a^4b^2'],
    ['-2a·5a^3', '−10a^4'], ['2a^3·(a^2)^4', '2a^11'], ['3a^4b·2ab^3', '6a^5b^4'],
  ],
  'gelijksoortige termen (like terms)': [
    ['3a + 5a - 2a', '6a'], ['4x^2 + 3x - x^2 + 2x', '3x^2 + 5x'], ['2ab + 3ba', '5ab'], ['a + 2b + 3a - b', '4a + b'],
  ],
  'breuken (fractions)': [
    ['12a^5/4a^2', '3a^3'], ['6a^2b/9ab^3', '[2a/3b^2'], ['12a⁵ : 4a²', '3a^3'], ['(8x/3y):(3x/y)', '[8/9'],
    ['x(x+2)/3(x+2)', '[x/3'], ['(x+2)/((x+2)(x+3))', '[1/x + 3'],
  ],
  'haakjes wegwerken (opening brackets)': [
    ['3(x+4)', '3x + 12'], ['-(x-3) + 2x', 'x + 3'], ['-2(x+4) - 3(x-1)', '−5x − 5'], ['a(a+3) - 2(a-1)', 'a^2 + a + 2'],
    ['2x(3x-5)', '6x^2 − 10x'],
  ],
  'dubbele haakjes (double brackets)': [
    ['(x+3)(x-2)', 'x^2 + x − 6'], ['(a+5)(a+1)', 'a^2 + 6a + 5'], ['(2x+1)(x-4)', '2x^2 − 7x − 4'], ['(a+b)(a+2b)', 'a^2 + 3ab + 2b^2'],
  ],
  'merkwaardige producten (special products)': [
    ['(a+b)^2', 'a^2 + 2ab + b^2'], ['(x-5)^2', 'x^2 − 10x + 25'], ['(a-b)(a+b)', 'a^2 − b^2'], ['(2x-y)^2', '4x^2 − 4xy + y^2'],
    ['3(x+1)^2', '3x^2 + 6x + 3'], ['(x+1)^2-(x-1)^2', '4x'], ['2(a+3)^2-(a-1)(a+1)', 'a^2 + 12a + 19'],
  ],
  'buiten haakjes brengen (common factor)': [
    ['6a+9b', '3(2a + 3b)', 'factor'], ['4a^2b+6ab^2', '2ab(2a + 3b)', 'factor'], ['3x^2+x', 'x(3x + 1)', 'factor'],
    ['-3x+6', '−3(x − 2)', 'factor'], ['a(x+2)+3(x+2)', '(x + 2)(a + 3)', 'factor'], ['6a+9b+12', '3(2a + 3b + 4)', 'factor'],
  ],
  'ontbinden: som-product (trinomials)': [
    ['x^2+5x+6', '(x + 2)(x + 3)', 'factor'], ['x^2-x-6', '(x − 3)(x + 2)', 'factor'], ['x^2-5x+6', '(x − 3)(x − 2)', 'factor'],
    ['x^2+4x+4', '(x + 2)^2', 'factor'], ['x^2+2x-15', '(x − 3)(x + 5)', 'factor'], ['2x^2+10x+12', '2(x + 2)(x + 3)', 'factor'],
    ['2x^2+7x+3', '(2x + 1)(x + 3)', 'factor'],
  ],
  'vergelijkingen: balansmethode (equations)': [
    ['x+3=7', 'x = 4'], ['3x=12', 'x = 4'], ['3x+5=20', 'x = 5'], ['5x+3=2x+12', 'x = 3'], ['-2x+7=1', 'x = 3'],
    ['2(x+3)=4x-2', 'x = 4'], ['x/3=4', 'x = 12'], ['(x+1)/2=3', 'x = 5'], ['4x-3=2x+6', 'x = [9/2'], ['7=2x+1', 'x = 3'],
    ['3(x-1)-2(x+4)=0', 'x = 11'], ['2a-5=3a+1', 'a = −6'], ['6=-3x', 'x = −2'],
  ],
};

for (const [chapter, list] of Object.entries(CHAPTERS)) {
  test(`corpus: ${chapter}`, () => {
    for (const [src, want, goal] of list) {
      const r = G.parseProblem(src, goal || 'simplify');
      assert.ok(!r.err, `${src}: does not parse (${r.err})`);
      assert.equal(G.isClean(r.S), false, `${src}: is already clean`);
      const v0 = values(r.S);
      const S = JSON.parse(JSON.stringify(r.S));
      for (let T = JSON.parse(JSON.stringify(S)), k = 0; k < 80; k++) {   // every hint on the way has text
        const h = G.hint(T); assert.ok(hasText(h.k), h.k);
        if (h.k === 'hDone' || G.autoSolveStep(T) == null) break;
      }
      assert.notEqual(G.autoSolve(S), null, `${src}: the hints do not solve it`);
      assert.ok(S.op === '=' ? equivalent(v0, values(S)) : same(v0, values(S)), `${src}: solving changed the ${S.op === '=' ? 'solutions' : 'value'}`);
      assert.equal(strip(G.stateHTML(S)), want, `${src}`);
      for (let k = 0; k < 4; k++) fuzz(r.S, 30, src);   // random play keeps the value too
    }
  });
}

test('typing: the parser refuses what the game cannot do, with a reason', () => {
  for (const [src, err] of [['x=4=5', 'pTwoEq'], ['2x+y=5', 'pEqLetters'], ['x/3+2=5', 'pFracSum'], ['3=4', 'pEqNoLetter'], ['3a + ', 'pMissing'], ['(x+2', 'pParen'], ['x^', 'pPower'], ['', 'pEmpty'], ['2x ? 3', 'pChar']])
    { assert.equal(G.parseProblem(src).err, err, src); assert.ok(hasText(err), err); }
  assert.equal(G.guessGoal('x^2+5x+6'), 'factor');
  assert.equal(G.guessGoal('3x+5=20'), 'solve');
  assert.equal(G.guessGoal('(x+3)(x-2)'), 'simplify');
});

test('no magic: the minus in front of brackets stays until the player opens them', () => {
  const S = G.parseProblem('-(x-3)').S;
  assert.equal(strip(G.stateHTML(S)), '−(x − 3)');
  const br = S.parts[0].num[0].f[0];
  const r = G.opExplode(S, br.id); G.normalize(S);
  assert.equal(r.ok, 'unwrapNeg'); assert.equal(strip(G.stateHTML(S)), '−x + 3');
});

test('no magic: (a+b)² is opened by exploding it into (a+b)·(a+b), never straight to a² + b²', () => {
  const S = G.parseProblem('(a+b)^2').S;
  const sq = S.parts[0].num[0].f[0];
  assert.equal(G.opExplode(S, sq.id).ok, 'explodeGroup'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), '(a + b)(a + b)');
});

test('putting outside brackets takes only from the two tapped terms, and the first sign comes along', () => {
  let S = G.parseProblem('2x + 2y + 2z', 'factor').S;
  const [t0, t1] = S.parts[0].num;
  G.opPair(S, t0.f[0].id, t1.f[0].id); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), '2(x + y) + 2z');
  S = G.parseProblem('-3x + 6', 'factor').S;
  G.opExplode(S, S.parts[0].num[1].f[0].id); G.normalize(S);
  const three = S.parts[0].num[1].f.find(f => f.v === 3);
  const r = G.opPair(S, S.parts[0].num[0].f[0].id, three.id); G.normalize(S);
  assert.equal(r.ok, 'factorNeg'); assert.equal(strip(G.stateHTML(S)), '−3(x − 2)');
});

test('splitting a term in two keeps its total: 5x = 2x + 3x, and refuses 0 or the whole', () => {
  const S = G.parseProblem('x^2+5x+6', 'factor').S;
  const mid = S.parts[0].num[1];
  assert.equal(G.opSplitTwo(JSON.parse(JSON.stringify(S)), mid.id, 0).no, 'splitTwoNo');
  assert.equal(G.opSplitTwo(JSON.parse(JSON.stringify(S)), mid.id, 5).no, 'splitTwoNo');
  assert.equal(G.opSplitTwo(S, mid.id, 2).ok, 'splitTwo'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), 'x^2 + 2x + 3x + 6');
  assert.equal(G.hint(S).k, 'hExplodeVar');   // work on x² + 2x first, not on 2x + 3x
});

test('the hidden 1: −x explodes to −1·x, the 1 taps away again, and a shown 1 is never a finished answer', () => {
  const S = G.buildLevel(25);   // x² − x − 12
  const x = S.parts[0].num[1].f[0];
  assert.equal(G.opExplode(S, x.id).ok, 'explodeOne'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), 'x^2 − 1x − 12');
  const one = S.parts[0].num[1].f[0];
  assert.equal(one.v, 1);
  assert.equal(G.opExplode(S, one.id).ok, 'hideOne'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), 'x^2 − x − 12');
  const T = G.parseProblem('3x').S;   // a term that already has a number: x stays an atom
  assert.equal(G.opExplode(T, T.parts[0].num[0].f[1].id).no, 'atom');
  const U = G.parseProblem('x + y').S;
  G.opExplode(U, U.parts[0].num[0].f[0].id); G.normalize(U);
  assert.equal(G.isClean(U), false); assert.equal(G.hint(U).k, 'hHideOne');
});

test('equations: a term only crosses the = by doing the same to both sides', () => {
  const S = G.parseProblem('3x+5=20').S;
  const five = S.parts[0].num[1].f[0], twenty = S.parts[1].num[0].f[0];
  assert.equal(G.opPair(S, five.id, twenty.id).no, 'diffSides');                  // no "move it across"
  assert.equal(G.termPair(S, S.parts[0].num[1].id, S.parts[1].num[0].id).no, 'diffSides');
  assert.equal(G.opBalance(S, '-', G.T([G.N(5)])).ok, 'balance'); G.normalize(S);
  assert.equal(strip(G.stateHTML(S)), '3x + 5 − 5 = 20 − 5');                      // written out, then combined by the player
  assert.equal(G.opBalance(S, '·', G.T([G.V('x')])).no, 'balanceLetter');          // could be multiplying by 0
  assert.equal(G.opBalance(S, ':', G.T([G.N(0)])).no, 'balanceDivZero');
  const F = G.parseProblem('x/3+2=5'); assert.equal(F.err, 'pFracSum');
  const H = G.parseProblem('x/3=4').S;
  assert.equal(G.opBalance(H, '+', G.T([G.N(1)])).no, 'balanceFrac');             // fractions first
});
