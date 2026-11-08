/* Progress through the skill tree, as pure functions of `won` (level id -> fewest moves). No DOM, no storage:
   ui/state.js keeps `won` in local storage, and the tests call these directly. */
import { LEVELS, SHORTCUTS, SKILLS, SKILL_LIST, skillOfLevel } from './registry.js';

// the shortcuts a player may use in a skill: earned by finishing the skill that teaches them, or counted on by a
// skill that builds on it (played anyway, soft lock); never inside the skill that teaches them by hand
export function earnedFor(skillId, won) {
  const below = new Set(), add = id => { for (const r of SKILLS[id]?.requires || []) if (!below.has(r)) { below.add(r); add(r); } };
  if (skillId) add(skillId);
  return SHORTCUTS.filter(c => c.skill !== skillId && SKILLS[c.skill] && (skillDone(SKILLS[c.skill], won) || below.has(c.skill))).map(c => c.id);
}
export const skillDone = (K, won) => K.levels.every(id => won[id] != null);
export const wonIn = (K, won) => K.levels.filter(id => won[id] != null).length;
// what a skill still needs first (empty: it is open)
export const needs = (K, won) => K.requires.filter(r => !skillDone(SKILLS[r], won));
export const skillOpen = (K, won) => !needs(K, won).length;
// where to go in a skill: the first level not yet won, else its first
export const nextLevelIn = (K, won) => K.levels.find(id => won[id] == null) || K.levels[0];
// the level after this one in its skill, or null at the end of the skill
export function nextInSkill(levelId) {
  const K = skillOfLevel(levelId), i = K ? K.levels.indexOf(levelId) : -1;
  return i >= 0 && i < K.levels.length - 1 ? K.levels[i + 1] : null;
}
// skills that became open between two progress states (after winning a skill's last level)
export const newlyOpen = (before, after) => SKILL_LIST.filter(K => !skillOpen(K, before) && skillOpen(K, after));

// the map's rows: a skill sits one row below the lowest skill it needs. Within a row, skills are ordered by where
// the skills they need sit (one barycentre sweep), so the lines between rows cross as little as possible.
export function tiers(list = SKILL_LIST) {
  const depth = {}, ids = new Set(list.map(K => K.id));
  const d = K => depth[K.id] ??= 1 + Math.max(-1, ...K.requires.filter(r => ids.has(r)).map(r => d(SKILLS[r])));
  list.forEach(d);
  const rows = [];
  list.forEach(K => (rows[depth[K.id]] ||= []).push(K));
  const pos = {};
  rows.forEach(row => {
    const at = K => { const ps = K.requires.filter(r => pos[r] != null); return ps.length ? ps.reduce((a, r) => a + pos[r], 0) / ps.length : 0.5; };
    row.sort((A, B) => at(A) - at(B) || FIELD_ORDER(A) - FIELD_ORDER(B));
    row.forEach((K, i) => { pos[K.id] = (i + 0.5) / row.length; });
  });
  return rows;
}
const FIELD_ORDER = K => ['algebra', 'goniometry', 'calculus', 'logic', 'applied'].indexOf(K.field);
// the skill to suggest: the one being played if it isn't finished, else the first open, unfinished skill by row
export function suggested(won, current) {
  const K = current && SKILLS[current];
  if (K && !skillDone(K, won) && skillOpen(K, won)) return K;
  return tiers().flat().find(S => skillOpen(S, won) && !skillDone(S, won)) || null;
}

// before the skill tree, progress was kept by level number: these are those 51 levels, in that order
export const LEGACY_ORDER = ['powers.1', 'powers.2', 'powers.3', 'powers.4', 'like.1', 'like.2', 'powers.5', 'fracpow.1', 'fracpow.2',
  'powers.6', 'fracpow.3', 'book.1', 'book.2', 'fracpow.4', 'book.3', 'brackets.1', 'brackets.2', 'double.1', 'double.2',
  'factor.1', 'factor.2', 'factor.3', 'factor.4', 'factor.5', 'sumproduct.1', 'sumproduct.2',
  'linear.1', 'linear.2', 'linear.3', 'linear.4', 'linear.5', 'linear.6', 'linear.7',
  'quadratic.1', 'quadratic.2', 'quadratic.3', 'quadratic.4', 'quadratic.5', 'quadratic.6', 'quadratic.7', 'quadratic.8',
  'formulas.1', 'formulas.2', 'formulas.3', 'genquad.1', 'genquad.2', 'genquad.3', 'genquad.4', 'logs.1', 'logs.2', 'logs.3'];
// old `best` ({ index: moves }) and `level` (an index) -> `won` and the level id to start on
export function migrate(best, level) {
  const won = {};
  for (const [i, m] of Object.entries(best || {})) if (LEGACY_ORDER[i]) won[LEGACY_ORDER[i]] = m;
  const id = LEGACY_ORDER[level] || LEGACY_ORDER[0];
  return { won, level: LEVELS.some(L => L.id === id) ? id : LEVELS[0].id };
}
