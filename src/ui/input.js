/* Input on the board: taps, swipes across tiles, keyboard. */
import { opBar, opOp, opSweep } from '../core/moves.js';
import { isEquation } from '../core/problem.js';
import { balanceDown, balanceDrop, balanceMove, balanceUp, dropAcross, setBalancing } from './balance.js';
import { onFactor, onTerm, run, select } from './controller.js';
import { setMenu } from './menu.js';
import { shake } from './motion.js';
import { say } from './note.js';
import { closeSheet } from './sheets.js';
import { $, board, ui } from './state.js';
import { render } from './tiles.js';

export const SVGNS = 'http://www.w3.org/2000/svg';
function tileAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const t = el && el.closest('#board .tile');
  return t && !t.classList.contains('p') && !t.classList.contains('pw') ? t : null;
}
function clearSweep() {
  if (ui.drag && ui.drag.svg) ui.drag.svg.remove();
  board.querySelectorAll('.swept').forEach(el => el.classList.remove('swept'));
}
board.addEventListener('pointerdown', e => {
  if (ui.busy || ui.won || e.button > 0) return;
  if (ui.balancing) { balanceDown(e); return; }
  ui.drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, id: e.pointerId, active: false, ids: [], pts: [] };
});
board.addEventListener('pointermove', e => {
  if (ui.bdrag) { balanceMove(e); return; }
  if (!ui.drag || e.pointerId !== ui.drag.id) return;
  if (!ui.drag.active) {
    if (Math.hypot(e.clientX - ui.drag.x, e.clientY - ui.drag.y) < 10) return;
    ui.drag.active = true;
    try { board.setPointerCapture(e.pointerId); } catch {}
    const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'trail');
    const line = document.createElementNS(SVGNS, 'polyline'); svg.append(line);
    board.append(svg); ui.drag.svg = svg; ui.drag.line = line;
    sample(ui.drag.x, ui.drag.y);
  }
  // sample along the segment so fast swipes don't skip tiles
  const steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - ui.drag.lx, e.clientY - ui.drag.ly) / 8));
  for (let i = 1; i <= steps; i++) sample(ui.drag.lx + (e.clientX - ui.drag.lx) * i / steps, ui.drag.ly + (e.clientY - ui.drag.ly) * i / steps);
  ui.drag.lx = e.clientX; ui.drag.ly = e.clientY;
});
function sample(x, y) {
  const br = board.getBoundingClientRect();
  ui.drag.pts.push(`${x - br.left},${y - br.top}`);
  ui.drag.line.setAttribute('points', ui.drag.pts.join(' '));
  const t = tileAt(x, y);
  if (t && !ui.drag.ids.includes(+t.dataset.id)) { ui.drag.ids.push(+t.dataset.id); t.classList.add('swept'); }
}
const endDrag = e => {
  if (ui.bdrag) { balanceUp(e); return; }
  if (!ui.drag || e.pointerId !== ui.drag.id) return;
  const d = ui.drag;
  if (!d.active) { ui.drag = null; return; }
  ui.suppressClick = true; setTimeout(() => { ui.suppressClick = false; }, 0);
  clearSweep(); ui.drag = null;
  if (d.ids.length >= 2) run(s => opSweep(s, d.ids));
  else if (d.ids.length === 1) select({ t: 'f', id: d.ids[0] });
};
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', () => { clearSweep(); ui.drag = null; balanceDrop(); });
board.addEventListener('click', e => {
  if (ui.suppressClick) { ui.suppressClick = false; return; }
  if (ui.busy || ui.won) return;
  const chip = e.target.closest('.opchip');
  if (chip) { if (!isEquation(ui.S)) return run(s => opOp(s)); ui.balBranch = +chip.dataset.b || 0; return setBalancing(!ui.balancing); }
  if (e.target.closest('.fbar')) return run(s => opBar(s));
  const hit = e.target.closest('.tile, .term');
  if (ui.balancing) {
    if (!hit) return setBalancing(false);
    if (e.detail === 0) return dropAcross(hit.classList.contains('tile') ? +hit.dataset.id : +hit.dataset.tid);   // keyboard: Enter moves it across
    shake([+(hit.dataset.id || hit.dataset.tid)]); return say('balanceTap', {}, 'info');
  }
  if (hit && hit.classList.contains('pw')) { shake([+hit.dataset.id]); return say('powTap', {}, 'info'); }
  if (hit && hit.classList.contains('tile')) return onFactor(+hit.dataset.id);
  if (hit) return onTerm(+hit.dataset.tid);
  if (ui.sel) { ui.sel = null; render(); }
});
board.addEventListener('keydown', e => {
  const p = e.target.closest && e.target.closest('.tile.p, .tile.r');
  if (p && e.target === p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onFactor(+p.dataset.id); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSheet(); if (!$('menu').hidden) { setMenu(false); $('btnMenu').focus(); } }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('btnUndo').click(); }
});
