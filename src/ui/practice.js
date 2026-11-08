/* The practice screen: topics and difficulty. */
import { t } from '../i18n.js';
import { nextProblem } from './controller.js';
import { showOwn } from './own.js';
import { closeSheet, openSheet } from './sheets.js';
import { store, ui } from './state.js';

const TOPICS = ['powers', 'like', 'frac', 'open', 'double', 'square', 'factor', 'trinomial', 'equations', 'quadratic', 'generic', 'mixed'];
export function showPractice() {
  ui.sheetFn = showPractice;
  const chips = TOPICS.map(tp => `<button type="button" class="pchip${ui.prac.topics.includes(tp) ? ' on' : ''}" data-tp="${tp}" aria-pressed="${ui.prac.topics.includes(tp)}">${t('tp_' + tp)}</button>`).join('');
  const ds = [1, 2, 3].map(d => `<button type="button" class="pchip seg${ui.prac.d === d ? ' on' : ''}" data-d="${d}" aria-pressed="${ui.prac.d === d}">${t('d' + d)}</button>`).join('');
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('practiceTitle')}</h2><p>${t('practiceIntro')}</p>
    <div class="plabel">${t('topics')}</div><div class="pchips">${chips}</div>
    <div class="plabel">${t('difficulty')}</div><div class="pchips">${ds}</div>
    <p class="pwarn" id="pWarn" hidden>${t('pickOne')}</p>
    <div class="row" style="margin-top:18px"><button class="tool main" type="button" id="pStart">${t('start')} →</button>
      <button class="tool" type="button" id="pOwn">✎ ${t('ownTitle')}</button></div>`);
  host.querySelector('#pOwn').addEventListener('click', showOwn);
  host.querySelectorAll('[data-tp]').forEach(b => b.addEventListener('click', () => {
    const tp = b.dataset.tp, on = ui.prac.topics.includes(tp);
    ui.prac.topics = on ? ui.prac.topics.filter(x => x !== tp) : [...ui.prac.topics, tp];
    b.classList.toggle('on', !on); b.setAttribute('aria-pressed', String(!on));
  }));
  host.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
    ui.prac.d = +b.dataset.d;
    host.querySelectorAll('[data-d]').forEach(x => { const on = +x.dataset.d === ui.prac.d; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  }));
  host.querySelector('#pStart').addEventListener('click', () => {
    if (!ui.prac.topics.length) { host.querySelector('#pWarn').hidden = false; return; }
    store.set('practice', ui.prac); ui.session = { solved: 0, streak: 0 };
    closeSheet(); ui.mode = 'practice'; nextProblem();
  });
}
