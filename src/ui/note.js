/* The note under the board: say() a message, sayIntro() for a level. */
import { LEVELS } from '../content/registry.js';
import { lang, t } from '../i18n.js';
import { note, ui } from './state.js';

export function say(key, p, type = 'info', raw) {
  ui.lastNote = { key, p, type, raw };
  note.className = 'note ' + type;
  note.innerHTML = raw ? raw[lang] : t(key, p);
}
export function sayIntro() {
  if (ui.mode === 'custom') return say(ui.S.unsure ? 'ownUnsure' : ui.S.goal === 'factor' ? 'ti_customF' : ui.S.goal === 'solve' ? 'ti_customS' : 'ti_custom', {}, ui.S.unsure ? 'warn' : 'info');
  if (ui.mode === 'practice') return say('ti_' + ui.S.topic, {}, 'info');
  say(null, null, 'info', { en: LEVELS[ui.lvl].en, nl: LEVELS[ui.lvl].nl });
}
