// Textbook-style exercises, chapter by chapter (Dutch klas 2–3 algebra), typed the way a student would type them.
// Each one must parse, be solved by following the hints, end clean, and keep its value (judge.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const { strip } = require('./load');
const { G, values, same, fuzz, hasText, solutions, sameSolutions } = require('./judge');

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
  // the answers as the hints leave them: x = −2 ∨ x = −3 reads "x = −2 of x = −3"
  'kwadratische vergelijkingen (quadratic equations)': [
    ['x^2=49', 'x = 7 ∨ x = −7'], ['x^2=12', 'x = 2√3 ∨ x = −2√3'], ['3x^2=75', 'x = 5 ∨ x = −5'], ['x^2-9=0', 'x = 3 ∨ x = −3'],
    ['(x-2)^2=16', 'x = 6 ∨ x = −2'], ['(x+1)^2=3', 'x = √3 − 1 ∨ x = −√3 − 1'], ['(x-3)(x+4)=0', 'x = 3 ∨ x = −4'],
    ['x(x-5)=0', 'x = 0 ∨ x = 5'], ['x^2+3x=0', 'x = 0 ∨ x = −3'], ['x^2+7x+12=0', 'x = −3 ∨ x = −4'],
    ['x^2-2x-15=0', 'x = 5 ∨ x = −3'], ['x^2+x=6', 'x = 2 ∨ x = −3'], ['x^2+4x-1=0', 'x = √5 − 2 ∨ x = −√5 − 2'],
    ['x^2-6x+2=0', 'x = √7 + 3 ∨ x = −√7 + 3'], ['x^2+3x+1=0', 'x = [√5 − 3/2 ∨ x = [−√5 − 3/2'],
    ['2x^2+3x-1=0', 'x = [√17 − 3/4 ∨ x = [−√17 − 3/4'], ['x^2+6x+9=0', 'x = −3'],
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
      assert.ok(S.op === '=' ? sameSolutions(solutions(r.S), solutions(S)) : same(v0, values(S)), `${src}: solving changed the ${S.op === '=' ? 'solutions' : 'value'}`);
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

test('a lone letter is an atom: x does not explode into 1·x', () => {
  const S = G.buildLevel(25);   // x² − x − 12
  assert.equal(G.opExplode(S, S.parts[0].num[1].f[0].id).no, 'atom');
  const T = G.parseProblem('3x').S;
  assert.equal(G.opExplode(T, T.parts[0].num[0].f[1].id).no, 'atom');
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

test('equations: dragging a piece across the = undoes it on both sides', () => {
  const drag = (src, pick) => { const S = G.parseProblem(src).S; const r = G.opDrag(S, pick(S)); if (r && r.ok) G.normalize(S); return r && r.no ? r.no : strip(G.stateHTML(S)); };
  assert.equal(drag('3x+5=20', S => S.parts[0].num[1].f[0].id), '3x + 5 − 5 = 20 − 5');     // a term in a sum: take it away
  assert.equal(drag('3x+5=20', S => S.parts[0].num[0].f[0].id), '3x + 5 − 3x = 20 − 3x');   // the 3 of 3x in a sum is still the term
  assert.equal(drag('3x=15', S => S.parts[0].num[0].f[0].id), '[3x/3 = [15/3');                // on its own: divide by the number
  assert.equal(drag('-3x=15', S => S.parts[0].num[0].f[0].id), '[3x/3 = [−15/3');            // by −3, so x keeps no minus
  assert.equal(drag('x/3=4', S => S.parts[0].den[0].f[0].id), '[3x/3 = 3·4');                   // below the bar: multiply
  assert.equal(drag('-x=4', S => S.parts[0].num[0].f[0].id), 'x = −4');                      // a lone −x: divide by −1
  assert.equal(drag('x/3=4', S => S.parts[0].num[0].f[0].id), 'balanceFrac');                // fractions first
  assert.equal(drag('2(x+3)=4x-2', S => S.parts[0].num[0].f[1].terms[0].f[0].id), 'dragBracket');
  // the hint's piece, dragged, does exactly the hinted move
  for (const src of ['x+3=7', '3x=12', '5x+3=2x+12', 'x/3=4', '-x=4', '7=2x+1', '5x+3=2x', '4x-3=2x+6']) {
    let S = G.parseProblem(src).S;
    for (let k = 0; k < 40 && !G.isSolved(S); k++) {
      const h = G.hint(S);
      if (h.drag != null) {
        const a = JSON.parse(JSON.stringify(S)), b = JSON.parse(JSON.stringify(S));
        G.opDrag(a, h.drag); G.opBalance(b, h.balance.op, h.balance.value); G.normalize(a); G.normalize(b);
        assert.equal(strip(G.stateHTML(a)), strip(G.stateHTML(b)), `${src}: dragging the hinted piece differs from the hint`);
      }
      assert.ok(G.autoSolveStep(S), `${src}: stuck`);
    }
    assert.ok(G.isSolved(S), `${src} not solved`);
  }
});
