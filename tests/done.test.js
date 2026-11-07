// The player decides when it's done (the Done? button). whyNotDone must refuse every unfinished state
// with an explanation in both languages, and accept exactly the clean ones.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, strip } = require('./load');
const G = load();

const starts = () => {
  const list = G.LEVELS.map((_, i) => G.buildLevel(i));
  for (const topic of Object.keys(G.GEN)) for (const d of [1, 2, 3]) for (let r = 0; r < 6; r++) list.push(G.makeProblem([topic], d));
  return list;
};

test('Done? says what is left on every step of the way, and accepts the end', () => {
  for (const S of starts()) {
    const T = JSON.parse(JSON.stringify(S));
    for (let n = 0; n < 80 && !G.isClean(T); n++) {
      const w = G.whyNotDone(T);
      assert.ok(w && w.k, `no reason given for ${strip(G.stateHTML(T))}`);
      for (const lang of ['en', 'nl']) assert.ok(G.I18N[lang][w.k], `${w.k} has no ${lang} text`);
      if (G.autoSolveStep(T) == null) break;
    }
    assert.ok(G.isClean(T));
    assert.equal(G.whyNotDone(T), null, `clean but refused: ${strip(G.stateHTML(T))}`);
  }
});

test('Done? names the right problem', () => {
  const why = src => { const r = G.parseProblem(src, src.includes('=') ? 'solve' : 'simplify'); return G.whyNotDone(r.S).k; };
  assert.equal(why('2a + 3a'), 'nyLike');
  assert.equal(why('a^2 a^3'), 'nyTidy');
  assert.equal(why('3(x + 2)'), 'nyBracket');
  assert.equal(why('6x/3'), 'nyCancelNum');
  assert.equal(why('x^2/x'), 'nyCancelVar');
  assert.equal(why('3x + 5 = 2x'), 'nyEqBoth');
  assert.equal(why('3x = 12'), 'nyEqAlone');
  const f = src => G.whyNotDone(G.parseProblem(src, 'factor').S).k;
  assert.equal(f('x^2 + 5x + 6'), 'nyTerms');
  assert.equal(f('2(2x + 4)'), 'nyShared');
});

test('putting a shared bracket outside reads as a block', () => {
  const S = G.buildLevel(24);
  for (let i = 0; i < 5; i++) G.autoSolveStep(S);
  assert.equal(strip(G.stateHTML(S)), 'x(x + 2) + 3(x + 2)');
  const h = G.hint(S), r = G.opPair(S, h.ids[0], h.ids[1]);
  assert.equal(r.ok, 'factorBlock');
  assert.equal(strip(r.p.bex), 'xx + 2 + 3x + 2');   // x·[x+2] + 3·[x+2], the block is a styled span
  assert.ok(r.p.bex.includes('class="bk"'));
  assert.equal(strip(G.stateHTML(S)), '(x + 2)(x + 3)');
});
