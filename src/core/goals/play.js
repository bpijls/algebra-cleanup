/* Playing a hint: which move it stands for (autoSolve follows hints; the tests and the problem generator rely on
   that). The first entry that matches the hint plays it. */
import { opBalance, opDrag, opSwap } from '../balance.js';
import { defineHintMove } from './registry.js';
import { normalize } from '../model.js';
import { opOp, opSplitTwo } from '../moves.js';
import { opExplode, opPair } from '../rules/engine.js';

const keys = (...ks) => h => ks.includes(h.k);
// explode each hinted piece in turn (12 and 8 before cancelling a 4)
const explodeAll = (S, h) => { let r = null; for (const id of h.ids) { r = opExplode(S, id); normalize(S); if (r && r.no) break; } return r; };

defineHintMove(keys('hDiv', 'hBar', 'hJoin'), S => opOp(S));
defineHintMove(keys('hGroup', 'hOpen', 'hExplodeVar', 'hNegPower', 'hHalfPower'), (S, h) => opExplode(S, h.ids[0]));
defineHintMove(keys('hExplodeCancel', 'hExplodeNums', 'hExplodeFor', 'hExplodeRoot'), explodeAll);
defineHintMove(keys('hSumProduct', 'hSplitSquare'), (S, h) => opSplitTwo(S, h.ids[0], h.split));
defineHintMove(h => h.drag != null, (S, h) => opDrag(S, h.drag));   // the hinted piece, dragged across the =
defineHintMove(keys('hSwap'), (S, h) => opSwap(S, h.bi || 0));
defineHintMove(h => !!h.balance, (S, h) => opBalance(S, h.balance.op, h.balance.value, h.bi || 0));   // + 9, · 8 from the panel
defineHintMove(keys('hNoReal', 'hNoRealD'), () => null);   // nothing to do: no real solutions
defineHintMove(() => true, (S, h) => opPair(S, h.ids[0], h.ids[1]), { fallback: true });   // tap one piece, then the other
