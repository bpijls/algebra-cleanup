/* The controller: loads levels and problems, plays moves (run: on a copy, then history, note, animation), and handles taps on tiles. */
import { LEVELS, SKILLS, buildLevel, skillOfLevel } from '../content/registry.js';
import { earnedFor } from '../content/progress.js';
import { normalize } from '../core/model.js';
import { partnersOf, termPair } from '../core/moves.js';
import { isEquation } from '../core/problem.js';
import { opExplode, opPair, play } from '../core/rules/engine.js';
import { makeProblem } from '../practice.js';
import { blockHTML, fx, mx } from '../render/text.js';
import { animateMoves, shake, tileRects } from './motion.js';
import { say, sayIntro } from './note.js';
import { showOwn } from './own.js';
import { $, board, snap, store, ui } from './state.js';
import { render } from './tiles.js';

export function nextProblem() {
  if (ui.mode === 'custom') return showOwn();
  ui.mode = 'practice';
  const K = SKILLS[ui.prac.skills[Math.floor(Math.random() * ui.prac.skills.length)]] || SKILLS.powers;
  ui.S = makeProblem(K.gen, ui.prac.d); ui.S.skill = K.id;
  earn(ui.S, K.id);
  startBoard();
}
// the shortcuts this player has earned (on top of any the problem brings along)
export function earn(S, skillId) {
  const e = [...new Set([...(S.earned || []), ...earnedFor(skillId, ui.done)])];
  if (e.length) S.earned = e;
}
export function startBoard() {
  ui.initial = JSON.stringify(ui.S);
  ui.history = []; ui.moves = 0; ui.sel = null; ui.born = new Set(); ui.hintIds = new Set(); ui.won = false; ui.balancing = false;
  board.classList.remove('won');
  render(); sayIntro();
}
export function loadLevel(i) {
  ui.mode = 'levels';
  ui.lvl = i; store.set('levelId', LEVELS[i].id);
  ui.S = buildLevel(i); earn(ui.S, skillOfLevel(LEVELS[i].id)?.id); ui.history = []; ui.moves = 0; ui.sel = null; ui.born = new Set(); ui.hintIds = new Set(); ui.won = false; ui.balancing = false;
  board.classList.remove('won');
  render(); sayIntro();
}
export function run(fn, animIds) {
  if (ui.busy || ui.won) return;
  const rects = tileRects();
  const before = snap();
  const { S: next, r } = play(ui.S, fn);   // on a copy: a refused move can't touch S
  if (!r) return false;
  if (r.no) {
    ui.sel = null; ui.hintIds = new Set(); ui.born = new Set();
    render(); say(r.no, r.p, 'warn'); shake(r.ids || []);
    return true;
  }
  ui.S = next;
  const finish = () => {
    ui.history.push(before); ui.moves++; normalize(ui.S);
    // only bracket moves (putting outside brackets, opening brackets) travel along arcs; everything else just pops
    const origins = r.arcs ? r.origins || {} : {};
    ui.lastHint = null; ui.sel = null; ui.hintIds = new Set(); ui.born = new Set((r.born || []).filter(id => !(id in origins)));
    render(); say(r.ok, r.p, 'ok');
    const ms = r.arcs ? animateMoves(rects, origins, true) : 0;
    ui.busy = ms > 0;
    // the new bracket closes around what was left only once those pieces have arrived
    const w = r.wrap != null && ms && board.querySelector(`.tile.p[data-id="${r.wrap}"]`);
    if (w) w.classList.add('wrapin');
    setTimeout(() => { ui.busy = false; }, ms);
  };
  if (r.cancel && animIds) {
    ui.busy = true;
    animIds.forEach(id => board.querySelector(`[data-id="${id}"]`)?.classList.add('vanish'));
    setTimeout(finish, 380);
  } else finish();
  return true;
}
export function onFactor(id) {
  if (ui.sel && ui.sel.t === 'f' && ui.sel.id === id) { run(s => opExplode(s, id)); return; }
  if (ui.sel && ui.sel.t === 'f') {
    const a = ui.sel.id;
    if (run(s => opPair(s, a, id), [a, id])) return;
  }
  select({ t: 'f', id });
}
export function onTerm(tid) {
  if (ui.sel && ui.sel.t === 't' && ui.sel.id === tid) {
    ui.sel = null; render(); return;
  }
  if (ui.sel && ui.sel.t === 't') { const a = ui.sel.id; run(s => termPair(s, a, tid)); return; }
  select({ t: 't', id: tid });
}
export function select(s) {
  const rects = tileRects(), folded = !!ui.block;
  ui.sel = s; ui.hintIds = new Set(); ui.born = new Set();
  render();
  if (ui.block || folded) animateMoves(rects, {}, false);   // the brackets visibly fold into blocks
  if (ui.block) return say('pickedBlock', { x: mx(fx(ui.block.L.f)), ex: mx(blockHTML(ui.block.L.terms, ui.block.key)) }, 'info');
  const has = partnersOf(ui.S, ui.sel).size > 0;
  const canExplode = s.t === 'f' && !$('btnExplode').hidden;
  if (isEquation(ui.S) && ui.S.goal !== 'prove' && !has) return say('pickedEq', {}, 'info');
  say(s.t === 'f' ? (has ? 'pickedP' : canExplode ? 'picked' : 'pickedAtom') : (has ? 'pickedTermP' : 'pickedTerm'), {}, 'info');
}
