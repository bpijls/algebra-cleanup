/* The shape of a problem, in one place. A state is one of:
   - an expression: one fraction, S.parts = [P], S.op = null
   - a pair of fractions being divided or multiplied: S.parts = [P, Q], S.op = '/' | ':' | '·'
   - an equation: S.op = '=', branches L1 = R1 ∨ L2 = R2 …, stored flat as S.parts = [L1, R1, L2, R2 …]
   Nothing outside this file reads the flat layout (p >> 1, 2·bi) or tests S.op === '=' itself. */
import { unknownOf } from './model.js';

export const isEquation = S => S.op === '=';
/* An inequality is an equation with another sign: S.rel = '<' | '>' | '≤' | '≥' (no S.rel: '='). Every balance
   move works on it; times or divided by a negative number turns the sign round, and so does swapping the sides. */
export const relOf = S => S.rel || '=';
export const isInequality = S => isEquation(S) && !!S.rel;
export const FLIP = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '=': '=' };
export const isFractionPair = S => S.parts.length === 2 && !isEquation(S);
export const branchCount = S => isEquation(S) ? S.parts.length >> 1 : 1;
export const isBranched = S => isEquation(S) && S.parts.length > 2;
export const hasBranch = (S, bi) => isEquation(S) && bi < branchCount(S);
// the branch a part (S.parts index, as in locate's L.p) belongs to, and whether it is the right-hand side
export const branchOf = p => p >> 1;
export const isRight = p => p % 2 === 1;
export const pairOf = (S, bi) => S.parts.slice(2 * bi, 2 * bi + 2);
export const eqView = (S, bi) => ({ parts: pairOf(S, bi), op: '=', goal: 'solve', unknown: unknownOf(S), ...(S.rel ? { rel: S.rel } : {}) });   // shares the tiles with S
// branch bi becomes the given parts: [L, R] to change it, [L1, R1, L2, R2 …] to split it into branches
export const setBranch = (S, bi, parts) => { S.parts.splice(2 * bi, 2, ...parts); };
