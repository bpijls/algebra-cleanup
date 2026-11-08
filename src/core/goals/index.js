/* Every goal, strategy and hint move, registered; hint(S) and playHint(S, h). */
import './simplify.js';
import './solve.js';
import './prove.js';
import './play.js';
import { DONE, GOALS, HINT_MOVES, goalOf, runTactics } from './registry.js';

// the next suggested move (an equation is solved, whatever its goal says, unless it is an identity to show)
export const hint = S => runTactics((S.op === '=' && S.goal !== 'prove' ? GOALS.solve : goalOf(S)).tactics, S);
// the move a hint stands for, played on S (mutates it); null when it has none
export function playHint(S, h) {
  if (h.k === DONE.k) return null;
  return HINT_MOVES.find(m => m.matches(h)).play(S, h);
}
