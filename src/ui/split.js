/* Splitting a term in two (5x = 2x + 3x) and the result previews on the move buttons. */
import { N } from '../core/kinds/number.js';
import { T, cloneF, cloneT } from '../core/kinds/sums.js';
import { V } from '../core/kinds/letter.js';
import { Rt } from '../core/kinds/root.js';
import { expandTarget, opExpand } from '../core/fractions.js';
import { coef, eachFactor, locate, normalize, tidy, varPart } from '../core/model.js';
import { opSplitTwo } from '../core/moves.js';
import { play } from '../core/rules/engine.js';
import { t } from '../i18n.js';
import { mx, sumHTML } from '../render/text.js';
import { termText } from './balance.js';
import { run } from './controller.js';
import { say } from './note.js';
import { $, board, ui } from './state.js';
import { render } from './tiles.js';

/* ---- split a term in two: 5x = 2x + 3x ---- */
// the term (selected, or holding the selected piece) when it can be written as a sum of two terms
export function splitTermOf(id) {
  const L = locate(ui.S, id);
  return L && tidy(L.term) && varPart(L.term).length ? L.term.id : null;
}
// "before = after" for a move, from a dry run on a copy; null when the move would be refused
export function previewOf(fn) {
  const { r } = play(ui.S, fn);
  if (!r || r.no) return null;
  const p = r.p || {};
  const inner = h => String(h).replace(/^<span class="mx">([\s\S]*)<\/span>$/, '$1');
  const short = h => {   // x · x · x · x · x · x · x → x · x · … · x
    const sep = h.includes(' + ') ? ' + ' : ' · ', bits = h.split(sep);
    return bits.length > 6 ? [bits[0], bits[1], '…', bits[bits.length - 1]].join(sep) : h;
  };
  const left = r.ok === 'explodeNum' ? p.n : inner(p.x || p.ex);
  const right = r.ok === 'gather' ? inner(p.r) : short(inner(p.ex));
  return mx(r.ok === 'gather' ? short(inner(p.ex)) + ' = ' + right : left + ' = ' + right);
}
/* ---- a slider in place: the strip sits under the formula (in the bottom bar, where the balance panel goes) and the
   board itself shows the result while the slider moves, on a copy; ✓ plays it, ✕ or a tap on the board puts the board
   back. It used to be a sheet over the board, which hid the formula it was changing. ---- */
export function closeStrip(again = true) {
  if (!ui.strip) return;
  ui.strip = null;
  const el = $('slideStrip'); el.hidden = true; el.replaceChildren();
  board.classList.remove('previewing');
  if (again) { ui.born = new Set(); render(); }
}
function openStrip(title, controls, move, goLabel) {
  closeStrip(false);
  const el = $('slideStrip');
  el.innerHTML = `<div class="striptitle">${title}</div>${controls}
    <div class="striprow"><button class="tool main balgo" type="button" id="stGo"><span></span></button>
    <button class="tool" type="button" id="stNo" aria-label="${t('stripCancel')}">✕</button></div>`;
  el.hidden = false;
  ui.strip = { move, goLabel };
  el.querySelector('#stNo').addEventListener('click', () => closeStrip());
  el.querySelector('#stGo').addEventListener('click', () => { const m = ui.strip.move(); closeStrip(false); run(m); });
  return el;
}
// the board shows what the move would make, the new tiles outlined; the state itself doesn't change
function stripShow() {
  const { S, r } = play(ui.S, ui.strip.move());
  const real = ui.S, sel = ui.sel;
  if (r && r.ok) { normalize(S); ui.S = S; ui.born = new Set(r.born || []); ui.sel = null; }
  ui.previewing = true; board.classList.add('previewing');
  try { render(); } finally { ui.S = real; ui.sel = sel; ui.previewing = false; }
  $('stGo').querySelector('span').innerHTML = ui.strip.goLabel(r);
}

