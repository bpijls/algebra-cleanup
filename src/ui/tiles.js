/* Rendering the board: a tile per piece, sides, branches, the tool bar. */
import { expText, showsExp } from '../core/kinds/exponent.js';
import { LEVELS, SKILLS, skillOfLevel } from '../content/registry.js';
import { loneSquare } from '../core/balance.js';
import { sumKey } from '../core/kinds/sums.js';
import { canMerge, isOne, locate } from '../core/model.js';
import { opGather, partnersOf } from '../core/moves.js';
import { branchOf, isEquation, isRight, relOf } from '../core/problem.js';
import { opExplode } from '../core/rules/engine.js';
import { lang, t } from '../i18n.js';
import { fx, mx, stateHTML, sumHTML } from '../render/text.js';
import { balSync } from './balance.js';
import { run } from './controller.js';
import { SVGNS } from './input.js';
import { fitBoard } from './layout.js';
import { previewOf, showExpand, splitTermOf } from './split.js';
import { expandTarget } from '../core/fractions.js';
import { opToHalf, opToNeg } from '../core/exponents.js';
import { $, board, ui } from './state.js';

const VARCOL = { a: '--va', b: '--vb', x: '--vx', y: '--vy' };
/* the picked bracket and its twins in other terms, when they can go outside brackets together */
function blockOf(S, sel) {
  if (!sel || sel.t !== 'f' || ui.balancing) return null;
  const L = locate(S, sel.id);
  if (!L || L.f.k !== 'p' || L.depth) return null;
  const key = sumKey(L.f.terms), partners = partnersOf(S, sel), ids = new Set([L.f.id]);
  L.terms.forEach(t => t.f.forEach(f => { if (f.k === 'p' && f.e === L.f.e && partners.has(f.id) && sumKey(f.terms) === key) ids.add(f.id); }));
  return ids.size > 1 ? { key, ids, L } : null;
}
// the ² of a lone square, as a tile of its own: drag it across the = to take the root of both sides
function powEl(f) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tile pw'; b.dataset.id = -f.id; b.textContent = '2';
  b.setAttribute('aria-label', 'squared');
  if (ui.hintIds.has(-f.id)) b.classList.add('hint');
  if (ui.born.has(f.id)) b.classList.add('born');
  return b;
}
// a kind's own tile (its pieces inside are tiles too, through sideEl): defineTile(k, (f, partners, sideEl) => element)
const TILES = {};
// extra move buttons for a selected piece, from topics: defineToolMove(id, (S, pieceId) => move). The button shows
// what the move does (a dry run, like the others) and only appears when the move would be accepted.
const TOOL_MOVES = [];
export const defineToolMove = (id, move) => { TOOL_MOVES.push({ id, move }); };
export const defineTile = (k, make) => { TILES[k] = make; };
// written back as a power (levels with negative or half exponents): 1/a² = a⁻², √a = a^½
defineToolMove('toNeg', opToNeg);
defineToolMove('toHalf', opToHalf);
// the state a tile shows: picked, a partner of the picked one, hinted, just made
function mark(b, f, partners) {
  if (ui.sel && ui.sel.t === 'f' && ui.sel.id === f.id) b.classList.add('sel');
  if (partners.has(f.id)) b.classList.add('partner');
  if (ui.hintIds.has(f.id)) b.classList.add('hint');
  if (ui.born.has(f.id)) b.classList.add('born');
  return b;
}
function tileEl(f, partners) {
  if (TILES[f.k]) return mark(TILES[f.k](f, partners, sideEl), f, partners);
  if (f.k === 'r') {   // √ with a bar over what is inside; the pieces inside are tiles of their own
    const b = document.createElement('div');
    b.className = 'tile r'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'root');
    const body = document.createElement('div'); body.className = 'rbody'; body.append(sideEl(f.terms, partners));
    const hook = document.createElementNS(SVGNS, 'svg'); hook.setAttribute('class', 'rsvg'); hook.setAttribute('viewBox', '0 0 23 100'); hook.setAttribute('preserveAspectRatio', 'none'); hook.setAttribute('aria-hidden', 'true');
    hook.innerHTML = '<path d="M1 62 L6 55 L12.5 100 L23 0"/>';
    b.append(hook, Object.assign(document.createElement('span'), { className: 'rs', textContent: '√' }), body);
    if (ui.sel && ui.sel.t === 'f' && ui.sel.id === f.id) b.classList.add('sel');
    if (ui.hintIds.has(f.id)) b.classList.add('hint');
    if (ui.born.has(f.id)) b.classList.add('born');
    return b;
  }
  if (f.k === 'q') {   // a fraction inside a sum: its top and bottom are tiles of their own; tap the bar to pick it
    const b = document.createElement('div');
    b.className = 'tile q'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'fraction');
    b.append(sideEl(f.num, partners), Object.assign(document.createElement('div'), { className: 'qbar' }), sideEl(f.den, partners));
    return mark(b, f, partners);
  }
  if (f.k === 'p' && ui.block && ui.block.ids.has(f.id)) {
    const b = document.createElement('div');
    b.className = 'tile p block'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button');
    b.innerHTML = fx({ k: 'bk', terms: f.terms, e: f.e });
    b.setAttribute('aria-label', 'block');
    if (ui.sel && ui.sel.t === 'f' && ui.sel.id === f.id) b.classList.add('sel');
    if (partners.has(f.id)) b.classList.add('partner');
    return b;
  }
  if (f.k === 'p') {
    const b = document.createElement('div');
    b.className = 'tile p'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button');
    b.setAttribute('aria-label', 'brackets');
    const l = document.createElement('span'); l.className = 'paren'; l.textContent = '(';
    const r = document.createElement('span'); r.className = 'paren'; r.textContent = ')';
    b.append(l, sideEl(f.terms, partners), r);
    if (f.e > 1 && !ui.detached.has(f.id)) { const sp = document.createElement('sup'); sp.textContent = f.e; b.append(sp); b.setAttribute('aria-label', `brackets to the power ${f.e}`); }
    if (ui.sel && ui.sel.t === 'f' && ui.sel.id === f.id) b.classList.add('sel');
    if (partners.has(f.id)) b.classList.add('partner');
    if (ui.hintIds.has(f.id)) b.classList.add('hint');
    if (ui.born.has(f.id)) b.classList.add('born');
    return b;
  }
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tile ' + f.k; b.dataset.id = f.id;
  if (f.k === 'n') { b.textContent = f.v; b.setAttribute('aria-label', String(f.v)); }
  else if (f.k === 'v') {
    b.style.setProperty('--c', `var(${VARCOL[f.b] || '--vz'})`);
    b.innerHTML = `${f.b}${showsExp(f.e) && !ui.detached.has(f.id) ? `<sup>${expText(f.e)}</sup>` : ''}`;
    b.setAttribute('aria-label', showsExp(f.e) ? `${f.b} to the power ${expText(f.e)}` : f.b);
  } else {
    const inner = f.f.map(m => {
      const c = m.k === 'v' ? ` style="--c:var(${VARCOL[m.b] || '--vz'})"` : '';
      return `<span class="mini ${m.k}"${c}>${m.k === 'n' ? m.v : m.b}${m.k === 'v' && showsExp(m.e) ? `<sup>${expText(m.e)}</sup>` : ''}</span>`;
    }).join('');
    const bare = f.f.length === 1 && f.f[0].k === 'n';   // 2³: a power of a number needs no brackets
    b.innerHTML = (bare ? inner : `<span class="paren">(</span>${inner}<span class="paren">)</span>`) + (showsExp(f.e) && !ui.detached.has(f.id) ? `<sup>${expText(f.e)}</sup>` : '');
    b.setAttribute('aria-label', (bare ? String(f.f[0].v) : 'bracket') + (showsExp(f.e) ? ` to the power ${expText(f.e)}` : ''));
  }
  if (ui.sel && ui.sel.t === 'f' && ui.sel.id === f.id) b.classList.add('sel');
  if (partners.has(f.id)) b.classList.add('partner');
  if (ui.hintIds.has(f.id)) b.classList.add('hint');
  if (ui.born.has(f.id)) { b.classList.add('born'); b.style.animationDelay = (ui.born.idx++ * 35) + 'ms'; }
  return b;
}
function sideEl(terms, partners) {
  const d = document.createElement('div'); d.className = 'side';
  terms.forEach((term, i) => {
    if (i > 0 || term.neg) { const s = document.createElement('span'); s.className = 'sign'; s.textContent = term.neg ? '−' : '+'; d.append(s); }
    const te = document.createElement('div');
    te.className = 'term' + (terms.length === 1 ? ' solo' : '');
    te.dataset.tid = term.id;
    if (ui.sel && ui.sel.t === 't' && ui.sel.id === term.id) te.classList.add('sel');
    if (partners.has(term.id)) te.classList.add('partner');
    if (ui.hintIds.has(term.id)) te.classList.add('hint');
    term.f.forEach((f, j) => {
      if (j > 0) { const dot = document.createElement('span'); dot.className = 'dot'; te.append(dot); }
      te.append(tileEl(f, partners));
      if (ui.detached.has(f.id)) { te.classList.add('haspw'); te.append(powEl(f)); }
    });
    d.append(te);
  });
  return d;
}
export function render() {
  const partners = partnersOf(ui.S, ui.sel);
  ui.block = blockOf(ui.S, ui.sel);
  ui.detached = new Set(isEquation(ui.S) && ui.S.goal !== 'prove' ? ui.S.parts.map(loneSquare).filter(Boolean).map(f => f.id) : []);
  ui.born.idx = 0;
  const wrap = document.createElement('div'); wrap.className = 'expr';
  const stacked = ui.S.parts.length > 1 && ui.S.op === '/';
  if (stacked) wrap.classList.add('stack');
  if (isEquation(ui.S)) wrap.classList.add('eqs');
  let row = wrap;
  ui.S.parts.forEach((P, pi) => {
    // an equation: one row per branch (x = 3 ∨ x = −3); the = stays with the right-hand side,
    // so a line break can only come before the =
    if (isEquation(ui.S) && !isRight(pi)) {
      if (pi) wrap.append(Object.assign(document.createElement('span'), { className: 'ortag', textContent: t('orWord') }));
      row = wrap.appendChild(Object.assign(document.createElement('div'), { className: 'eqrow' }));
      row.dataset.b = branchOf(pi);
    }
    const host = isEquation(ui.S) ? (isRight(pi) ? row.appendChild(Object.assign(document.createElement('div'), { className: 'eqright' })) : row) : wrap;
    if (pi > 0 && (!isEquation(ui.S) || isRight(pi))) {
      const op = document.createElement('button'); op.type = 'button'; op.dataset.op = '1';
      op.className = stacked ? 'opchip bigbar' : 'opchip';
      op.textContent = stacked ? '' : isEquation(ui.S) ? relOf(ui.S) : ui.S.op;
      op.setAttribute('aria-label', stacked ? 'fraction bar' : isEquation(ui.S) ? 'equals: do the same to both sides' : ui.S.op === ':' ? 'divide' : 'times');
      if (isEquation(ui.S)) { op.classList.add('eq'); op.dataset.b = branchOf(pi); const on = ui.balancing && ui.balBranch === branchOf(pi); op.classList.toggle('on', on); op.setAttribute('aria-pressed', String(on)); }
      if (ui.hintIds.has('op') && (ui.hintIds.bi == null || ui.hintIds.bi === branchOf(pi))) op.classList.add('hint');
      host.append(op);
    }
    const fr = document.createElement('div'); fr.className = 'frac';
    fr.append(sideEl(P.num, partners));
    if (!isOne(P.den) || ui.S.op === '·') {
      let bar;
      if (ui.S.parts.length === 1) {
        bar = document.createElement('button'); bar.type = 'button'; bar.className = 'bar fbar';
        bar.setAttribute('aria-label', 'fraction bar');
      } else { bar = document.createElement('div'); bar.className = 'bar'; }
      fr.append(bar);
      fr.append(sideEl(P.den, partners));
    }
    host.append(fr);
  });
  board.replaceChildren(wrap);
  board.classList.toggle('balancing', ui.balancing);
  fitBoard(wrap);
  $('written').innerHTML = stateHTML(ui.S);

  // chrome
  $('btnLevels').textContent = t('mapTitle');
  $('btnOwn').textContent = t('ownTitle');
  $('btnLang').textContent = lang === 'nl' ? 'English' : 'Nederlands';
  $('btnRestart').textContent = t('restart');
  $('brand').innerHTML = lang === 'nl' ? 'Algebra <span>Opruimen</span>' : 'Algebra <span>Cleanup</span>';
  $('btnPractice').textContent = t('practice');
  $('btnPractice').classList.toggle('on', ui.mode === 'practice');
  $('btnPractice').classList.toggle('on', ui.mode !== 'levels');
  $('btnSkip').hidden = ui.mode === 'levels'; $('btnSkip').querySelector('span').textContent = t(ui.mode === 'custom' ? 'ownSkip' : 'newProblem');
  if (ui.mode === 'custom') {
    $('lvlTitle').textContent = t('practiceTitle');
    $('lvlBadge').hidden = false; $('lvlBadge').textContent = t('tp_custom');
    $('moves').innerHTML = t('moves', { n: ui.moves });
  } else if (ui.mode === 'practice') {
    $('lvlTitle').textContent = t('practiceTitle');
    $('lvlBadge').hidden = false; $('lvlBadge').textContent = (SKILLS[ui.S.skill] ? SKILLS[ui.S.skill].title[lang] : t('tp_' + ui.S.topic)) + ' · ' + t('d' + ui.prac.d);
    $('moves').innerHTML = t('solved', { n: ui.session.solved }) + t('streak', { n: ui.session.streak });
  } else {
    // the skill and where in it: "Powers · 3/6"
    const id = LEVELS[ui.lvl].id, K = skillOfLevel(id);
    $('lvlTitle').textContent = K ? `${K.title[lang]} · ${K.levels.indexOf(id) + 1}/${K.levels.length}` : t('level', { n: ui.lvl + 1 });
    $('lvlBadge').hidden = !LEVELS[ui.lvl].book && !LEVELS[ui.lvl].goal && !ui.S.asPower; $('lvlBadge').textContent = LEVELS[ui.lvl].book ? t('book') : t(ui.S.asPower ? 'asPowerBadge' : ui.S.rel ? 'ineqBadge' : { solve: 'solveBadge', prove: 'proveBadge', combine: 'combineBadge', logic: 'logicBadge', evaluate: 'evaluateBadge' }[LEVELS[ui.lvl].goal] || 'factorBadge');
    $('moves').innerHTML = t('moves', { n: ui.moves }) + (ui.done[id] != null ? t('best', { n: ui.done[id] }) : '');
  }
  $('writtenLabel').textContent = t('written');
  $('btnUndo').querySelector('span').textContent = t('undo');
  $('btnUndo').disabled = !ui.history.length;
  $('btnHint').querySelector('span').textContent = t('hint');
  $('btnDone').querySelector('span').textContent = t('doneBtn'); $('btnDone').setAttribute('aria-label', t('doneLabel'));
  $('btnDone').classList.toggle('hint', ui.hintIds.has('done'));
  $('balPanel').hidden = !ui.balancing;
  if (ui.balancing) {
    $('btnSwap').querySelector('span').textContent = t('balSwapBtn'); $('btnSwap').setAttribute('aria-label', t('balSwap'));
    $('balOps').setAttribute('aria-label', t('balOps')); $('balRange').setAttribute('aria-label', t('balNum'));
    $('balLess').setAttribute('aria-label', t('balLess')); $('balMore').setAttribute('aria-label', t('balMore'));
    $('balGo').classList.toggle('hint', !!(ui.lastHint && ui.lastHint.balance && ui.lastHint.drag == null && ui.hintIds.has('op')));
    balSync(false);
  }
  const fSel = !ui.balancing && ui.sel && ui.sel.t === 'f', tSel = !ui.balancing && ui.sel && ui.sel.t === 't';
  // the move buttons show what they will do, worked out on a copy of the board
  const exLabel = fSel && previewOf(s => opExplode(s, ui.sel.id));
  $('btnExplode').hidden = !exLabel; if (exLabel) $('btnExplode').querySelector('span').innerHTML = exLabel;
  let gatherable = false;
  if (fSel) { const L = locate(ui.S, ui.sel.id); gatherable = L.term.f.filter(f => canMerge(L.f, f)).length >= 3; }
  $('btnGather').hidden = !gatherable;
  if (gatherable) $('btnGather').querySelector('span').innerHTML = previewOf(s => opGather(s, ui.sel.id));
  // from a piece only when factoring (a lone −x is hard to hit as a term); elsewhere it would just be noise
  const twoId = tSel || (fSel && (ui.S.goal === 'factor' || ui.S.goal === 'solve' || ui.S.goal === 'prove' || locate(ui.S, ui.sel.id)?.depth)) ? splitTermOf(ui.sel.id) : null;
  $('btnSplitTwo').hidden = !twoId;
  // expand a fraction (top and bottom times the same thing): the sheet picks what by
  let ex = $('btnExpand');
  if (!ex) {
    ex = Object.assign(document.createElement('button'), { className: 'tool', id: 'btnExpand', type: 'button', innerHTML: '<span></span>' });
    ex.onclick = () => ui.sel && showExpand(ui.sel.id);
    $('btnSplitTwo').after(ex);
  }
  ex.hidden = !(fSel && expandTarget(ui.S, ui.sel.id)) || !!ui.S.exps;   // exponent levels have their own buttons, and the bar is narrow
  ex.querySelector('span').textContent = t('expandBtn') + ' ×ⁿ⁄ₙ';
  for (const tm of TOOL_MOVES) {
    let b = $('tm-' + tm.id);
    if (!b) {
      b = Object.assign(document.createElement('button'), { className: 'tool preview', id: 'tm-' + tm.id, type: 'button', innerHTML: '<span></span>' });
      b.onclick = () => ui.sel && run(s => tm.move(s, ui.sel.id));
      $('btnSplitTwo').after(b);
    }
    const label = fSel && previewOf(s => tm.move(s, ui.sel.id));
    b.hidden = !label; if (label) b.querySelector('span').innerHTML = label;
  }
  if (twoId) $('btnSplitTwo').querySelector('span').innerHTML = mx(sumHTML([locate(ui.S, twoId).term]) + ' = … + …');
  shortenPreviews();
  document.documentElement.lang = lang;
}
// a label cut off by the bar drops its left side (the selected piece, which is on the board), so two buttons for
// the same piece still read differently: = cos(a) · cos(a) and = 1 − sin²(a). The full label stays as aria-label.
function shortenPreviews() {
  for (const b of document.querySelectorAll('.tool.preview')) {
    const sp = b.querySelector('span');
    b.removeAttribute('aria-label');
    if (b.hidden || !sp || sp.scrollWidth <= sp.clientWidth + 1) continue;
    const m = sp.innerHTML.match(/^(<span class="mx">)([\s\S]*?) = ([\s\S]*)(<\/span>)$/);
    if (!m) continue;
    b.setAttribute('aria-label', sp.textContent);
    sp.innerHTML = m[1] + '= ' + m[3] + m[4];
  }
}
