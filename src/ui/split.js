/* Splitting a term in two (5x = 2x + 3x) and the result previews on the move buttons. */
import { N } from '../core/kinds/number.js';
import { T, cloneF } from '../core/kinds/sums.js';
import { coef, locate, tidy, varPart } from '../core/model.js';
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
