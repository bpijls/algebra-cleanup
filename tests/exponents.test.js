// Negative and half exponents: the rules that keep them honest (no magic).
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, strip } = require('./load');
const G = load();
const ids = S => { const out = []; G.walk(S, L => L.kind === 'f' && out.push(L.f)); return out; };
const play = (S, fn) => { const r = fn(S); G.normalize(S); return r; };

test('a⁵ · a⁻² does not merge: a⁻² is seen as 1/a² first', () => {
  const S = G.parseProblem('a^5·a^-2').S;
  const [x, y] = ids(S);
  const r = G.pairCheck(S, G.locate(S, x.id), G.locate(S, y.id));
  assert.equal(r.type, 'fizzle'); assert.equal(r.msg, 'mixedSign');
  const e = play(S, s => G.opExplode(s, y.id));
  assert.equal(e.ok, 'negPower');
  assert.equal(strip(G.stateHTML(S)), 'a^5[1/a^2');           // 1/a² first, not straight to a⁵/a²
  const q = S.parts[0].num[0].f.find(f => f.k === 'q');
  const m = play(S, s => G.opPair(s, x.id, q.id));            // then a⁵ is multiplied into the fraction by hand
  assert.equal(m.ok, 'intoFrac');
  assert.equal(strip(G.stateHTML(S)), '[a^5/a^2');
});

test('two negative powers are two fractions, multiplied top by top and bottom by bottom', () => {
  const S = G.parseProblem('a^-2·a^-3').S;
  ids(S).forEach(f => play(S, s => G.opExplode(s, f.id)));
  assert.equal(strip(G.stateHTML(S)), '[1/a^2[1/a^3');
  const [p, q] = S.parts[0].num[0].f;
  assert.equal(play(S, s => G.opPair(s, p.id, q.id)).ok, 'mergeGroup');
  assert.equal(strip(G.stateHTML(S)), '[1/a^2a^3');
});

test('against a bar you can see, a negative power is 1/a³ first, then its bottom goes across by hand', () => {
  const S = G.parseProblem('a^-3/(2a^2)').S;
  play(S, s => G.opExplode(s, ids(s)[0].id));
  assert.equal(strip(G.stateHTML(S)), '[[1/a^3/2a^2');               // a fraction on a fraction
  assert.equal(G.isClean(S), false);
  assert.equal(G.whyNotDone(S).k, 'nyFracOnFrac');
  const a3 = ids(S).find(f => f.k === 'v' && f.e === 3), two = ids(S).find(f => f.k === 'n' && f.v === 2);
  assert.equal(play(S, s => G.opPair(s, a3.id, two.id)).ok, 'fracOnTop');
  assert.equal(strip(G.stateHTML(S)), '[1/2a^2a^3');
});

test('below the bar: dividing by 1/a² is multiplying by a²', () => {
  const S = G.parseProblem('6/a^-2').S;
  play(S, s => G.opExplode(s, ids(s).find(f => f.k === 'v').id));
  assert.equal(strip(G.stateHTML(S)), '[6/[1/a^2');
  const a2 = ids(S).find(f => f.k === 'v'), six = ids(S).find(f => f.k === 'n' && f.v === 6);
  assert.equal(play(S, s => G.opPair(s, six.id, a2.id)).ok, 'fracBelow');   // either order
  assert.equal(strip(G.stateHTML(S)), '6a^2');
});

test('a negative power in a sum becomes a fraction of its own', () => {
  const S = G.parseProblem('x^-1+3').S;
  play(S, s => G.opExplode(s, ids(s)[0].id));
  assert.equal(strip(G.stateHTML(S)), '[1/x + 3');
});

test('a half is a root; three halves are a whole and a half', () => {
  const S = G.parseProblem('a^(3/2)').S;
  assert.equal(play(S, s => G.opExplode(s, ids(s)[0].id)).ok, 'halfSplit');
  const half = ids(S).find(f => f.e === 0.5);
  assert.equal(play(S, s => G.opExplode(s, half.id)).ok, 'halfRoot');
  assert.equal(strip(G.stateHTML(S)), 'a√a');
});

test('written back as a power: 1/a² = a⁻² and √a = a^½, only when exponents are on', () => {
  const S = Object.assign(G.parseProblem('3/a^2').S, { exps: true });
  const a = ids(S).find(f => f.k === 'v');
  assert.equal(play(S, s => G.opToNeg(s, a.id)).ok, 'toNeg');
  assert.equal(G.stateHTML(S).includes('<sup>−2</sup>'), true);
  const R = Object.assign(G.parseProblem('√a').S, { exps: true });
  assert.equal(play(R, s => G.opToHalf(s, ids(s)[0].id)).ok, 'toHalf');
  const off = G.parseProblem('3/a^2').S;   // an ordinary fraction level: no such button
  assert.equal(G.opToNeg(off, ids(off).find(f => f.k === 'v').id), null);
});

test('merging halves and taking a letter out of a root write their condition', () => {
  const S = G.parseProblem('a^(1/2)·a^(1/2)').S;
  const [x, y] = ids(S);
  assert.equal(play(S, s => G.opPair(s, x.id, y.id)).ok, 'mergeHalf');
  assert.deepEqual(S.conds.map(c => c.rel), ['ge']);
  const R = G.parseProblem('√(a·a·3)').S;
  const as = ids(R).filter(f => f.k === 'v');
  assert.equal(play(R, s => G.opPair(s, as[0].id, as[1].id)).ok, 'rootOutIf');
  assert.equal(strip(G.stateHTML(R)), 'a√3');
});

test('Done? names what is left: a negative power, or (as a power) a bar or a root', () => {
  assert.equal(G.whyNotDone(G.parseProblem('a^-2').S).k, 'nyNegPower');
  assert.equal(G.whyNotDone(G.parseProblem('a^(1/2)').S).k, 'nyHalfPower');
  assert.equal(G.whyNotDone(Object.assign(G.parseProblem('1/a^2').S, { exps: true, asPower: true })).k, 'nyAsBar');
  assert.equal(G.whyNotDone(Object.assign(G.parseProblem('√a').S, { exps: true, asPower: true })).k, 'nyAsRoot');
  assert.equal(G.isClean(Object.assign(G.parseProblem('a^-2').S, { asPower: true })), true);
});

test('a bracket around one letter is no bracket: (a)⁻³ is a⁻³, (−a)³ is −a³; (a²)³ stays to explode', () => {
  const show = s => strip(G.stateHTML(G.parseProblem(s).S));
  assert.equal(show('(a)^-3'), 'a−3');
  assert.equal(show('(-a)^3'), '−a^3');
  assert.equal(show('(-a)^2'), 'a^2');
  assert.equal(show('(a^2)^3'), '(a^2)^3');
  assert.equal(show('(-2a)^3'), '−(2a)^3');
});
