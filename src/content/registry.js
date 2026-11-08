/* The content registry: levels and the skills they belong to. A leaf module (no imports), so a topic can
   register its levels and skill in any load order. A skill is a node of the skill tree: it needs other skills
   first (`requires`), holds levels by id, and names the practice generators (`gen`, keys of GEN) for it. */
export const LEVELS = [];        // every level, in registration order; a level's index is how the game loads it
export const SKILLS = {};        // id -> skill
export const SKILL_LIST = [];    // in registration order
export const FIELDS = ['algebra', 'goniometry', 'calculus', 'logic', 'applied'];

// defineLevel({ id, s, en, nl, goal?, book?, abc? }): s() builds the start state
export function defineLevel(L) {
  if (LEVELS.some(M => M.id === L.id)) throw new Error('level defined twice: ' + L.id);
  LEVELS.push(L);
  return L;
}
// defineSkill(id, { field, requires, title: {en, nl}, blurb: {en, nl}, glyph, levels: [level ids], gen: [GEN keys] })
export function defineSkill(id, spec) {
  if (SKILLS[id]) throw new Error('skill defined twice: ' + id);
  const K = { id, requires: [], levels: [], gen: [], field: 'algebra', ...spec };
  SKILLS[id] = K; SKILL_LIST.push(K);
  return K;
}

export const levelIndex = id => LEVELS.findIndex(L => L.id === id);
export const skillOfLevel = id => SKILL_LIST.find(K => K.levels.includes(id));
export function buildLevel(i) { const S = LEVELS[i].s(); S.op = S.op || null; S.goal = LEVELS[i].goal || 'simplify'; return S; }
