/* Your own problem: typed from the book, with a live preview, goal chips and "solve for" chips. */
import { letters } from '../core/balance.js';
import { isClean, unknownOf } from '../core/model.js';
import { t } from '../i18n.js';
import { guessGoal, parseProblem } from '../parse.js';
import { autoSolve } from '../practice.js';
import { bx, stateHTML } from '../render/text.js';
import { earn, startBoard } from './controller.js';
import { closeSheet, openSheet } from './sheets.js';
import { store, ui } from './state.js';

/* ---- your own problem: typed from the book ---- */
const OWN_EXAMPLES = ['(x+3)(x-2)', '(a+b)^2', '-2(x+4)-3(x-1)', '12a^5/4a^2', 'x^2+5x+6', '4a^2b+6ab^2', '5x+3=2x+12', '2(x+3)=4x-2', 'ax+b=cx+d', 'ax^2+bx+c=0'];
export function showOwn() {
  ui.sheetFn = showOwn;
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('ownTitle')}</h2><p>${t('ownIntro')}</p>
    <form id="ownForm" class="ownform" autocomplete="off">
      <input id="ownIn" class="ownin" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${t('ownTitle')}" value="">
      <div class="ownprev expr-n" id="ownPrev" aria-live="polite"></div>
      <p class="pwarn" id="ownErr" hidden></p>
      <div class="pchips" style="margin-top:10px">
        <button type="button" class="pchip seg" data-g="simplify">${t('ownSimplify')}</button>
        <button type="button" class="pchip seg" data-g="factor">${t('ownFactor')}</button>
        <button type="button" class="pchip seg" data-g="solve" hidden>${t('ownSolve')}</button>
      </div>
      <div class="ownu" id="ownU" hidden><span class="plabel">${t('ownUnknown')}</span><span class="pchips" id="ownUs"></span></div>
      <div class="row" style="margin-top:16px"><button class="tool main" type="submit">${t('ownGo')} →</button></div>
    </form>
    <div class="plabel">${t('ownExamples')}</div>
    <div class="pchips">${OWN_EXAMPLES.map(e => `<button type="button" class="pchip ex" data-ex="${e}">${e}</button>`).join('')}</div>`);
  const input = host.querySelector('#ownIn'), prev = host.querySelector('#ownPrev'), errEl = host.querySelector('#ownErr');
  let goal = ui.own.goal, touched = !!ui.own.goal, unknown = ui.own.unknown || null;
  input.value = ui.own.src;
  // an equation with several letters: which one is the unknown (x when there is one)
  const unknownChips = () => {
    const r = input.value.includes('=') ? parseProblem(input.value, 'solve', unknown) : null;
    const ls = r && r.S ? letters(r.S).sort() : r && (r.err === 'pEqWhich' || r.err === 'pEqUnknown') ? letters(parseProblem(input.value.split('=').join('+'), 'simplify').S || { parts: [] }).sort() : [];
    if (unknown && !ls.includes(unknown)) unknown = null;
    host.querySelector('#ownU').hidden = ls.length < 2;
    const cur = unknown || (r && r.S ? unknownOf(r.S) : null);
    host.querySelector('#ownUs').innerHTML = ls.map(b => `<button type="button" class="pchip seg${b === cur ? ' on' : ''}" data-u="${b}" aria-pressed="${b === cur}">${bx(b)}</button>`).join('');
    host.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => { unknown = b.dataset.u; update(); }));
  };
  const update = () => {
    const eq = input.value.includes('=');   // an equation is always solved; the other two goals don't apply
    if (eq) goal = 'solve'; else if (!touched || goal === 'solve') goal = guessGoal(input.value);
    host.querySelectorAll('[data-g]').forEach(b => {
      const on = b.dataset.g === goal; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.hidden = eq ? b.dataset.g !== 'solve' : b.dataset.g === 'solve';
    });
    const r = input.value.trim() ? parseProblem(input.value, goal, eq ? unknown : undefined) : null;
    prev.innerHTML = r && !r.err ? stateHTML(r.S) : '';
    errEl.hidden = true;
    unknownChips();
    return r;
  };
  host.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { goal = b.dataset.g; touched = true; update(); }));
  host.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.ex; touched = false; update(); input.focus(); }));
  input.addEventListener('input', update);
  host.querySelector('#ownForm').addEventListener('submit', e => {
    e.preventDefault();
    const r = parseProblem(input.value, goal, goal === 'solve' ? unknown : undefined);
    const fail = (k, p) => { errEl.innerHTML = t(k, p); errEl.hidden = false; input.focus(); };
    if (r.err) { fail(r.err, { ch: r.ch, ...(r.p || {}) }); if (r.at != null) input.setSelectionRange(r.at, r.at + 1); return; }
    if (isClean(r.S)) return fail('ownClean');
    ui.own = { src: input.value, goal: touched ? goal : null, unknown }; store.set('own', ui.own);
    ui.S = r.S; earn(ui.S, null);
    ui.S.unsure = autoSolve(JSON.parse(JSON.stringify(ui.S))) == null;
    closeSheet(); ui.mode = 'custom'; ui.session = { solved: 0, streak: 0 }; startBoard();
  });
  update();
  setTimeout(() => input.focus(), 50);
}
