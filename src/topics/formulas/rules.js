/* Formulas with a given value: n = 10 is written in brackets everywhere n stands (a move with its own button,
   labelled by what it does: n = 10), then the number is worked out with the ordinary moves. The goal
   evaluate is simplify plus "no given letter left". */
import '../../core/goals/index.js';
import { defineGoal, defineHintMove, goalOf, runTactics } from '../../core/goals/registry.js';
import { Pr } from '../../core/kinds/bracket.js';
import { N } from '../../core/kinds/number.js';
import { T } from '../../core/kinds/sums.js';
import { isClean, locate } from '../../core/model.js';
import { defineWhy, whyNotDone } from '../../core/done.js';
import { defineMove } from '../../core/rules/registry.js';
import { mx } from '../../render/text.js';

// every place a letter stands: in each term, and inside brackets, roots, powers, fractions, logs
function replaceLetter(terms, b, make) {
  for (const t of terms) {
    t.f = t.f.map(f => f.k === 'v' && f.b === b ? make(f) : f);
    for (const f of t.f) {
      if (f.terms) replaceLetter(f.terms, b, make);
      if (f.f) replaceLetter([{ f: f.f }], b, make);
      if (f.num) { replaceLetter(f.num, b, make); replaceLetter(f.den, b, make); }
    }
  }
}
const has = (S, b) => JSON.stringify(S.parts).includes(`"k":"v","b":"${b}"`);
export function opSubstitute(S, id) {
  const L = locate(S, id);
  if (!L || L.kind !== 'f' || L.f.k !== 'v' || !S.given || S.given[L.f.b] == null) return null;
  const b = L.f.b, v = S.given[b], made = [];
  for (const P of S.parts) for (const side of ['num', 'den']) replaceLetter(P[side], b, f => { const g = Pr([T([N(Math.abs(v))], v < 0)], f.e); made.push(g.id); return g; });
  return { ok: 'substitute', p: { x: mx(`<i class="mv">${b}</i>`), ex: mx(String(v).replace('-', '−')) }, born: made };
}
defineMove('substitute', 'piece', opSubstitute);

// the hint: a given letter that is still there
function given(S) {
  if (!S.given) return null;
  for (const b of Object.keys(S.given)) if (has(S, b)) {
    let id = null;
    const find = terms => { for (const t of terms) for (const f of t.f) { if (id) return; if (f.k === 'v' && f.b === b) id = f.id; if (f.terms) find(f.terms); if (f.num) { find(f.num); find(f.den); } } };
    for (const P of S.parts) { find(P.num); find(P.den); }
    return { k: 'hSubst', p: { x: mx(`<i class="mv">${b}</i>`), v: S.given[b] }, ids: [id] };
  }
  return null;
}
const left = S => S.given && Object.keys(S.given).some(b => has(S, b));
const asSimplify = S => ({ ...S, goal: 'simplify' });
defineGoal('evaluate', {
  isDone: S => !left(S) && isClean(asSimplify(S)),
  tactics: [given, S => { const h = runTactics(goalOf({ goal: 'simplify' }).tactics, asSimplify(S)); return h.k === 'hDone' ? null : h; }],
});
defineHintMove(h => h.k === 'hSubst', (S, h) => opSubstitute(S, h.ids[0]));
defineWhy('evaluate', S => left(S) ? { k: 'nySubst' } : whyNotDone(asSimplify(S)));
