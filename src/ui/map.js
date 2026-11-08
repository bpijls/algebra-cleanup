/* The skill map: every skill as a node, one row below the skills it needs, with lines between them. Tapping a
   node opens its card (its levels, Play, Practise). In pick mode (Practice) tapping a node picks it instead, and a
   bar at the bottom starts practising the picked skills. Locking is soft: a skill that needs others first says
   so, and can be played anyway. */
import { needs, nextLevelIn, skillDone, skillOpen, suggested, tiers, wonIn } from '../content/progress.js';
import { LEVELS, SKILLS, SKILL_LIST, levelIndex } from '../content/registry.js';
import { lang, t } from '../i18n.js';
import { loadLevel, nextProblem } from './controller.js';
import { closeSheet, openSheet } from './sheets.js';
import { $, store, ui } from './state.js';

const title = K => K.title[lang] || K.title.en;
const LOCK = '<svg class="nlock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none"/></svg>';
let view = null;   // { el, pick }

export function closeMap() { if (view) { view.el.remove(); view = null; window.removeEventListener('resize', drawEdges); } }
export const mapOpen = () => !!view;

export function showMap(opts = {}) {
  closeMap();
  const pick = !!opts.pick, cur = LEVELS[ui.lvl] && SKILL_LIST.find(K => K.levels.includes(LEVELS[ui.lvl].id));
  const next = suggested(ui.done, cur && cur.id);
  const rows = tiers();
  const node = K => {
    const k = wonIn(K, ui.done), n = K.levels.length, done = k === n, open = skillOpen(K, ui.done), picked = pick && ui.prac.skills.includes(K.id);
    const state = done ? t('mapDone') : open ? t('mapWon', { k, n }) : t('mapLocked');
    const cls = ['node', done ? 'done' : '', open ? '' : 'locked', !pick && next === K ? 'next' : '', picked ? 'picked' : '', K.field].filter(Boolean).join(' ');
    const ring = 2 * Math.PI * 30, frac = n ? k / n : 0;
    return `<li><button type="button" class="${cls}" data-skill="${K.id}" ${pick ? `aria-pressed="${picked}"` : ''} aria-label="${title(K)}, ${state}">
      <span class="nface"><svg class="nring" viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="30"/><circle class="nfill" cx="34" cy="34" r="30" stroke-dasharray="${ring * frac} ${ring}"/></svg>
        <span class="nglyph${[...K.glyph].length > 5 ? ' long' : ''}">${K.glyph}</span>${open ? '' : LOCK}${pick ? '<span class="ncheck" aria-hidden="true">✓</span>' : ''}</span>
      <span class="ntitle">${title(K)}</span></button></li>`;
  };
  const el = document.createElement('div');
  el.className = 'map' + (pick ? ' picking' : '');
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'mapTitle');
  el.innerHTML = `
    <header class="maphead">
      <div><h2 id="mapTitle">${t(pick ? 'pickTitle' : 'mapTitle')}</h2><p>${t(pick ? 'pickIntro' : 'mapIntro')}</p></div>
      <button type="button" class="mapclose" aria-label="${t('closeBtn')}">×</button>
    </header>
    <div class="mapscroll"><div class="mapinner"><svg class="mapedges" aria-hidden="true"></svg>
      <ol class="maprows">${rows.map(r => `<li><ul class="maprow">${r.map(node).join('')}</ul></li>`).join('')}</ol>
    </div></div>
    ${pick ? `<div class="mapbar"><span class="mapcount" aria-live="polite"></span>
      <div class="seg" role="group" aria-label="${t('difficulty')}">${[1, 2, 3].map(d => `<button type="button" class="pchip seg${ui.prac.d === d ? ' on' : ''}" data-d="${d}" aria-pressed="${ui.prac.d === d}">${t('d' + d)}</button>`).join('')}</div>
      <button type="button" class="tool main" id="mapStart">${t('pickStart')} →</button></div>` : ''}`;
  document.body.append(el);
  view = { el, pick };
  el.querySelector('.mapclose').onclick = closeMap;
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('sheetHost').children.length) closeMap(); });
  el.querySelectorAll('[data-skill]').forEach(b => b.addEventListener('click', () => {
    const K = SKILLS[b.dataset.skill];
    if (!pick) return showSkill(K);
    const on = !ui.prac.skills.includes(K.id);
    ui.prac.skills = on ? [...ui.prac.skills, K.id] : ui.prac.skills.filter(x => x !== K.id);
    b.classList.toggle('picked', on); b.setAttribute('aria-pressed', String(on)); count();
  }));
  const count = () => {
    if (!pick) return;
    el.querySelector('.mapcount').textContent = t('pickCount', { n: ui.prac.skills.length });
    el.querySelector('#mapStart').disabled = !ui.prac.skills.length;
  };
  if (pick) {
    el.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
      ui.prac.d = +b.dataset.d;
      el.querySelectorAll('[data-d]').forEach(x => { const on = +x.dataset.d === ui.prac.d; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    }));
    el.querySelector('#mapStart').onclick = () => startPractice(ui.prac.skills, ui.prac.d);
    count();
  }
  window.addEventListener('resize', drawEdges);
  drawEdges();
  document.fonts?.ready.then(drawEdges);
  // bring the suggested skill (or the first picked one) into view
  const focus = el.querySelector(pick ? '.node.picked' : '.node.next') || el.querySelector('.node');
  focus.scrollIntoView({ block: 'center' }); focus.focus({ preventScroll: true });
}

