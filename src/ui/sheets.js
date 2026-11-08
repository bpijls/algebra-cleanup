/* Sheets: the win sheet (with conditions, the abc reveal, and a finished skill), opening and closing sheets. */
import { newlyOpen, nextInSkill, skillDone, suggested } from '../content/progress.js';
import { LEVELS, SKILL_LIST, levelIndex, skillOfLevel } from '../content/registry.js';
import { lang, t } from '../i18n.js';
import { condHTML, mx, sqHTML, stateHTML } from '../render/text.js';
import { loadLevel, nextProblem } from './controller.js';
import { showMap, showSkill } from './map.js';
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
        <p style="margin-bottom:0">${t({ factor: 'winSubF', solve: 'winSubS', prove: 'winSubP', combine: 'winSubC' }[ui.S.goal] || 'winSub')}</p>
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
  const id = LEVELS[ui.lvl].id, K = skillOfLevel(id);
  if (!refresh) {
    ui.doneBefore = { ...ui.done };
    if (ui.done[id] == null || ui.moves < ui.done[id]) { ui.done = { ...ui.done, [id]: ui.moves }; store.set('done', ui.done); }
    board.classList.add('won'); render();
  }
  // the next level of this skill; after its last: the skill is complete, and maybe new skills opened
  const next = nextInSkill(id), opened = next ? [] : newlyOpen(ui.doneBefore || ui.done, ui.done);
  const all = SKILL_LIST.every(S => skillDone(S, ui.done));
  const onward = next ? null : opened[0] || suggested(ui.done);
  const show = () => {
    const host = openSheet(`
      <h2>${t('win')}</h2>
      <p style="margin-bottom:0">${t({ factor: 'winSubF', solve: 'winSubS', prove: 'winSubP', combine: 'winSubC' }[ui.S.goal] || 'winSub')}</p>
      <div class="result expr-n">${stateHTML(ui.S)}</div>${condsHTML()}
      <p>${t('winMoves', { n: ui.moves })}${t('winBest', { n: ui.done[id] })}</p>
      ${LEVELS[ui.lvl].abc ? `<div class="abc">${abcHTML(LEVELS[ui.lvl].abc)}</div>` : ''}
      ${!next && K && skillDone(K, ui.done) ? `<p class="skilldone">${t('skillDone', { s: `<b>${K.title[lang]}</b>` })}${opened.length ? ' ' + t('skillsOpened', { list: opened.map(S => `<b>${S.title[lang]}</b>`).join(', ') }) : all ? ' ' + t('allDone') : ''}</p>` : ''}
      <div class="row">
        ${next ? `<button class="tool main" type="button" id="wNext">${t('next')} →</button>`
          : onward ? `<button class="tool main" type="button" id="wOnward">${t('nextSkill', { s: onward.title[lang] })} →</button>` : ''}
        <button class="tool" type="button" id="wReplay">${t('replay')}</button>
        <button class="tool" type="button" id="wLevels">${t('mapTitle')}</button>
      </div>`);
    host.querySelector('#wNext')?.addEventListener('click', () => { closeSheet(); loadLevel(levelIndex(next)); });
    host.querySelector('#wOnward')?.addEventListener('click', () => { closeSheet(); ui.won = false; showSkill(onward); });
    host.querySelector('#wReplay').addEventListener('click', () => { closeSheet(); loadLevel(ui.lvl); });
    host.querySelector('#wLevels').addEventListener('click', () => { closeSheet(); ui.won = false; showMap(); });
    (host.querySelector('#wNext') || host.querySelector('#wOnward') || host.querySelector('#wReplay')).focus();
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
