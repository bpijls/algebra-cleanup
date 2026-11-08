/* Splitting a term in two (5x = 2x + 3x) and the result previews on the move buttons. */
import { N } from '../core/kinds/number.js';
import { T, cloneF, cloneT } from '../core/kinds/sums.js';
import { V } from '../core/kinds/letter.js';
import { Rt } from '../core/kinds/root.js';
import { expandTarget, opExpand } from '../core/fractions.js';
import { coef, eachFactor, locate, tidy, varPart } from '../core/model.js';
import { opSplitTwo } from '../core/moves.js';
import { play } from '../core/rules/engine.js';
import { t } from '../i18n.js';
import { mx, sumHTML } from '../render/text.js';
import { termText } from './balance.js';
import { run } from './controller.js';
import { closeSheet, openSheet } from './sheets.js';
import { ui } from './state.js';

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
// 5x = 2x + 3x: a slider picks the first term, the second is what is left
export function showSplit(tid) {
  const L = locate(ui.S, tid);
  const c = L && coef(L.term), vp = L && varPart(L.term);
  if (!L || !tidy(L.term) || !vp.length) return;
  const mono2 = k => T([...(Math.abs(k) !== 1 ? [N(Math.abs(k))] : []), ...vp.map(cloneF)], k < 0);
  const R = Math.max(12, Math.abs(c) + 12);
  let p = Math.sign(c) * (Math.abs(c) > 1 ? 1 : 2);
  ui.sheetFn = null;
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('splitTitle', { x: mx(sumHTML([L.term])) })}</h2><p>${t('splitHow')}</p>
    <div class="splitprev expr-n" id="sPrev" aria-live="polite"></div>
    <input type="range" class="slider" id="sRange" min="${-R}" max="${R}" step="1" value="${p}" aria-label="${t('splitTitle', { x: termText(L.term) })}">
    <div class="sliderends"><span>${-R}</span><span>0</span><span>${R}</span></div>
    <div class="row" style="margin-top:16px">
      <button class="tool main" type="button" id="sDo">${t('splitDo')}</button>
    </div>`);
  const range = host.querySelector('#sRange'), prev = host.querySelector('#sPrev'), go = host.querySelector('#sDo');
  // 0 or the whole term would leave nothing to split: skip over them in the direction the slider moves
  const update = () => {
    let v = +range.value;
    if (v === 0 || v === c) { v += v >= p ? 1 : -1; if (v === 0 || v === c) v += v >= p ? 1 : -1; if (Math.abs(v) > R) v = p; range.value = v; }
    p = v;
    prev.innerHTML = `${sumHTML([L.term])} = ${sumHTML([mono2(p), mono2(c - p)])}`;
    const said = k => (k < 0 ? '−' : '') + termText(mono2(k));
    range.setAttribute('aria-valuetext', `${said(p)} + ${said(c - p)}`);
  };
  range.addEventListener('input', update);
  go.addEventListener('click', () => { closeSheet(); run(s => opSplitTwo(s, tid, p)); });
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
  ui.sheetFn = null;
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('expandTitle', { x: shown && shown.p ? shown.p.x : '' })}</h2><p>${t('expandHow')}</p>
    <div class="splitprev expr-n" id="ePrev" aria-live="polite"></div>
    <input type="range" class="slider" id="eRange" min="2" max="12" step="1" value="2" aria-label="${t('expandTitle', { x: '' })}">
    <div class="sliderends"><span>2</span><span>12</span></div>
    ${chips.length ? `<div class="row" style="margin-top:10px">${chips.map((f, i) => `<button type="button" class="pchip" data-c="${i}" aria-pressed="false">${mx(sumHTML([T([f])]))}</button>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:16px"><button class="tool main" type="button" id="eDo">${t('expandDo')}</button></div>`);
  const range = host.querySelector('#eRange'), prev = host.querySelector('#ePrev');
  const value = () => T([pick != null ? chips[pick] : N(k)].map(f => JSON.parse(JSON.stringify(f))));
  const update = () => {
    k = +range.value;
    const { r } = play(ui.S, s => opExpand(s, id, value()));
    prev.innerHTML = r && r.ok ? `${r.p.x} = ${r.p.ex}` : '';
    host.querySelectorAll('[data-c]').forEach(b => { const on = +b.dataset.c === pick; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  };
  range.addEventListener('input', () => { pick = null; update(); });
  host.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { pick = pick === +b.dataset.c ? null : +b.dataset.c; update(); }));
  host.querySelector('#eDo').addEventListener('click', () => { const v = value(); closeSheet(); run(s => opExpand(s, id, v)); });
  update();
  setTimeout(() => range.focus(), 50);
}
