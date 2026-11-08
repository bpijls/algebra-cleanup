/* The rule registry for taps on tiles (a leaf module: no imports, so registering works in any load order).

   Tapping piece A, then piece B: the pair rules decide what that means. Each rule sits in a scope (where
   A and B are relative to each other) and is tried in order; the first that has an opinion gives a verdict:
     { type: 'fizzle', msg, p }   refused, with the reason (the tiles shake, the note explains)
     { type: 'none' }             not a meaningful pair (the selection just moves)
     { type: <action> , … }       a move: the action registered under that type carries it out
   Splitting "is this allowed?" (rules) from "do it" (actions) lets the UI ask the first question alone
   (partnersOf glows the pieces that would combine) and lets a new kind or topic add a rule without
   touching the others.

   Exploding (tapping a piece twice) is looked up by the piece's kind: defineExplode(k, fn). */
// where B is, seen from A; the first scope whose test holds is the one whose rules are tried
export const SCOPES = [
  ['parts', (S, A, B) => A.p !== B.p],                             // different fractions, or sides of an =
  ['sum', (S, A, B) => A.terms === B.terms],                       // in the same sum (same term or not)
  ['bar', (S, A, B) => A.in && A.in.k === 'q' && A.in === B.in && A.qs !== B.qs],   // across the bar of a fraction in a sum
  ['wall', (S, A, B) => A.side === B.side || A.depth || B.depth],  // a bracket wall between them
  ['bar', () => true],                                             // across one fraction bar
];
export const RULES = Object.fromEntries(SCOPES.map(([s]) => [s, []]));
export const ACTIONS = {};
export const EXPLODE = {};

// a rule: match(S, A, B) returns a verdict, or nothing to let the next rule decide
export function definePairRule(scope, id, match, { before } = {}) {
  const list = RULES[scope], at = before ? list.findIndex(r => r.id === before) : -1;
  list.splice(at < 0 ? list.length : at, 0, { id, match });
}
// an action: apply(S, A, B, verdict, ids) mutates S and returns { ok, p, born, … } (or { no, … } untouched)
export const defineAction = (type, apply) => { ACTIONS[type] = apply; };
// exploding a piece of kind k: fn(S, L, id), L its locate() record
export const defineExplode = (k, fn) => { EXPLODE[k] = fn; };

/* Every move a player can make, by the gesture that makes it. The judge (tests/judge.js) tries each registered
   move with every argument its gesture allows, so a new move is fuzzed as soon as it is registered:
     piece (S, id)         a tap on one piece (twice)            board (S)             the fraction sign, the bar
     pieces (S, a, b)      a tap on two pieces                   drag (S, id | −id)    a piece (or a ²) across the =
     terms (S, a, b)       two whole terms                       branch (S, bi)        one branch of an equation
     split (S, id, k)      a term into two (k + rest)            balance (S, op, v, bi) the same on both sides
     sweep (S, ids)        a swipe across pieces */
export const MOVES = [];
// a problem type can refuse moves that only hold for numbers (logic: a + a is a, never 2a; 1 is not 2 − 1):
// defineGate((S, id) => true when move id makes no sense in S). A gated move answers null (nothing happens).
const GATES = [];
export const defineGate = g => { GATES.push(g); };
export const gated = (S, id) => GATES.some(g => g(S, id));
export const defineMove = (id, gesture, run) => { MOVES.push({ id, gesture, run: (S, ...a) => gated(S, id) ? null : run(S, ...a) }); };
