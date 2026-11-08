/* Equations: the balance panel (+ − · : and a number on a slider, done to both sides) and balance mode (drag a piece across the =). */
import { BOPS, opBalance, opDrag } from '../core/balance.js';
import { V } from '../core/kinds/letter.js';
import { N } from '../core/kinds/number.js';
import { T } from '../core/kinds/sums.js';
import { params, walkTerms } from '../core/model.js';
import { branchCount, isEquation, pairOf } from '../core/problem.js';
import { play } from '../core/rules/engine.js';
import { t } from '../i18n.js';
import { run } from './controller.js';
import { shake } from './motion.js';
import { say } from './note.js';
import { $, board, ui } from './state.js';
import { render } from './tiles.js';

/* ---- equations: do the same to both sides ---- */
// a term as typed text without its sign: 2x, 3a^2, 5
export function termText(t) {
  const n = t.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1), vs = t.f.filter(f => f.k === 'v');
  return (n !== 1 || !vs.length ? String(n) : '') + vs.map(f => f.b + (f.e > 1 ? '^' + f.e : '')).join('');
}
/* ---- the balance panel: + − · : and a number on a slider, done to both sides (no typing) ---- */
// + and − take a positive number (the sign is the operation); · and : can be negative (· −1 flips both sides)
// with parameters there are letter chips too: each one cycles off → a → a² → off, so · 4a and + b² can be made
export const bal = { op: '+', v: 1, lets: {} };
const balLetters = () => isEquation(ui.S) ? params(ui.S).sort() : [];
// the value as a term: 4a is the number 4 with the letter a on
export function balTerm() {
  const vs = balLetters().filter(b => bal.lets[b]).map(b => V(b, bal.lets[b]));
  const n = Math.abs(bal.v);
  return T([...(n !== 1 || !vs.length ? [N(n)] : []), ...vs], bal.v < 0);
}
const balText = () => { const t0 = balTerm(); return (t0.neg ? '−' : '') + t0.f.map(f => f.k === 'n' ? f.v : f.b + (f.e > 1 ? '²' : '')).join(''); };
export function balBounds() {
  let big = 1;
  pairOf(ui.S, Math.min(ui.balBranch, branchCount(ui.S) - 1)).forEach(P => walkTerms([...P.num, ...P.den], { depth: 0 }, M => { if (M.kind === 'f' && M.f.k === 'n') big = Math.max(big, M.f.v); }));
  const R = Math.min(200, Math.max(20, 2 * big, Math.abs(bal.v)));
  return bal.op === '+' || bal.op === '-' ? [1, R] : [-R, R];
}
const balShown = balText;
// what the panel would do, from a dry run on a copy
function balTry() {
  return { r: play(ui.S, s => opBalance(s, bal.op, balTerm(), ui.balBranch)).r };
}
export function balSync(preview) {
  const [lo, hi] = balBounds(), range = $('balRange');
  if (bal.v < lo || bal.v > hi || !bal.v) bal.v = Math.min(hi, Math.max(lo, Math.abs(bal.v) || 1));
  range.min = lo; range.max = hi; range.value = bal.v;
  range.setAttribute('aria-valuetext', BOPS[bal.op] + ' ' + balShown());
  document.querySelectorAll('#balOps [data-bop]').forEach(b => { const on = b.dataset.bop === bal.op; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const ls = balLetters();
  Object.keys(bal.lets).forEach(b => { if (!ls.includes(b)) delete bal.lets[b]; });
  $('balLets').hidden = !ls.length;
  $('balLets').setAttribute('aria-label', t('balLetters'));
  // a chip that is on shows a faint ² for its next tap, so b² can be found without being told
  $('balLets').innerHTML = ls.map(b => { const e = bal.lets[b] || 0; return `<button type="button" class="ballet${e ? ' on' : ''}" data-let="${b}" aria-pressed="${!!e}" aria-label="${t(['balLetOff', 'balLetOn', 'balLetSq'][e], { b })}"><i>${b}</i>${e ? `<sup${e === 1 ? ' class="next"' : ''}>2</sup>` : ''}</button>`; }).join('');
  $('balGo').querySelector('span').textContent = `${BOPS[bal.op]} ${bal.v < 0 ? '(' + balShown() + ')' : balShown()}`;
  $('balGo').setAttribute('aria-label', t('balGoAria', { op: BOPS[bal.op], v: balShown() }));
  if (!preview) return;
  const { r } = balTry();
  if (r && r.no) say(r.no, r.p || {}, 'warn');
  else if (r) say('balPreview', { ex: r.p.ex }, 'info');
}
export function balSet(op, v) {
  if (op) {
    if ((op === '+' || op === '-') !== (bal.op === '+' || bal.op === '-')) bal.v = Math.abs(bal.v);
    bal.op = op;
  }
  if (v != null) { if (v === 0) v = v < bal.v ? -1 : 1; bal.v = v; }
  balSync(true);
}
// a hint that says "do + 9 on both sides" sets the panel to it
export function balFromHint() {
  const h = ui.lastHint;
  if (!h || !h.balance || h.drag != null) return;
  const v = h.balance.value, n = v.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);
  if (v.f.some(f => f.k !== 'n' && f.k !== 'v')) return;
  bal.lets = Object.fromEntries(v.f.filter(f => f.k === 'v').map(f => [f.b, f.e]));
  bal.op = h.balance.op; bal.v = v.neg && (bal.op === '·' || bal.op === ':') ? -n : n;
  if (bal.op === '+' && v.neg) bal.op = '-';
  ui.balBranch = h.bi || 0;
}
/* ---- balance mode: tap =, then drag a piece across it; it is undone on both sides ---- */
export function setBalancing(on) {
  ui.balancing = on && isEquation(ui.S);
  if (ui.balancing) { bal.lets = {}; balFromHint(); }
  ui.sel = null; ui.born = new Set();
  if (!ui.balancing || !(ui.lastHint && ui.lastHint.balance && ui.lastHint.drag == null)) ui.hintIds = new Set();
  render(); say(ui.balancing ? (balLetters().length ? 'balanceModeLets' : 'balanceMode') : 'balanceOff', {}, 'info');
}
export function dropAcross(id) {
  run(s => { const r = opDrag(s, id); if (r && !r.no) ui.balancing = false; return r; });
}
// the other side's fraction: where the piece has to land
function otherSide(fromRight, row) {
  row = row || board.querySelector('.eqrow');
  return row && (fromRight ? row.querySelector(':scope > .frac') : row.querySelector('.eqright > .frac'));
}
export function overOtherSide(x, y) {
  const wrap = board.querySelector('.expr'), row = ui.bdrag.row, eq = row && row.querySelector('.opchip.eq'), other = otherSide(ui.bdrag.right, row);
  if (!eq || !other) return false;
  const e = eq.getBoundingClientRect(), b = board.getBoundingClientRect();
  if (wrap.classList.contains('oneline'))   // on one line: anywhere past the = counts
    return (branchCount(ui.S) > 1 ? y >= row.getBoundingClientRect().top - 30 && y <= row.getBoundingClientRect().bottom + 30 : y >= b.top - 40 && y <= b.bottom + 40) && (ui.bdrag.right ? x < e.left + e.width / 2 : x > e.left + e.width / 2);
  const r = other.getBoundingClientRect(), m = 32;
  return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
}
// a finger is wide and the tiles wobble: a press just next to a piece still picks it up
function pieceNear(x, y) {
  let best = null, bd = 22;
  board.querySelectorAll('.frac > .side > .term > .tile').forEach(el => {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    if (d < bd) { bd = d; best = el; }
  });
  return best;
}
export function balanceDown(e) {
  if (e.target.closest('.opchip')) return;
  const el = e.target.closest('#board .tile, #board .term') || pieceNear(e.clientX, e.clientY);
  // a press on nothing still becomes a drag record, so letting go somewhere else isn't read as a tap on the board
  ui.bdrag = { el, id: el && (el.classList.contains('tile') ? +el.dataset.id : +el.dataset.tid), x: e.clientX, y: e.clientY, pid: e.pointerId, active: false, right: !!(el && el.closest('.eqright')), row: el && el.closest('.eqrow') };
}
export function balanceMove(e) {
  const d = ui.bdrag;
  if (e.pointerId !== d.pid) return;
  if (!d.active) {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    d.active = true;
    if (!d.el) return;
    try { board.setPointerCapture(e.pointerId); } catch {}
    const r = d.el.getBoundingClientRect();
    d.k = r.width / (d.el.offsetWidth || r.width);           // the board's zoom
    d.ox = d.x - r.left; d.oy = d.y - r.top;
    d.ghost = d.el.cloneNode(true);
    d.ghost.classList.add('dragghost'); d.ghost.classList.remove('sel', 'hint', 'born', 'partner');
    d.ghost.style.width = d.el.offsetWidth + 'px';
    document.body.append(d.ghost);
    d.el.classList.add('lifted');
  }
  if (!d.el) return;
  d.ghost.style.transform = `translate(${e.clientX - d.ox}px, ${e.clientY - d.oy}px) scale(${d.k * 1.08})`;
  const over = overOtherSide(e.clientX, e.clientY);
  otherSide(d.right, d.row)?.classList.toggle('droptarget', over);
}
export function balanceDrop() {
  if (!ui.bdrag) return;
  ui.bdrag.ghost?.remove(); ui.bdrag.el?.classList.remove('lifted');
  board.querySelectorAll('.droptarget').forEach(el => el.classList.remove('droptarget'));
  ui.bdrag = null;
}
export function balanceUp(e) {
  const d = ui.bdrag;
  if (e.pointerId !== d.pid) return;
  const over = d.active && d.el && overOtherSide(e.clientX, e.clientY);
  balanceDrop();
  if (!d.active) {                                // a tap: the click handler explains, also for a near miss
    if (d.el && !e.target.closest('.tile, .term')) { shake([d.id]); say('balanceTap', {}, 'info'); ui.suppressClick = true; setTimeout(() => { ui.suppressClick = false; }, 0); }
    return;
  }
  ui.suppressClick = true; setTimeout(() => { ui.suppressClick = false; }, 0);
  if (!d.el) return;
  if (over) dropAcross(d.id);
  else say('balanceMiss', {}, 'info');
}
