// Golden hint traces: the characterisation net for refactoring. For every level, every corpus exercise,
// the generic forms and a fixed-seed set of practice problems, the whole hint path (hint key, move result,
// the state after it, and why Done? would refuse it) must stay exactly as recorded.
// After a deliberate behaviour change: GOLDEN=update npm test, and review the diff of tests/golden/traces.json.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, strip } = require('./load');
const { CHAPTERS } = require('./corpus-data');

const FILE = path.join(__dirname, 'golden', 'traces.json');
const GENERIC = ['ax=b', 'ax+b=c', 'ax+b=cx+d', 'ax-b=cx', 'a(x-b)=cx', '3x+a=x+b', 'x/a=b', 'x^2=a', '(x+p)^2=q',
  '(x-a)(x-b)=0', 'px^2+qx=0', 'x^2+2px+q=0', 'x^2+px+q=0', 'ax^2+bx+c=0'];
const TOPICS = ['powers', 'like', 'frac', 'open', 'double', 'square', 'trinomial', 'factor', 'equations', 'quadratic', 'generic', 'mixed'];

function seeded(seed) {   // mulberry32 as Math.random (the generators use it); record() puts the real one back
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function trace(G, S) {
  const show = X => strip(G.stateHTML(X));
  const lines = [show(S)];
  for (let k = 0; k < 80 && !G.isClean(S); k++) {
    const h = G.hint(S), w = G.whyNotDone(S);
    const r = G.autoSolveStep(S);
    lines.push(`${h.k}${w ? ` [${w.k}]` : ''} → ${r ? r.ok : 'stuck'} | ${show(S)}`);
    if (!r) break;
  }
  lines.push(G.isClean(S) ? 'clean' : 'NOT CLEAN');
  return lines;
}

function record() {
  const G = load(), out = {};
  G.LEVELS.forEach((_, i) => { out[`level ${i + 1}`] = trace(G, G.buildLevel(i)); });
  for (const [chapter, list] of Object.entries(CHAPTERS))
    for (const [src, , goal] of list) out[`${chapter}: ${src}`] = trace(G, G.parseProblem(src, goal || 'simplify').S);
  GENERIC.forEach(src => { out[`generic: ${src}`] = trace(G, G.parseProblem(src, 'solve').S); });
  const random = Math.random;
  TOPICS.forEach((topic, ti) => [1, 2, 3].forEach(d => {
    seeded(1000 * ti + d);
    for (let r = 0; r < 4; r++) { const S = G.makeProblem([topic], d); out[`practice ${topic} d${d} #${r}`] = S ? trace(G, S) : ['no problem']; }
  }));
  Math.random = random;
  return out;
}

test('golden hint traces are unchanged', () => {
  const now = record();
  if (process.env.GOLDEN === 'update' || !fs.existsSync(FILE)) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(now, null, 1) + '\n');
    return;
  }
  const want = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  assert.deepEqual(Object.keys(now), Object.keys(want), 'the set of traced problems changed');
  for (const key of Object.keys(want)) assert.deepEqual(now[key], want[key], key);
});
