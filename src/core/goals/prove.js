/* The prove goal: show that an identity holds, L = R for every value of the letters. Each side is rewritten
   with the ordinary moves until both read the same; nothing is done to both sides (that would take for granted
   what is to be shown), so the balance moves refuse here. A topic adds the tactics that look across the =
   (goniometry: cos²a = 1 − sin²a when the other side has sin² and not cos²). */
import { DONE, GOALS, addTactic, defineGoal, defineHintMove, runTactics } from './registry.js';
import { sumKey } from '../kinds/sums.js';

// both sides read the same, whatever the order of their terms and pieces
export const proven = S => S.parts.length === 2 && sumKey(S.parts[0].num) === sumKey(S.parts[1].num) && sumKey(S.parts[0].den) === sumKey(S.parts[1].den);
// a side on its own, as a simplify problem; it shares its tiles with S, so a hint on it is a hint on S
export const proveSide = (S, p) => ({ parts: [S.parts[p]], op: null, goal: 'simplify', conds: S.conds, allowB: S.allowB });

// tidy each side as far as it goes, the left one first
export function eachSide(S) {
  for (let p = 0; p < S.parts.length; p++) { const h = runTactics(GOALS.simplify.tactics, proveSide(S, p)); if (h !== DONE) return h; }
  return null;
}
// nothing left to try and the sides still differ: say so instead of claiming it is done
export const stuck = S => proven(S) ? null : { k: 'hProveStuck', ids: [] };

defineGoal('prove', { isDone: proven, tactics: [eachSide, stuck] });
defineHintMove(h => h.k === 'hProveStuck', () => null);
export const addProveTactic = (tactic) => addTactic('prove', tactic, { before: 'stuck' });
