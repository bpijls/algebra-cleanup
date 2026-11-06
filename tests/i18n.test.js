// Every key exists in both languages, once. A duplicate key silently overwrites the first one
// (the Split button once showed a move message because `split` was defined twice).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./load');

test('i18n: same keys in English and Dutch, none defined twice', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/i18n.js'), 'utf8');
  const [, en, nl] = src.split(/\n  (?:en|nl): \{/);
  for (const [name, block] of [['en', en], ['nl', nl]]) {
    const keys = [...block.matchAll(/(?:^|[\s,{])(\w+): '/g)].map(m => m[1]);
    const dup = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dup, [], `${name}: keys defined twice`);
  }
  const { I18N } = load();
  assert.deepEqual(Object.keys(I18N.en).sort(), Object.keys(I18N.nl).sort());
});
