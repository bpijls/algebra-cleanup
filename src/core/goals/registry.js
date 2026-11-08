/* Goals and their strategies (a leaf module: no imports, so registering works in any load order).

   A goal says when a problem is finished and how to get there:
     defineGoal(id, { isDone(S), tactics: [tactic …] })
   A tactic looks at the state and returns a hint ({ k, p, ids, … }) or nothing; the goal's hint is the first
   tactic's answer. An equation is solved branch by branch, each with the first strategy that applies to it:
     defineBranchStrategy(id, applies(E), hint(E))
   And a hint is played (autoSolve, tests) by the first hint move that matches it:
     defineHintMove(matches(h), play(S, h)) */
export const GOALS = {};
export const defineGoal = (id, goal) => { GOALS[id] = { id, ...goal }; };
export const goalOf = S => GOALS[S.goal] || GOALS.simplify;
// a tactic added to a goal from elsewhere (a topic), before the named tactic or at the end
export const addTactic = (goal, tactic, { before } = {}) => {
  const list = GOALS[goal].tactics, at = before ? list.findIndex(t => t.name === before) : -1;
  list.splice(at < 0 ? list.length : at, 0, tactic);
};

export const DONE = { k: 'hDone', ids: [] };
export const runTactics = (tactics, S) => { for (const t of tactics) { const h = t(S); if (h) return h; } return DONE; };

export const BRANCH_STRATEGIES = [];
export const defineBranchStrategy = (id, applies, hint) => { BRANCH_STRATEGIES.push({ id, applies, hint }); };

// a fallback (matches everything) stays behind the moves registered later, so a topic's hint move is reached
export const HINT_MOVES = [];
export const defineHintMove = (matches, play, { fallback = false } = {}) => {
  const at = HINT_MOVES.findIndex(m => m.fallback);
  HINT_MOVES.splice(fallback || at < 0 ? HINT_MOVES.length : at, 0, { matches, play, fallback });
};
