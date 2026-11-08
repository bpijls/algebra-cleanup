/* The rule engine: asks the pair rules what tapping A then B means and runs the action; explodes a piece
   by its kind; plays a move on a copy. The rules themselves are registered in pair.js and explode.js. */
import './explode.js';
import './pair.js';
import { locate } from '../model.js';
import { ACTIONS, EXPLODE, RULES, SCOPES, defineMove } from './registry.js';

export function pairCheck(S, A, B) {
  const [scope] = SCOPES.find(([, test]) => test(S, A, B));
  for (const rule of RULES[scope]) {
    const v = rule.match(S, A, B);
    if (v) return v;
  }
  return { type: 'none' };
}

export function opPair(S, aId, bId) {
  const A = locate(S, aId), B = locate(S, bId);
  const v = pairCheck(S, A, B);
  if (v.type === 'fizzle') return { no: v.msg, p: v.p || {}, ids: [aId, bId] };
  if (v.type === 'none') return null;
  return ACTIONS[v.type](S, A, B, v, [aId, bId]);
}

// tapping a piece twice: what it is made of (12 → 2·2·3, x³ → x·x·x, (a + b)² → (a + b)(a + b), 3(x + 2) → 3x + 3·2)
export function opExplode(S, id) {
  const L = locate(S, id);
  return EXPLODE[L.f.k](S, L, id);
}

// a move tried on a copy: S itself never changes. { S: the state after it (or S when refused or meaningless), r }
export function play(S, move) {
  const next = JSON.parse(JSON.stringify(S));
  const r = move(next);
  return { S: r && r.ok ? next : S, r };
}

defineMove('explode', 'piece', opExplode);
defineMove('pair', 'pieces', opPair);
