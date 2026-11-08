/* The solve goal: an equation is done when every branch is the unknown alone = a clean value. It is solved
   branch by branch; each branch gets the first strategy that applies to it (letters for numbers, quadratic,
   linear). A new kind of equation (exponential, goniometric …) is a new defineBranchStrategy. */
import { isSolved } from '../balance.js';
import { genHint, pairHint } from '../generic.js';
import { BRANCH_STRATEGIES, DONE, defineBranchStrategy, defineGoal } from './registry.js';
import { params, unknownOf } from '../model.js';
import { branchCount, eqView } from '../problem.js';
import { quadHint, quadOf } from '../quadratic.js';

export function eqHint(S) {
  if (isSolved(S)) return DONE;
  for (let b = 0; b < branchCount(S); b++) {
    const E = eqView(S, b);
    if (isSolved(E)) continue;
    for (const s of BRANCH_STRATEGIES) {
      const ctx = s.applies(E);
      if (ctx) return { ...s.hint(E, ctx), bi: b };
    }
  }
  return DONE;
}

// a, b, c … in it besides the unknown: ax + b = cx + d, ax² + bx + c = 0
defineBranchStrategy('generic', E => params(E).length > 0, E => genHint(E, unknownOf(E)));
// an x² term: roots, product = 0, completing the square
defineBranchStrategy('quadratic', E => { const q = quadOf(E); return q && Math.abs(q.a) > 1e-9 ? q : null; }, (E, q) => quadHint(E, q));
// everything else: the balance method
defineBranchStrategy('linear', () => true, E => pairHint(E));

defineGoal('solve', { isDone: isSolved, tactics: [eqHint] });
