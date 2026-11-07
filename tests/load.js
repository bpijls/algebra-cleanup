// Loads the browser scripts (plain globals, no modules) into a sandbox so tests can call them.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function load() {
  const ctx = vm.createContext({ console });
  for (const f of ['core.js', 'practice.js', 'parse.js', 'i18n.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', f), 'utf8'), ctx, { filename: f });
  return vm.runInContext(`({ LEVELS, buildLevel, autoSolve, autoSolveStep, makeProblem, GEN, hint, normalize, isClean, stateHTML, locate,
    opPair, opExplode, opSweep, opOp, opBar, termPair, walk, opSplitTwo, parseProblem, guessGoal, isFactored, isSolved, opBalance, opSwap, opDrag, dragBalance, whyNotDone, blockHTML, sumKey, opRoot, opZero, quadOf, isZeroSide, Rt, letters, cloneF, I18N, F, T, N, V, G, Pr })`, ctx);
}
const strip = h => h.replace(/<sup>(\d+)<\/sup>/g, '^$1').replace(/<span class="nn">/g, '[').replace(/<span class="nd">/g, '/').replace(/<[^>]+>/g, '');
module.exports = { load, strip };