// a line from each skill to every skill that needs it: solid when that skill is finished, dashed while it isn't
function drawEdges() {
  if (!view) return;
  const inner = view.el.querySelector('.mapinner'), svg = view.el.querySelector('.mapedges'), box = inner.getBoundingClientRect();
  // from below a skill's title to the top of the circle of each skill it opens
  const face = id => view.el.querySelector(`[data-skill="${id}"] .nface`).getBoundingClientRect();
  const foot = id => view.el.querySelector(`[data-skill="${id}"]`).getBoundingClientRect();
  svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
  svg.innerHTML = SKILL_LIST.flatMap(K => K.requires.filter(r => SKILLS[r]).map(r => {
    const a = foot(r), b = face(K.id);
    const x1 = a.left + a.width / 2 - box.left, y1 = a.bottom - box.top + 4, x2 = b.left + b.width / 2 - box.left, y2 = b.top - box.top - 2;
    const m = (y2 - y1) / 2;
    return `<path class="${skillDone(SKILLS[r], ui.done) ? 'met' : ''}" d="M${x1},${y1} C${x1},${y1 + m} ${x2},${y2 - m} ${x2},${y2}"/>`;
  })).join('');
}

// a skill's card: what it teaches, what it needs first, its levels, play and practise
export function showSkill(K) {
  ui.sheetFn = () => showSkill(K);
  const miss = needs(K, ui.done), k = wonIn(K, ui.done);
  const chips = K.levels.map((id, i) => `<button type="button" class="lvlchip${ui.done[id] != null ? ' done' : ''}${LEVELS[ui.lvl]?.id === id ? ' cur' : ''}" data-l="${id}" aria-label="${t('level', { n: i + 1 })}${ui.done[id] != null ? ' ✓' : ''}">${ui.done[id] != null ? '✓' : i + 1}</button>`).join('');
  const playKey = miss.length ? 'playAnyway' : k === 0 ? 'playBtn' : k === K.levels.length ? 'replaySkill' : 'continueBtn';
  const host = openSheet(`
    <div class="skillhead"><span class="nglyph big">${K.glyph}</span><div><h2>${title(K)}</h2><p>${K.blurb[lang] || K.blurb.en}</p></div></div>
    ${miss.length ? `<p class="needs">${t('needsFirst', { list: miss.map(r => `<b>${title(SKILLS[r])}</b>`).join(', ') })}</p>` : ''}
    <div class="plabel">${t('mapWon', { k, n: K.levels.length })}</div><div class="lvlchips">${chips}</div>
    <div class="row" style="margin-top:16px"><button type="button" class="tool main" id="kPlay">${t(playKey)} →</button></div>
    ${K.gen.length ? `<div class="plabel">${t('practice')}</div><div class="row">${[1, 2, 3].map(d => `<button type="button" class="tool" data-pd="${d}">${t('d' + d)}</button>`).join('')}</div>` : ''}`);
  const play = id => { closeSheet(); closeMap(); loadLevel(levelIndex(id)); };
  host.querySelector('#kPlay').onclick = () => play(k === K.levels.length ? K.levels[0] : nextLevelIn(K, ui.done));
  host.querySelectorAll('[data-l]').forEach(b => b.onclick = () => play(b.dataset.l));
  host.querySelectorAll('[data-pd]').forEach(b => b.onclick = () => startPractice([K.id], +b.dataset.pd));
  host.querySelector('#kPlay').focus();
}

export function startPractice(skills, d) {
  ui.prac = { skills, d }; store.set('practice2', ui.prac); ui.session = { solved: 0, streak: 0 };
  closeSheet(); closeMap(); ui.mode = 'practice'; nextProblem();
}
