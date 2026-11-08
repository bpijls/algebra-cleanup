// Derivatives: the rules come out of exploding, the power rule is earned, and the judge reads the slope
// numerically (a five-point difference).
const test = require('node:test');
const assert = require('node:assert/strict');
const { G, fuzz, values, same } = require('./judge');
const { strip } = require('./load');

const level = id => G.buildLevel(G.levelIndex(id));

test('x³ is exploded first; the power rule is a shortcut earned by finishing Derivatives', () => {
  const S = level('deriv.3');
  const d = S.parts[0].num[0].f[0];
  assert.equal(G.opExplode(JSON.parse(JSON.stringify(S)), d.id).no, 'dPowerLocked');
  const E = level('derivrules.1');
  assert.equal(G.opExplode(E, E.parts[0].num[0].f[0].id).ok, 'dPower'); G.normalize(E);
  assert.equal(strip(G.stateHTML(E)), '5x^4');
  const won = Object.fromEntries(G.SKILLS.deriv.levels.map(id => [id, 4]));
  assert.ok(G.earnedFor('powers', won).includes('dPower'));
  assert.ok(!G.earnedFor('deriv', won).includes('dPower'));
});

test('the judge reads a derivative as the slope', () => {
  const S = G.parseProblem("(x^3)'").S, T = G.parseProblem('3x^2').S;
  assert.ok(same(values(S), values(T)));
  assert.ok(!same(values(S), values(G.parseProblem('3x').S)));
});

test('every derivative level and practice problem is worked out by the hints, keeping its value', () => {
  const starts = G.LEVELS.filter(L => /^(deriv|derivrules)\./.test(L.id)).map(L => [L.id, level(L.id)]);
  for (const k of ['deriv', 'derivrules']) for (const d of [1, 2, 3]) for (let i = 0; i < 6; i++) starts.push([`${k} ${d}`, G.makeProblem([k], d)]);
  for (const [name, S] of starts) {
    const T = JSON.parse(JSON.stringify(S));
    assert.notEqual(G.autoSolve(T), null, `${name}: ${strip(G.stateHTML(S))}`);
    assert.ok(G.isClean(T), name);
    assert.ok(!JSON.stringify(T).includes('"k":"d"'), `${name}: a derivative is left`);
    assert.ok(same(values(S), values(T)), name);
    for (let k = 0; k < 3; k++) fuzz(S, 30, name);
  }
});
