/* Fitting the formula to the board (zoom, line breaks before a ·, before the =) and the floating bars. */
import { isBranched, isEquation } from '../core/problem.js';
import { $, board, ui } from './state.js';

// a line that is wider than the board (a long equation side) is shrunk to fit instead of overflowing
export function fitBoard(wrap) {
  wrap.style.zoom = ''; wrap.classList.remove('oneline', 'across', 'tight');
  wrap.querySelectorAll('.term > .lb').forEach(el => el.remove());
  // several branches (x = 3 ∨ x = −3): below each other, or next to each other when that needs less shrinking
  // (a phone on its side has width to spare and little height)
  if (isBranched(ui.S)) {
    const cs = getComputedStyle(board), room = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const W = wrap.parentElement.clientWidth * 0.94;
    wrap.classList.add('oneline');
    const k = () => Math.min(1, W / wrap.scrollWidth, room > 0 ? room / wrap.scrollHeight : 1);
    const down = k();
    wrap.classList.add('across');
    const side = k();
    if (side <= down) wrap.classList.remove('across');
    const best = Math.max(side, down);
    if (best >= 0.55) { if (best < 1) wrap.style.zoom = String(best); return; }
    wrap.classList.remove('oneline', 'across');
  }
  // an equation reads best on one line, like a balance: shrink it a little rather than break it
  if (isEquation(ui.S)) {
    wrap.classList.add('oneline');                    // nothing wraps, so this is its natural width
    const k = wrap.parentElement.clientWidth * 0.94 / wrap.scrollWidth;
    // (its height too: a phone on its side with the balance panel open has little of it)
    if (k >= 1) { fitHeight(wrap); return; }
    if (k >= 0.72) { wrap.style.zoom = String(k); fitHeight(wrap); return; }
    wrap.classList.remove('oneline');                 // too long: break before the =, then fit each line
  }
  // a product reads best whole: shrink it rather than break it between two factors
  wrap.classList.add('tight');
  const bs = getComputedStyle(board), avail = (board.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight)) * 0.97, widest = () => Math.max(0, ...[...wrap.children].map(c => c.scrollWidth), ...[...wrap.querySelectorAll('.term')].map(spanOf));
  let need = widest();
  if (avail && avail / need < 0.55) { wrap.classList.remove('tight'); need = widest(); }
  if (avail && need > avail) wrap.style.zoom = String(Math.max(0.55, avail / need));
  dotsDown(wrap);
  fitHeight(wrap);
}
// how wide a term's pieces really are: a term that can't wrap overflows its own box on both sides,
// which neither its width nor its scrollWidth shows
function spanOf(te) {
  const a = te.firstElementChild, b = te.lastElementChild;
  if (!a) return 0;
  const cs = getComputedStyle(te);
  return b.getBoundingClientRect().right - a.getBoundingClientRect().left + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
}
// a product that still wraps: a · at the end of a line moves to the start of the next one
function dotsDown(wrap) {
  wrap.querySelectorAll('.term > .lb').forEach(el => el.remove());
  for (let pass = 0; pass < 6; pass++) {
    const d = [...wrap.querySelectorAll('.term > .dot')].find(dot => {
      const n = dot.nextElementSibling;
      return n && n.getBoundingClientRect().top >= dot.getBoundingClientRect().bottom;
    });
    if (!d) return;
    d.before(Object.assign(document.createElement('span'), { className: 'lb' }));
  }
}
// a phone on its side has little height: shrink the tiles until they fit between the bars instead of scrolling
function fitHeight(wrap) {
  const cs = getComputedStyle(board), room = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const h = wrap.getBoundingClientRect().height, z = parseFloat(wrap.style.zoom) || 1;
  // two branches with the balance panel open get a little further: a row under the panel can't be dragged
  const floor = isBranched(ui.S) ? 0.45 : 0.55;
  if (room > 0 && h > room) wrap.style.zoom = String(Math.max(floor, z * room / h));
}
window.addEventListener('resize', () => { const w = board.querySelector('.expr'); if (w) fitBoard(w); });
// the board keeps its tiles in the open space between the bars, whatever their height
// only room for a two-line note is kept free: a longer note floats over the board instead of shifting every tile
// (tiles that jump when the message changes are hard to grab)
const hudFit = () => {
  const note = $('note'), keep = parseFloat(getComputedStyle(note).minHeight) || 0;
  const top = $('hudTop').offsetHeight + 'px', bottom = ($('hudBottom').offsetHeight - note.offsetHeight + keep) + 'px';
  if (board.style.getPropertyValue('--hud-top') === top && board.style.getPropertyValue('--hud-bottom') === bottom) return;
  board.style.setProperty('--hud-top', top); board.style.setProperty('--hud-bottom', bottom);
  const w = board.querySelector('.expr'); if (w) fitBoard(w);
};
if (window.ResizeObserver) { const ro = new ResizeObserver(hudFit); ro.observe($('hudTop')); ro.observe($('hudBottom')); }
hudFit();
