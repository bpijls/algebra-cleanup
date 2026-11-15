/* The tool bar and menu buttons. */
import { opBalance, opSwap } from '../core/balance.js';
import { whyNotDone } from '../core/done.js';
import { hint } from '../core/goals/index.js';
import { lang, setLang } from '../i18n.js';
import { bal, balBounds, balFromHint, balSet, balSync, balTerm } from './balance.js';
import { applyShortcuts, loadLevel, nextProblem, run } from './controller.js';
import { showMap } from './map.js';
import { say, sayIntro } from './note.js';
import { showOwn } from './own.js';
import { showPractice } from './practice.js';
import { closeSheet, win } from './sheets.js';
import { $, board, store, ui } from './state.js';
import { render } from './tiles.js';

$('btnSwap').onclick = () => { if (ui.busy || ui.won) return; ui.balancing = false; run(s => opSwap(s, ui.balBranch)); };
document.querySelectorAll('#balOps [data-bop]').forEach(b => { b.onclick = () => balSet(b.dataset.bop, null); });
$('balLets').addEventListener('click', e => { const b = e.target.closest('[data-let]'); if (!b) return; bal.lets[b.dataset.let] = ((bal.lets[b.dataset.let] || 0) + 1) % 3; balSync(true); });
$('balRange').addEventListener('input', e => balSet(null, +e.target.value));
$('balLess').onclick = () => { const [lo] = balBounds(); balSet(null, Math.max(lo, bal.v - 1)); };
$('balMore').onclick = () => { const [, hi] = balBounds(); balSet(null, Math.min(hi, bal.v + 1)); };
$('balGo').onclick = () => {
  if (ui.busy || ui.won || !ui.balancing) return;
  const v = balTerm();
  run(s => { const r = opBalance(s, bal.op, v, ui.balBranch); if (r && !r.no) ui.balancing = false; return r; });
};
$('btnUndo').onclick = () => {
  if (!ui.history.length || ui.busy) return;
  const prev = JSON.parse(ui.history.pop()); ui.S = prev.S; ui.moves = prev.moves;
  ui.sel = null; ui.born = new Set(); ui.hintIds = new Set(); ui.won = false; ui.balancing = false; board.classList.remove('won');
  render(); say(null, null, 'info', { en: 'One step back.', nl: 'Eén stap terug.' });
};
$('btnHint').onclick = () => {
  if (ui.won) return;
  const h = hint(ui.S); ui.lastHint = h; ui.sel = null; ui.born = new Set(); ui.hintIds = new Set(h.k === 'hDone' ? ['done'] : h.ids); ui.hintIds.bi = h.bi;
  if (ui.balancing && h.balance && h.drag == null) balFromHint();
  render(); say(h.k, h.p, 'info');
};
// winning is the player's call: they press Done? when they think nothing is left
$('btnDone').onclick = () => {
  if (ui.busy || ui.won) return;
  ui.sel = null; ui.born = new Set(); ui.hintIds = new Set();
  const why = whyNotDone(ui.S);
  render();
  if (!why) return win();
  say(why.k, why.p, 'warn');
};
$('btnRestart').onclick = () => {
  if (ui.mode === 'levels') return loadLevel(ui.lvl);
  closeSheet(); ui.S = JSON.parse(ui.initial); ui.history = []; ui.moves = 0; ui.sel = null; ui.born = new Set(); ui.hintIds = new Set(); ui.won = false; ui.balancing = false;
  board.classList.remove('won'); render(); sayIntro();
};
$('btnPractice').onclick = showPractice;
$('btnSkip').onclick = () => { if (ui.busy) return; if (ui.mode === 'custom') return showOwn(); ui.session.streak = 0; nextProblem(); say('skipped', {}, 'info'); };
$('btnLang').onclick = () => {
  setLang(lang === 'nl' ? 'en' : 'nl'); store.set('lang', lang); render();
  if (ui.lastNote) say(ui.lastNote.key, ui.lastNote.p, ui.lastNote.type, ui.lastNote.raw);
  if (ui.won) win(true);
  else if (ui.sheetFn && $('sheetHost').children.length) ui.sheetFn();
};
$('btnShort').onclick = () => {
  const on = !store.get('shortcuts', false);
  store.set('shortcuts', on); applyShortcuts(ui.S); ui.sel = null; render();
  say(on ? 'shortcutsOnNote' : 'shortcutsOffNote', {}, 'info');
};
$('btnLevels').onclick = () => showMap();
$('btnOwn').onclick = () => showOwn();
