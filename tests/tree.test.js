// The skill tree: every skill's prerequisites exist and form no cycle, every level belongs to exactly one skill,
// every skill's practice generators make solvable problems, and old progress (by level number) carries over.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load');
const G = load();

test('skill tree: prerequisites exist, no cycles, every level in exactly one skill', () => {
  const ids = G.SKILL_LIST.map(K => K.id);
  for (const K of G.SKILL_LIST) {
    for (const r of K.requires) assert.ok(G.SKILLS[r], `${K.id} needs unknown skill ${r}`);
    for (const id of K.levels) assert.ok(G.LEVELS.some(L => L.id === id), `${K.id} lists unknown level ${id}`);
    assert.ok(K.title.en && K.title.nl && K.blurb.en && K.blurb.nl, `${K.id} needs English and Dutch text`);
    for (const g of K.gen) assert.equal(typeof G.GEN[g], 'function', `${K.id}: no generator ${g}`);
  }
  const seen = new Set(), stack = new Set();
  const visit = id => { if (stack.has(id)) assert.fail('cycle through ' + id); if (seen.has(id)) return; stack.add(id); G.SKILLS[id].requires.forEach(visit); stack.delete(id); seen.add(id); };
  ids.forEach(visit);
  for (const L of G.LEVELS) assert.equal(G.SKILL_LIST.filter(K => K.levels.includes(L.id)).length, 1, `level ${L.id} is in one skill`);
  // the rows: a skill sits below every skill it needs
  const row = {}; G.tiers().forEach((r, i) => r.forEach(K => { row[K.id] = i; }));
  for (const K of G.SKILL_LIST) for (const r of K.requires) assert.ok(row[r] < row[K.id], `${r} above ${K.id}`);
  assert.deepEqual(G.tiers()[0].map(K => K.id).sort(), ['logic', 'numfrac', 'powers']);   // three roots: powers, number fractions, logic
});

test('skill tree: soft lock, next level, newly opened skills', () => {
  const none = {};
  assert.ok(G.skillOpen(G.SKILLS.powers, none));
  assert.deepEqual(G.needs(G.SKILLS.sumproduct, none), ['double', 'factor']);
  assert.equal(G.suggested(none).id, 'powers');
  const powers = Object.fromEntries(G.SKILLS.powers.levels.map(id => [id, 3]));
  assert.deepEqual(G.newlyOpen(none, powers).map(K => K.id).sort(), ['fracpow', 'like', 'sqrt']);
  assert.equal(G.nextInSkill('powers.2'), 'powers.3');
  assert.equal(G.nextInSkill('powers.6'), null);
  assert.equal(G.nextLevelIn(G.SKILLS.powers, { 'powers.1': 4 }), 'powers.2');
});

test('skill tree: old progress by level number migrates to level ids', () => {
  const { won, level } = G.migrate({ 0: 3, 6: 5, 48: 2 }, 47);
  assert.deepEqual(won, { 'powers.1': 3, 'powers.5': 5, 'logs.1': 2 });
  assert.equal(level, 'genquad.4');
  // the old order is the order the levels are still registered in, so a level's number meant the same level
  assert.deepEqual(G.LEVELS.slice(0, G.LEGACY_ORDER.length).map(L => L.id), G.LEGACY_ORDER);
  assert.equal(G.migrate({}, 999).level, 'powers.1');
});

test('skill tree: every skill can be practised (its generators make problems the hints solve)', () => {
  for (const K of G.SKILL_LIST) for (const d of [1, 2, 3]) {
    const S = G.makeProblem(K.gen, d);
    assert.ok(S, `${K.id} d${d}`);
  }
});