// 5x = 2x + 3x: a slider picks the first term, the second is what is left
export function showSplit(tid) {
  const L = locate(ui.S, tid);
  const c = L && coef(L.term), vp = L && varPart(L.term);
  if (!L || !tidy(L.term) || !vp.length) return;
  const mono2 = k => T([...(Math.abs(k) !== 1 ? [N(Math.abs(k))] : []), ...vp.map(cloneF)], k < 0);
  const R = Math.max(12, Math.abs(c) + 12);
  let p = Math.sign(c) * (Math.abs(c) > 1 ? 1 : 2);
  const el = openStrip(t('splitTitle', { x: mx(sumHTML([L.term])) }),
    `<div class="balnum"><button type="button" class="balstep" id="sLess">‹</button>
      <input type="range" class="slider" id="sRange" min="${-R}" max="${R}" step="1" value="${p}" aria-label="${t('splitTitle', { x: termText(L.term) })}">
      <button type="button" class="balstep" id="sMore">›</button></div>`,
    () => s => opSplitTwo(s, tid, p),
    () => mx(sumHTML([mono2(p), mono2(c - p)])));
  const range = el.querySelector('#sRange');
  // 0 or the whole term would leave nothing to split: skip over them in the direction the slider moves
  const update = () => {
    let v = +range.value;
    if (v === 0 || v === c) { v += v >= p ? 1 : -1; if (v === 0 || v === c) v += v >= p ? 1 : -1; if (Math.abs(v) > R) v = p; range.value = v; }
    p = v;
    const said = k => (k < 0 ? '−' : '') + termText(mono2(k));
    range.setAttribute('aria-valuetext', `${said(p)} + ${said(c - p)}`);
    stripShow();
  };
  const step = d => { range.value = Math.max(-R, Math.min(R, p + d)); if (+range.value === 0 || +range.value === c) range.value = Math.max(-R, Math.min(R, +range.value + d)); update(); };
  range.addEventListener('input', update);
  el.querySelector('#sLess').addEventListener('click', () => step(-1));
  el.querySelector('#sMore').addEventListener('click', () => step(1));
  say('splitHow', {}, 'info');
  update();
  setTimeout(() => range.focus(), 50);
}

/* ---- expand a fraction: top and bottom times the same thing ---- */
// what to expand by: a number from the slider, or a letter or root that is below the bar somewhere (1/a, 1/√2)
export function showExpand(id) {
  const tg = expandTarget(ui.S, id);
  if (!tg) return;
  const chips = [], seen = new Set();
  eachFactor(ui.S, L => {
    const below = L.qs === 'den' || (!L.qs && L.side === 'den');
    if (!below || !(L.f.k === 'v' || L.f.k === 'r')) return;
    const f = L.f.k === 'v' ? V(L.f.b, 1) : Rt(L.f.terms.map(cloneT)), key = JSON.stringify(L.f.k === 'v' ? L.f.b : L.f.terms.map(t => t.f.map(g => g.v || g.b)));
    if (!seen.has(key)) { seen.add(key); chips.push(f); }
  });
  let pick = null, k = 2;
  const shown = play(ui.S, s => opExpand(s, id, T([N(2)]))).r;
  const value = () => T([pick != null ? chips[pick] : N(k)].map(f => JSON.parse(JSON.stringify(f))));
  const el = openStrip(t('expandTitle', { x: shown && shown.p ? shown.p.x : '' }),
    `<div class="balnum">${chips.length ? `<div class="ballets">${chips.map((f, i) => `<button type="button" class="pchip" data-c="${i}" aria-pressed="false">${mx(sumHTML([T([f])]))}</button>`).join('')}</div>` : ''}
      <button type="button" class="balstep" id="eLess">‹</button>
      <input type="range" class="slider" id="eRange" min="2" max="12" step="1" value="2" aria-label="${t('expandTitle', { x: '' })}">
      <button type="button" class="balstep" id="eMore">›</button></div>`,
    () => { const v = value(); return s => opExpand(s, id, v); },
    () => t('expandDo') + ' ' + mx('× ' + sumHTML([value()])));
  const range = el.querySelector('#eRange');
  const update = () => {
    k = +range.value;
    el.querySelectorAll('[data-c]').forEach(b => { const on = +b.dataset.c === pick; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    stripShow();
  };
  range.addEventListener('input', () => { pick = null; update(); });
  el.querySelector('#eLess').addEventListener('click', () => { pick = null; range.value = Math.max(2, k - 1); update(); });
  el.querySelector('#eMore').addEventListener('click', () => { pick = null; range.value = Math.min(12, k + 1); update(); });
  el.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { pick = pick === +b.dataset.c ? null : +b.dataset.c; update(); }));
  say('expandHow', {}, 'info');
  update();
  setTimeout(() => range.focus(), 50);
}
