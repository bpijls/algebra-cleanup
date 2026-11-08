/* Sheets: the win sheet (with conditions and the abc reveal), the level list. */
import { LEVELS } from '../content/levels.js';
import { lang, t } from '../i18n.js';
import { condHTML, mx, sqHTML, stateHTML } from '../render/text.js';
import { loadLevel, nextProblem } from './controller.js';
import { showOwn } from './own.js';
import { showPractice } from './practice.js';
import { $, board, store, ui } from './state.js';
import { render } from './tiles.js';

export function closeSheet() { $('sheetHost').replaceChildren(); ui.sheetFn = null; }
export function openSheet(html) {
  const host = $('sheetHost');
  host.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  host.querySelector('.scrim').addEventListener('click', e => { if (e.target.classList.contains('scrim') && !ui.won) closeSheet(); });
  return host;
}
export function win(refresh) {
  ui.won = true;
  if (ui.mode !== 'levels') {
    const custom = ui.mode === 'custom';
    if (!refresh) { ui.session.solved++; ui.session.streak++; store.set('solvedTotal', store.get('solvedTotal', 0) + 1); board.classList.add('won'); render(); }
    const show = () => {
      const host = openSheet(`
        <h2>${t('win')}</h2>
        <p style="margin-bottom:0">${t(ui.S.goal === 'factor' ? 'winSubF' : ui.S.goal === 'solve' ? 'winSubS' : 'winSub')}</p>
        <div class="result expr-n">${stateHTML(ui.S)}</div>${condsHTML()}
        <p>${t('winMoves', { n: ui.moves })} ${t('winPractice', { n: ui.session.solved })}</p>
        <div class="row">
          <button class="tool main" type="button" id="wNext">${t(custom ? 'ownAnother' : 'nextProblem')} →</button>
          <button class="tool" type="button" id="wTopics">${t('changeTopics')}</button>
        </div>`);
      host.querySelector('#wNext').addEventListener('click', () => { if (custom) { ui.won = false; return showOwn(); } closeSheet(); nextProblem(); });
      host.querySelector('#wTopics').addEventListener('click', () => { closeSheet(); ui.won = false; showPractice(); });
      host.querySelector('#wNext').focus();
    };
    refresh ? show() : setTimeout(show, 650);
    return;
  }
  if (!refresh) {
    if (ui.best[ui.lvl] == null || ui.moves < ui.best[ui.lvl]) { ui.best[ui.lvl] = ui.moves; store.set('best', ui.best); }
    board.classList.add('won'); render();
  }
  const last = ui.lvl === LEVELS.length - 1;
  const show = () => {
    const host = openSheet(`
      <h2>${t('win')}</h2>
      <p style="margin-bottom:0">${t(ui.S.goal === 'factor' ? 'winSubF' : ui.S.goal === 'solve' ? 'winSubS' : 'winSub')}</p>
      <div class="result expr-n">${stateHTML(ui.S)}</div>${condsHTML()}
      <p>${t('winMoves', { n: ui.moves })}${t('winBest', { n: ui.best[ui.lvl] })}${last ? ' ' + t('allDone') : ''}</p>
      ${LEVELS[ui.lvl].abc ? `<div class="abc">${abcHTML(LEVELS[ui.lvl].abc)}</div>` : ''}
      <div class="row">
        ${last ? '' : `<button class="tool main" type="button" id="wNext">${t('next')} →</button>`}
        <button class="tool" type="button" id="wReplay">${t('replay')}</button>
        <button class="tool" type="button" id="wLevels">${t('levels')}</button>
      </div>`);
    host.querySelector('#wNext')?.addEventListener('click', () => { closeSheet(); loadLevel(ui.lvl + 1); });
    host.querySelector('#wReplay').addEventListener('click', () => { closeSheet(); loadLevel(ui.lvl); });
    host.querySelector('#wLevels').addEventListener('click', () => { closeSheet(); ui.won = false; showLevels(); });
    (host.querySelector('#wNext') || host.querySelector('#wReplay')).focus();
  };
  refresh ? show() : setTimeout(show, 650);
}
// a − c ≠ 0, b² − 4ac ≥ 0: what dividing by letters and taking roots of them took for granted
const condsHTML = () => ui.S.conds && ui.S.conds.length ? `<p class="conds">${t('condsLine', { c: ui.S.conds.map(condHTML).join(lang === 'nl' ? ' en ' : ' and ') })}</p>` : '';
// the last quadratic level: what the player did, written for every a, b, c, is the abc-formula
function abcHTML(abc) {
  if (abc === 'generic') {
    const fr = (top, bot) => `<span class="nfrac"><span class="nn">${top}</span><span class="nd">${bot}</span></span>`;
    return t('abcRevealG', { f: mx(`<i class="mv">x</i> = ${fr(`−<i class="mv">b</i> ± ${sqHTML('<i class="mv">b</i><sup>2</sup> − 4<i class="mv">a</i><i class="mv">c</i>')}`, `2<i class="mv">a</i>`)}`) });
  }
  const { a, b, c } = abc;
  const v = n => n < 0 ? '−' + -n : String(n), d = b * b - 4 * a * c;
  const fr = (top, bot) => `<span class="nfrac"><span class="nn">${top}</span><span class="nd">${bot}</span></span>`;
  const f = mx(`<i class="mv">x</i> = ${fr(`−<i class="mv">b</i> ± ${sqHTML('<i class="mv">b</i><sup>2</sup> − 4<i class="mv">a</i><i class="mv">c</i>')}`, `2<i class="mv">a</i>`)}`);
  const ex = mx(`<i class="mv">x</i> = ${fr(`${v(-b)} ± ${sqHTML(`${b * b} ${-4 * a * c < 0 ? '−' : '+'} ${Math.abs(4 * a * c)}`)}`, 2 * a)} = ${fr(`${v(-b)} ± ${sqHTML(d)}`, 2 * a)}`);
  return t('abcReveal', { f, a: v(a), b: v(b), c: v(c), ex });
}
export function showLevels() {
  ui.sheetFn = showLevels;
  const btns = LEVELS.map((L, i) => `<button type="button" class="lvlbtn${ui.best[i] != null ? ' done' : ''}${i === ui.lvl ? ' cur' : ''}${L.book ? ' book' : ''}" data-l="${i}">
      ${ui.best[i] != null ? '✓ ' : ''}${i + 1}<small>${L.book ? t('book') : L.goal === 'factor' ? t('factorBadge') : L.goal === 'solve' ? t('solveBadge') : ui.best[i] != null ? t('best', { n: ui.best[i] }).replace(' · ', '') : '&nbsp;'}</small></button>`).join('');
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('chooseLevel')}</h2><div class="lvlgrid">${btns}</div>`);
  host.querySelectorAll('.lvlbtn').forEach(b => b.addEventListener('click', () => { closeSheet(); loadLevel(+b.dataset.l); }));
}
