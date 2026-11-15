/* What a piece (or a term) can do by itself, on its second tap: one move runs straight away, several open a ring of
   buttons around the piece, each labelled with what it does (12 = 2 · 2 · 3, 5x = … + …, Expand ×ⁿ⁄ₙ). The bottom
   bar has no move buttons any more: players didn't find them there. */
import { expandTarget } from '../core/fractions.js';
import { playHint } from '../core/goals/index.js';
import { canMerge, locate } from '../core/model.js';
import { opGather } from '../core/moves.js';
import { opExplode, play } from '../core/rules/engine.js';
import { t } from '../i18n.js';
import { mx, stateHTML, sumHTML } from '../render/text.js';
import { run } from './controller.js';
import { previewOf, showExpand, showSplit, splitTermOf } from './split.js';
import { board, ui } from './state.js';
import { TOOL_MOVES } from './tiles.js';

// the moves for the selection: [{ id, label, go, move? }] (move: the move itself, for a dry run; a slider has none)
export function movesFor(S, sel) {
  if (!sel || ui.balancing) return [];
  const out = [];
  if (sel.t === 'f') {
    const id = sel.id, L = locate(S, id);
    if (!L) return [];
    const ex = previewOf(s => opExplode(s, id));
    if (ex) out.push({ id: 'explode', label: ex, move: s => opExplode(s, id) });
    if (L.term.f.filter(f => canMerge(L.f, f)).length >= 3) {
      const g = previewOf(s => opGather(s, id));
      if (g) out.push({ id: 'gather', label: g, move: s => opGather(s, id) });
    }
    for (const tm of TOOL_MOVES) {
      const label = previewOf(s => tm.move(s, id));
      if (label) out.push({ id: tm.id, label, move: s => tm.move(s, id) });
    }
    if (expandTarget(S, id) && !S.exps) out.push({ id: 'expand', label: t('expandBtn') + ' ×ⁿ⁄ₙ', go: () => showExpand(id) });
  }
  // a piece of a tidy letter term in factor levels, equations and inside a function; a selected term anywhere
  const twoId = sel.t === 't' || S.goal === 'factor' || S.goal === 'solve' || S.goal === 'prove' || locate(S, sel.id)?.depth ? splitTermOf(sel.id) : null;
  if (twoId) out.push({ id: 'split', label: mx(sumHTML([locate(S, twoId).term]) + ' = … + …'), go: () => showSplit(twoId) });
  for (const m of out) if (!m.go) m.go = () => run(m.move);
  return out;
}

// which button the current hint stands for: a slider by its hint key, any other by the state it leads to
const SLIDER_HINTS = { hSumProduct: 'split', hSplitSquare: 'split', hExpandTo: 'expand' };
function hintedMove(moves) {
  const h = ui.lastHint;
  if (!h) return null;
  if (SLIDER_HINTS[h.k]) return SLIDER_HINTS[h.k];
  const want = play(ui.S, s => playHint(s, h));
  if (!want.r || !want.r.ok) return null;
  const key = stateHTML(want.S);
  return moves.find(m => m.move && stateHTML(play(ui.S, m.move).S) === key)?.id || null;
}

export function closeRing() { document.getElementById('ring')?.remove(); }

// the second tap: nothing to do → the explode's own explanation; one move → do it; several → the ring
export function secondTap(sel, fallback) {
  const moves = movesFor(ui.S, sel);
  if (!moves.length) return fallback();
  if (moves.length === 1) return moves[0].go();
  openRing(sel, moves);
}

function openRing(sel, moves) {
  closeRing();
  const anchor = board.querySelector(sel.t === 'f' ? `.tile[data-id="${sel.id}"]` : `.term[data-tid="${sel.id}"]`);
  if (!anchor) return;
  const hinted = hintedMove(moves);
  const ring = document.createElement('div');
  ring.id = 'ring'; ring.className = 'ring'; ring.setAttribute('role', 'menu');
  for (const m of moves) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool preview ringbtn' + (m.id === hinted ? ' hint' : ''); b.setAttribute('role', 'menuitem');
    b.innerHTML = `<span>${m.label}</span>`;
    b.addEventListener('click', e => { e.stopPropagation(); closeRing(); m.go(); });
    ring.append(b);
  }
  board.append(ring);
  place(ring, anchor);
  ring.addEventListener('keydown', e => {
    const bs = [...ring.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); closeRing(); anchor.focus?.(); }
  });
  ring.querySelector('button').focus({ preventScroll: true });
}

// the buttons around the piece on an ellipse, starting at the top; one that overlaps another is pushed outwards,
// and every button stays on the board with a 16px gutter, clear of the bars
function place(ring, anchor) {
  const B = board.getBoundingClientRect(), A = anchor.getBoundingClientRect();
  const cs = getComputedStyle(board), top = parseFloat(cs.paddingTop) || 0, bottom = B.height - (parseFloat(cs.paddingBottom) || 0);
  const cx = A.left - B.left + A.width / 2, cy = A.top - B.top + A.height / 2;
  const bs = [...ring.children], n = bs.length, placed = [];
  bs.forEach((b, i) => {
    const w = b.offsetWidth, h = b.offsetHeight;
    // two or three: an arc over the top; more: all the way round
    const ang = n <= 3 ? -Math.PI / 2 + (i - (n - 1) / 2) * (Math.PI / 3) : -Math.PI / 2 + i * 2 * Math.PI / n;
    let r = 1, box;
    for (let k = 0; k < 60; k++, r += 0.08) {
      const x = cx + Math.cos(ang) * (A.width / 2 + w / 2 + 10) * r - w / 2;
      const y = cy + Math.sin(ang) * (A.height / 2 + h / 2 + 10) * r - h / 2;
      box = { x: Math.min(Math.max(x, 16), B.width - 16 - w), y: Math.min(Math.max(y, top + 4), bottom - 4 - h), w, h };
      if (!placed.some(p => box.x < p.x + p.w + 6 && p.x < box.x + w + 6 && box.y < p.y + p.h + 6 && p.y < box.y + h + 6)) break;
    }
    placed.push(box);
    b.style.left = box.x + 'px'; b.style.top = box.y + 'px';
  });
}
