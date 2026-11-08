/* The UI state everyone shares (ui.S, ui.busy, ui.sel …: one object, since modules can't assign each other's bindings), local storage, and the board's DOM handles. */
import { LEVELS } from '../content/levels.js';
import { setLang } from '../i18n.js';

export const store = { get(k, d) { try { const v = localStorage.getItem('alg-cleanup:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('alg-cleanup:' + k, JSON.stringify(v)); } catch {} } };
setLang(store.get('lang', (navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en'));
export const ui = {
  lvl: Math.min(store.get('level', 0), LEVELS.length - 1),
  best: store.get('best', {}),
  S: undefined,
  history: undefined,
  moves: undefined,
  sel: undefined,
  born: undefined,
  hintIds: undefined,
  lastNote: undefined,
  busy: false,
  won: false,
  balancing: false,
  balBranch: 0,
  mode: 'levels',
  initial: null,
  sheetFn: null,
  prac: store.get('practice', { topics: ['powers', 'like', 'frac'], d: 1 }),
  session: { solved: 0, streak: 0 },
  own: store.get('own', { src: '', goal: null }),
  lastHint: null,
  block: null,
  detached: new Set(),
  bdrag: null,
  drag: null,
  suppressClick: false,
};

export const $ = id => document.getElementById(id);
export const board = $('board'), note = $('note');
export const snap = () => JSON.stringify({ S: ui.S, moves: ui.moves });
