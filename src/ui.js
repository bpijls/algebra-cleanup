/* Rendering, input (tap, swipe), animation, levels/practice screens. The entry point: index.html loads it as a module. */
import { LEVELS, buildLevel } from './content/levels.js';
import { BOPS, letters, loneSquare, opBalance, opDrag, opSwap } from './core/balance.js';
import { whyNotDone } from './core/done.js';
import { hint } from './core/hints.js';
import { V } from './core/kinds/letter.js';
import { N } from './core/kinds/number.js';
import { T, cloneF, sumKey } from './core/kinds/sums.js';
import { canMerge, coef, isClean, isOne, locate, normalize, params, tidy, unknownOf, varPart, walkTerms } from './core/model.js';
import { opBar, opExplode, opGather, opOp, opPair, opSplitTwo, opSweep, partnersOf, termPair } from './core/moves.js';
import { branchCount, branchOf, isBranched, isEquation, isRight, pairOf } from './core/problem.js';
import { lang, setLang, t } from './i18n.js';
import { guessGoal, parseProblem } from './parse.js';
import { autoSolve, autoSolveStep, makeProblem } from './practice.js';
import { blockHTML, bx, condHTML, fx, mx, sqHTML, stateHTML, sumHTML } from './render/text.js';

const VARCOL = { a: '--va', b: '--vb', x: '--vx', y: '--vy' };
const store = { get(k, d) { try { const v = localStorage.getItem('alg-cleanup:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('alg-cleanup:' + k, JSON.stringify(v)); } catch {} } };

setLang(store.get('lang', (navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en'));
let lvl = Math.min(store.get('level', 0), LEVELS.length - 1);
let best = store.get('best', {});
let S, history, moves, sel, born, hintIds, lastNote, busy = false, won = false, balancing = false, balBranch = 0;

const $ = id => document.getElementById(id);
const board = $('board'), note = $('note');
const snap = () => JSON.stringify({ S, moves });

function say(key, p, type = 'info', raw) {
  lastNote = { key, p, type, raw };
  note.className = 'note ' + type;
  note.innerHTML = raw ? raw[lang] : t(key, p);
}
function sayIntro() {
  if (mode === 'custom') return say(S.unsure ? 'ownUnsure' : S.goal === 'factor' ? 'ti_customF' : S.goal === 'solve' ? 'ti_customS' : 'ti_custom', {}, S.unsure ? 'warn' : 'info');
  if (mode === 'practice') return say('ti_' + S.topic, {}, 'info');
  say(null, null, 'info', { en: LEVELS[lvl].en, nl: LEVELS[lvl].nl });
}
const TOPICS = ['powers', 'like', 'frac', 'open', 'double', 'square', 'factor', 'trinomial', 'equations', 'quadratic', 'generic', 'mixed'];
let mode = 'levels', initial = null, sheetFn = null;
let prac = store.get('practice', { topics: ['powers', 'like', 'frac'], d: 1 });
let session = { solved: 0, streak: 0 };
function nextProblem() {
  if (mode === 'custom') return showOwn();
  mode = 'practice';
  S = makeProblem(prac.topics, prac.d);
  startBoard();
}
function startBoard() {
  initial = JSON.stringify(S);
  history = []; moves = 0; sel = null; born = new Set(); hintIds = new Set(); won = false; balancing = false;
  board.classList.remove('won');
  render(); sayIntro();
}
function showPractice() {
  sheetFn = showPractice;
  const chips = TOPICS.map(tp => `<button type="button" class="pchip${prac.topics.includes(tp) ? ' on' : ''}" data-tp="${tp}" aria-pressed="${prac.topics.includes(tp)}">${t('tp_' + tp)}</button>`).join('');
  const ds = [1, 2, 3].map(d => `<button type="button" class="pchip seg${prac.d === d ? ' on' : ''}" data-d="${d}" aria-pressed="${prac.d === d}">${t('d' + d)}</button>`).join('');
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('practiceTitle')}</h2><p>${t('practiceIntro')}</p>
    <div class="plabel">${t('topics')}</div><div class="pchips">${chips}</div>
    <div class="plabel">${t('difficulty')}</div><div class="pchips">${ds}</div>
    <p class="pwarn" id="pWarn" hidden>${t('pickOne')}</p>
    <div class="row" style="margin-top:18px"><button class="tool main" type="button" id="pStart">${t('start')} →</button>
      <button class="tool" type="button" id="pOwn">✎ ${t('ownTitle')}</button></div>`);
  host.querySelector('#pOwn').addEventListener('click', showOwn);
  host.querySelectorAll('[data-tp]').forEach(b => b.addEventListener('click', () => {
    const tp = b.dataset.tp, on = prac.topics.includes(tp);
    prac.topics = on ? prac.topics.filter(x => x !== tp) : [...prac.topics, tp];
    b.classList.toggle('on', !on); b.setAttribute('aria-pressed', String(!on));
  }));
  host.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
    prac.d = +b.dataset.d;
    host.querySelectorAll('[data-d]').forEach(x => { const on = +x.dataset.d === prac.d; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  }));
  host.querySelector('#pStart').addEventListener('click', () => {
    if (!prac.topics.length) { host.querySelector('#pWarn').hidden = false; return; }
    store.set('practice', prac); session = { solved: 0, streak: 0 };
    closeSheet(); mode = 'practice'; nextProblem();
  });
}

/* ---- your own problem: typed from the book ---- */
const OWN_EXAMPLES = ['(x+3)(x-2)', '(a+b)^2', '-2(x+4)-3(x-1)', '12a^5/4a^2', 'x^2+5x+6', '4a^2b+6ab^2', '5x+3=2x+12', '2(x+3)=4x-2', 'ax+b=cx+d', 'ax^2+bx+c=0'];
let own = store.get('own', { src: '', goal: null });
function showOwn() {
  sheetFn = showOwn;
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
  let goal = own.goal, touched = !!own.goal, unknown = own.unknown || null;
  input.value = own.src;
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
    own = { src: input.value, goal: touched ? goal : null, unknown }; store.set('own', own);
    S = r.S;
    S.unsure = autoSolve(JSON.parse(JSON.stringify(S))) == null;
    closeSheet(); mode = 'custom'; session = { solved: 0, streak: 0 }; startBoard();
  });
  update();
  setTimeout(() => input.focus(), 50);
}

/* ---- equations: do the same to both sides ---- */
// a term as typed text without its sign: 2x, 3a^2, 5
function termText(t) {
  const n = t.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1), vs = t.f.filter(f => f.k === 'v');
  return (n !== 1 || !vs.length ? String(n) : '') + vs.map(f => f.b + (f.e > 1 ? '^' + f.e : '')).join('');
}
/* ---- the balance panel: + − · : and a number on a slider, done to both sides (no typing) ---- */
// + and − take a positive number (the sign is the operation); · and : can be negative (· −1 flips both sides)
// with parameters there are letter chips too: each one cycles off → a → a² → off, so · 4a and + b² can be made
const bal = { op: '+', v: 1, lets: {} };
const balLetters = () => isEquation(S) ? params(S).sort() : [];
// the value as a term: 4a is the number 4 with the letter a on
function balTerm() {
  const vs = balLetters().filter(b => bal.lets[b]).map(b => V(b, bal.lets[b]));
  const n = Math.abs(bal.v);
  return T([...(n !== 1 || !vs.length ? [N(n)] : []), ...vs], bal.v < 0);
}
const balText = () => { const t0 = balTerm(); return (t0.neg ? '−' : '') + t0.f.map(f => f.k === 'n' ? f.v : f.b + (f.e > 1 ? '²' : '')).join(''); };
let lastHint = null;
function balBounds() {
  let big = 1;
  pairOf(S, Math.min(balBranch, branchCount(S) - 1)).forEach(P => walkTerms([...P.num, ...P.den], { depth: 0 }, M => { if (M.kind === 'f' && M.f.k === 'n') big = Math.max(big, M.f.v); }));
  const R = Math.min(200, Math.max(20, 2 * big, Math.abs(bal.v)));
  return bal.op === '+' || bal.op === '-' ? [1, R] : [-R, R];
}
const balShown = balText;
// what the panel would do, from a dry run on a copy
function balTry() {
  return { r: opBalance(JSON.parse(JSON.stringify(S)), bal.op, balTerm(), balBranch) };
}
function balSync(preview) {
  const [lo, hi] = balBounds(), range = $('balRange');
  if (bal.v < lo || bal.v > hi || !bal.v) bal.v = Math.min(hi, Math.max(lo, Math.abs(bal.v) || 1));
  range.min = lo; range.max = hi; range.value = bal.v;
  range.setAttribute('aria-valuetext', BOPS[bal.op] + ' ' + balShown());
  document.querySelectorAll('#balOps [data-bop]').forEach(b => { const on = b.dataset.bop === bal.op; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  const ls = balLetters();
  Object.keys(bal.lets).forEach(b => { if (!ls.includes(b)) delete bal.lets[b]; });
  $('balLets').hidden = !ls.length;
  $('balLets').setAttribute('aria-label', t('balLetters'));
  $('balLets').innerHTML = ls.map(b => { const e = bal.lets[b] || 0; return `<button type="button" class="ballet${e ? ' on' : ''}" data-let="${b}" aria-pressed="${!!e}"><i>${b}</i>${e > 1 ? '<sup>2</sup>' : ''}</button>`; }).join('');
  $('balGo').querySelector('span').textContent = `${BOPS[bal.op]} ${bal.v < 0 ? '(' + balShown() + ')' : balShown()}`;
  $('balGo').setAttribute('aria-label', t('balGoAria', { op: BOPS[bal.op], v: balShown() }));
  if (!preview) return;
  const { r } = balTry();
  if (r && r.no) say(r.no, r.p || {}, 'warn');
  else if (r) say('balPreview', { ex: r.p.ex }, 'info');
}
function balSet(op, v) {
  if (op) {
    if ((op === '+' || op === '-') !== (bal.op === '+' || bal.op === '-')) bal.v = Math.abs(bal.v);
    bal.op = op;
  }
  if (v != null) { if (v === 0) v = v < bal.v ? -1 : 1; bal.v = v; }
  balSync(true);
}
// a hint that says "do + 9 on both sides" sets the panel to it
function balFromHint() {
  const h = lastHint;
  if (!h || !h.balance || h.drag != null) return;
  const v = h.balance.value, n = v.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);
  if (v.f.some(f => f.k !== 'n' && f.k !== 'v')) return;
  bal.lets = Object.fromEntries(v.f.filter(f => f.k === 'v').map(f => [f.b, f.e]));
  bal.op = h.balance.op; bal.v = v.neg && (bal.op === '·' || bal.op === ':') ? -n : n;
  if (bal.op === '+' && v.neg) bal.op = '-';
  balBranch = h.bi || 0;
}

/* ---- split a term in two: 5x = 2x + 3x ---- */
// the term (selected, or holding the selected piece) when it can be written as a sum of two terms
function splitTermOf(id) {
  const L = locate(S, id);
  return L && tidy(L.term) && varPart(L.term).length ? L.term.id : null;
}
// "before = after" for a move, from a dry run on a copy; null when the move would be refused
function previewOf(fn) {
  const copy = JSON.parse(JSON.stringify(S));
  const r = fn(copy);
  if (!r || r.no) return null;
  const p = r.p || {};
  const inner = h => String(h).replace(/^<span class="mx">([\s\S]*)<\/span>$/, '$1');
  const short = h => {   // x · x · x · x · x · x · x → x · x · … · x
    const sep = h.includes(' + ') ? ' + ' : ' · ', bits = h.split(sep);
    return bits.length > 6 ? [bits[0], bits[1], '…', bits[bits.length - 1]].join(sep) : h;
  };
  const left = r.ok === 'explodeNum' ? p.n : inner(p.x || p.ex);
  const right = r.ok === 'gather' ? inner(p.r) : short(inner(p.ex));
  return mx(r.ok === 'gather' ? short(inner(p.ex)) + ' = ' + right : left + ' = ' + right);
}
// 5x = 2x + 3x: a slider picks the first term, the second is what is left
function showSplit(tid) {
  const L = locate(S, tid);
  const c = L && coef(L.term), vp = L && varPart(L.term);
  if (!L || !tidy(L.term) || !vp.length) return;
  const mono2 = k => T([...(Math.abs(k) !== 1 ? [N(Math.abs(k))] : []), ...vp.map(cloneF)], k < 0);
  const R = Math.max(12, Math.abs(c) + 12);
  let p = Math.sign(c) * (Math.abs(c) > 1 ? 1 : 2);
  sheetFn = null;
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('splitTitle', { x: mx(sumHTML([L.term])) })}</h2><p>${t('splitHow')}</p>
    <div class="splitprev expr-n" id="sPrev" aria-live="polite"></div>
    <input type="range" class="slider" id="sRange" min="${-R}" max="${R}" step="1" value="${p}" aria-label="${t('splitTitle', { x: termText(L.term) })}">
    <div class="sliderends"><span>${-R}</span><span>0</span><span>${R}</span></div>
    <div class="row" style="margin-top:16px">
      <button class="tool main" type="button" id="sDo">${t('splitDo')}</button>
    </div>`);
  const range = host.querySelector('#sRange'), prev = host.querySelector('#sPrev'), go = host.querySelector('#sDo');
  // 0 or the whole term would leave nothing to split: skip over them in the direction the slider moves
  const update = () => {
    let v = +range.value;
    if (v === 0 || v === c) { v += v >= p ? 1 : -1; if (v === 0 || v === c) v += v >= p ? 1 : -1; if (Math.abs(v) > R) v = p; range.value = v; }
    p = v;
    prev.innerHTML = `${sumHTML([L.term])} = ${sumHTML([mono2(p), mono2(c - p)])}`;
    const said = k => (k < 0 ? '−' : '') + termText(mono2(k));
    range.setAttribute('aria-valuetext', `${said(p)} + ${said(c - p)}`);
  };
  range.addEventListener('input', update);
  go.addEventListener('click', () => { closeSheet(); run(s => opSplitTwo(s, tid, p)); });
  update();
  setTimeout(() => range.focus(), 50);
}

function loadLevel(i) {
  mode = 'levels';
  lvl = i; store.set('level', i);
  S = buildLevel(i); history = []; moves = 0; sel = null; born = new Set(); hintIds = new Set(); won = false; balancing = false;
  board.classList.remove('won');
  render(); sayIntro();
}

/* the picked bracket and its twins in other terms, when they can go outside brackets together */
function blockOf(S, sel) {
  if (!sel || sel.t !== 'f' || balancing) return null;
  const L = locate(S, sel.id);
  if (!L || L.f.k !== 'p' || L.depth) return null;
  const key = sumKey(L.f.terms), partners = partnersOf(S, sel), ids = new Set([L.f.id]);
  L.terms.forEach(t => t.f.forEach(f => { if (f.k === 'p' && f.e === L.f.e && partners.has(f.id) && sumKey(f.terms) === key) ids.add(f.id); }));
  return ids.size > 1 ? { key, ids, L } : null;
}
let block = null, detached = new Set();
// the ² of a lone square, as a tile of its own: drag it across the = to take the root of both sides
function powEl(f) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tile pw'; b.dataset.id = -f.id; b.textContent = '2';
  b.setAttribute('aria-label', 'squared');
  if (hintIds.has(-f.id)) b.classList.add('hint');
  if (born.has(f.id)) b.classList.add('born');
  return b;
}
function tileEl(f, partners) {
  if (f.k === 'r') {   // √ with a bar over what is inside; the pieces inside are tiles of their own
    const b = document.createElement('div');
    b.className = 'tile r'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'root');
    const body = document.createElement('div'); body.className = 'rbody'; body.append(sideEl(f.terms, partners));
    const hook = document.createElementNS(SVGNS, 'svg'); hook.setAttribute('class', 'rsvg'); hook.setAttribute('viewBox', '0 0 23 100'); hook.setAttribute('preserveAspectRatio', 'none'); hook.setAttribute('aria-hidden', 'true');
    hook.innerHTML = '<path d="M1 62 L6 55 L12.5 100 L23 0"/>';
    b.append(hook, Object.assign(document.createElement('span'), { className: 'rs', textContent: '√' }), body);
    if (sel && sel.t === 'f' && sel.id === f.id) b.classList.add('sel');
    if (hintIds.has(f.id)) b.classList.add('hint');
    if (born.has(f.id)) b.classList.add('born');
    return b;
  }
  if (f.k === 'p' && block && block.ids.has(f.id)) {
    const b = document.createElement('div');
    b.className = 'tile p block'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button');
    b.innerHTML = fx({ k: 'bk', terms: f.terms, e: f.e });
    b.setAttribute('aria-label', 'block');
    if (sel && sel.t === 'f' && sel.id === f.id) b.classList.add('sel');
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
    if (f.e > 1 && !detached.has(f.id)) { const sp = document.createElement('sup'); sp.textContent = f.e; b.append(sp); b.setAttribute('aria-label', `brackets to the power ${f.e}`); }
    if (sel && sel.t === 'f' && sel.id === f.id) b.classList.add('sel');
    if (partners.has(f.id)) b.classList.add('partner');
    if (hintIds.has(f.id)) b.classList.add('hint');
    if (born.has(f.id)) b.classList.add('born');
    return b;
  }
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tile ' + f.k; b.dataset.id = f.id;
  if (f.k === 'n') { b.textContent = f.v; b.setAttribute('aria-label', String(f.v)); }
  else if (f.k === 'v') {
    b.style.setProperty('--c', `var(${VARCOL[f.b] || '--vz'})`);
    b.innerHTML = `${f.b}${f.e > 1 && !detached.has(f.id) ? `<sup>${f.e}</sup>` : ''}`;
    b.setAttribute('aria-label', f.e > 1 ? `${f.b} to the power ${f.e}` : f.b);
  } else {
    const inner = f.f.map(m => {
      const c = m.k === 'v' ? ` style="--c:var(${VARCOL[m.b] || '--vz'})"` : '';
      return `<span class="mini ${m.k}"${c}>${m.k === 'n' ? m.v : m.b}${m.k === 'v' && m.e > 1 ? `<sup>${m.e}</sup>` : ''}</span>`;
    }).join('');
    b.innerHTML = `<span class="paren">(</span>${inner}<span class="paren">)</span>${f.e > 1 && !detached.has(f.id) ? `<sup>${f.e}</sup>` : ''}`;
    b.setAttribute('aria-label', 'bracket' + (f.e > 1 ? ` to the power ${f.e}` : ''));
  }
  if (sel && sel.t === 'f' && sel.id === f.id) b.classList.add('sel');
  if (partners.has(f.id)) b.classList.add('partner');
  if (hintIds.has(f.id)) b.classList.add('hint');
  if (born.has(f.id)) { b.classList.add('born'); b.style.animationDelay = (born.idx++ * 35) + 'ms'; }
  return b;
}

function sideEl(terms, partners) {
  const d = document.createElement('div'); d.className = 'side';
  terms.forEach((term, i) => {
    if (i > 0 || term.neg) { const s = document.createElement('span'); s.className = 'sign'; s.textContent = term.neg ? '−' : '+'; d.append(s); }
    const te = document.createElement('div');
    te.className = 'term' + (terms.length === 1 ? ' solo' : '');
    te.dataset.tid = term.id;
    if (sel && sel.t === 't' && sel.id === term.id) te.classList.add('sel');
    if (partners.has(term.id)) te.classList.add('partner');
    if (hintIds.has(term.id)) te.classList.add('hint');
    term.f.forEach((f, j) => {
      if (j > 0) { const dot = document.createElement('span'); dot.className = 'dot'; te.append(dot); }
      te.append(tileEl(f, partners));
      if (detached.has(f.id)) { te.classList.add('haspw'); te.append(powEl(f)); }
    });
    d.append(te);
  });
  return d;
}

function render() {
  const partners = partnersOf(S, sel);
  block = blockOf(S, sel);
  detached = new Set(isEquation(S) ? S.parts.map(loneSquare).filter(Boolean).map(f => f.id) : []);
  born.idx = 0;
  const wrap = document.createElement('div'); wrap.className = 'expr';
  const stacked = S.parts.length > 1 && S.op === '/';
  if (stacked) wrap.classList.add('stack');
  if (isEquation(S)) wrap.classList.add('eqs');
  let row = wrap;
  S.parts.forEach((P, pi) => {
    // an equation: one row per branch (x = 3 ∨ x = −3); the = stays with the right-hand side,
    // so a line break can only come before the =
    if (isEquation(S) && !isRight(pi)) {
      if (pi) wrap.append(Object.assign(document.createElement('span'), { className: 'ortag', textContent: t('orWord') }));
      row = wrap.appendChild(Object.assign(document.createElement('div'), { className: 'eqrow' }));
      row.dataset.b = branchOf(pi);
    }
    const host = isEquation(S) ? (isRight(pi) ? row.appendChild(Object.assign(document.createElement('div'), { className: 'eqright' })) : row) : wrap;
    if (pi > 0 && (!isEquation(S) || isRight(pi))) {
      const op = document.createElement('button'); op.type = 'button'; op.dataset.op = '1';
      op.className = stacked ? 'opchip bigbar' : 'opchip';
      op.textContent = stacked ? '' : S.op;
      op.setAttribute('aria-label', stacked ? 'fraction bar' : isEquation(S) ? 'equals: do the same to both sides' : S.op === ':' ? 'divide' : 'times');
      if (isEquation(S)) { op.classList.add('eq'); op.dataset.b = branchOf(pi); const on = balancing && balBranch === branchOf(pi); op.classList.toggle('on', on); op.setAttribute('aria-pressed', String(on)); }
      if (hintIds.has('op') && (hintIds.bi == null || hintIds.bi === branchOf(pi))) op.classList.add('hint');
      host.append(op);
    }
    const fr = document.createElement('div'); fr.className = 'frac';
    fr.append(sideEl(P.num, partners));
    if (!isOne(P.den) || S.op === '·') {
      let bar;
      if (S.parts.length === 1) {
        bar = document.createElement('button'); bar.type = 'button'; bar.className = 'bar fbar';
        bar.setAttribute('aria-label', 'fraction bar');
      } else { bar = document.createElement('div'); bar.className = 'bar'; }
      fr.append(bar);
      fr.append(sideEl(P.den, partners));
    }
    host.append(fr);
  });
  board.replaceChildren(wrap);
  board.classList.toggle('balancing', balancing);
  fitBoard(wrap);
  $('written').innerHTML = stateHTML(S);

  // chrome
  $('btnLevels').textContent = t('levels');
  $('btnLang').textContent = lang === 'nl' ? 'English' : 'Nederlands';
  $('btnRestart').textContent = t('restart');
  $('brand').innerHTML = lang === 'nl' ? 'Algebra <span>Opruimen</span>' : 'Algebra <span>Cleanup</span>';
  $('btnPractice').textContent = t('practice');
  $('btnPractice').classList.toggle('on', mode === 'practice');
  $('btnPractice').classList.toggle('on', mode !== 'levels');
  $('btnSkip').hidden = mode === 'levels'; $('btnSkip').querySelector('span').textContent = t(mode === 'custom' ? 'ownSkip' : 'newProblem');
  if (mode === 'custom') {
    $('lvlTitle').textContent = t('practiceTitle');
    $('lvlBadge').hidden = false; $('lvlBadge').textContent = t('tp_custom');
    $('moves').innerHTML = t('moves', { n: moves });
  } else if (mode === 'practice') {
    $('lvlTitle').textContent = t('practiceTitle');
    $('lvlBadge').hidden = false; $('lvlBadge').textContent = t('tp_' + S.topic) + ' · ' + t('d' + prac.d);
    $('moves').innerHTML = t('solved', { n: session.solved }) + t('streak', { n: session.streak });
  } else {
    $('lvlTitle').textContent = t('level', { n: lvl + 1 });
    $('lvlBadge').hidden = !LEVELS[lvl].book && !LEVELS[lvl].goal; $('lvlBadge').textContent = LEVELS[lvl].book ? t('book') : t(LEVELS[lvl].goal === 'solve' ? 'solveBadge' : 'factorBadge');
    $('moves').innerHTML = t('moves', { n: moves }) + (best[lvl] != null ? t('best', { n: best[lvl] }) : '');
  }
  $('writtenLabel').textContent = t('written');
  $('btnUndo').querySelector('span').textContent = t('undo');
  $('btnUndo').disabled = !history.length;
  $('btnHint').querySelector('span').textContent = t('hint');
  $('btnDone').querySelector('span').textContent = t('doneBtn'); $('btnDone').setAttribute('aria-label', t('doneLabel'));
  $('btnDone').classList.toggle('hint', hintIds.has('done'));
  $('balPanel').hidden = !balancing;
  if (balancing) {
    $('btnSwap').querySelector('span').textContent = t('balSwapBtn'); $('btnSwap').setAttribute('aria-label', t('balSwap'));
    $('balOps').setAttribute('aria-label', t('balOps')); $('balRange').setAttribute('aria-label', t('balNum'));
    $('balLess').setAttribute('aria-label', t('balLess')); $('balMore').setAttribute('aria-label', t('balMore'));
    $('balGo').classList.toggle('hint', !!(lastHint && lastHint.balance && lastHint.drag == null && hintIds.has('op')));
    balSync(false);
  }
  const fSel = !balancing && sel && sel.t === 'f', tSel = !balancing && sel && sel.t === 't';
  // the move buttons show what they will do, worked out on a copy of the board
  const exLabel = fSel && previewOf(s => opExplode(s, sel.id));
  $('btnExplode').hidden = !exLabel; if (exLabel) $('btnExplode').querySelector('span').innerHTML = exLabel;
  let gatherable = false;
  if (fSel) { const L = locate(S, sel.id); gatherable = L.term.f.filter(f => canMerge(L.f, f)).length >= 3; }
  $('btnGather').hidden = !gatherable;
  if (gatherable) $('btnGather').querySelector('span').innerHTML = previewOf(s => opGather(s, sel.id));
  // from a piece only when factoring (a lone −x is hard to hit as a term); elsewhere it would just be noise
  const twoId = tSel || (fSel && (S.goal === 'factor' || S.goal === 'solve')) ? splitTermOf(sel.id) : null;
  $('btnSplitTwo').hidden = !twoId;
  if (twoId) $('btnSplitTwo').querySelector('span').innerHTML = mx(sumHTML([locate(S, twoId).term]) + ' = … + …');
  document.documentElement.lang = lang;
}

// a line that is wider than the board (a long equation side) is shrunk to fit instead of overflowing
function fitBoard(wrap) {
  wrap.style.zoom = ''; wrap.classList.remove('oneline', 'across', 'tight');
  wrap.querySelectorAll('.term > .lb').forEach(el => el.remove());
  // several branches (x = 3 ∨ x = −3): below each other, or next to each other when that needs less shrinking
  // (a phone on its side has width to spare and little height)
  if (isBranched(S)) {
    const cs = getComputedStyle(board), room = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const W = wrap.parentElement.clientWidth * 0.94;
    wrap.classList.add('oneline');
    const k = () => Math.min(1, W / wrap.scrollWidth, room > 0 ? room / wrap.scrollHeight : 1);
    const down = k();
    wrap.classList.add('across');
    const side = k();
    if (side <= down) wrap.classList.remove('across');
    const best = Math.max(side, down);
    if (best >= 0.55) { if (best < 1) wrap.style.zoom = String(best); return; }
    wrap.classList.remove('oneline', 'across');
  }
  // an equation reads best on one line, like a balance: shrink it a little rather than break it
  if (isEquation(S)) {
    wrap.classList.add('oneline');                    // nothing wraps, so this is its natural width
    const k = wrap.parentElement.clientWidth * 0.94 / wrap.scrollWidth;
    if (k >= 1) return;
    if (k >= 0.72) { wrap.style.zoom = String(k); return; }
    wrap.classList.remove('oneline');                 // too long: break before the =, then fit each line
  }
  // a product reads best whole: shrink it rather than break it between two factors
  wrap.classList.add('tight');
  const bs = getComputedStyle(board), avail = (board.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight)) * 0.97, widest = () => Math.max(0, ...[...wrap.children].map(c => c.scrollWidth), ...[...wrap.querySelectorAll('.term')].map(spanOf));
  let need = widest();
  if (avail && avail / need < 0.55) { wrap.classList.remove('tight'); need = widest(); }
  if (avail && need > avail) wrap.style.zoom = String(Math.max(0.55, avail / need));
  dotsDown(wrap);
  fitHeight(wrap);
}
// how wide a term's pieces really are: a term that can't wrap overflows its own box on both sides,
// which neither its width nor its scrollWidth shows
function spanOf(te) {
  const a = te.firstElementChild, b = te.lastElementChild;
  if (!a) return 0;
  const cs = getComputedStyle(te);
  return b.getBoundingClientRect().right - a.getBoundingClientRect().left + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
}
// a product that still wraps: a · at the end of a line moves to the start of the next one
function dotsDown(wrap) {
  wrap.querySelectorAll('.term > .lb').forEach(el => el.remove());
  for (let pass = 0; pass < 6; pass++) {
    const d = [...wrap.querySelectorAll('.term > .dot')].find(dot => {
      const n = dot.nextElementSibling;
      return n && n.getBoundingClientRect().top >= dot.getBoundingClientRect().bottom;
    });
    if (!d) return;
    d.before(Object.assign(document.createElement('span'), { className: 'lb' }));
  }
}
// a phone on its side has little height: shrink the tiles until they fit between the bars instead of scrolling
function fitHeight(wrap) {
  const cs = getComputedStyle(board), room = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const h = wrap.getBoundingClientRect().height, z = parseFloat(wrap.style.zoom) || 1;
  if (room > 0 && h > room) wrap.style.zoom = String(Math.max(0.55, z * room / h));
}
window.addEventListener('resize', () => { const w = board.querySelector('.expr'); if (w) fitBoard(w); });

/* ---- motion: every tile travels from where it was; new pieces fly in from their sources along arcs ---- */
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function tileRects() {
  const m = new Map();
  board.querySelectorAll('.tile[data-id]').forEach(el => m.set(+el.dataset.id, el.getBoundingClientRect()));
  return m;
}
function animateMoves(rects, origins, arcs) {
  if (reduceMotion() || !board.animate) return 0;
  const br = board.getBoundingClientRect();
  const moving = new Set();
  let longest = 0, flight = 0;
  const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'paths'); board.append(svg);
  board.querySelectorAll('.tile[data-id]').forEach(el => {
    const parent = el.parentElement.closest('.tile.p');
    if (parent && moving.has(parent)) return;
    const id = +el.dataset.id, to = el.getBoundingClientRect();
    const src = origins[id] ? origins[id].filter(s => rects.has(s)) : rects.has(id) ? [id] : [];
    src.forEach((sid, k) => {
      const from = rects.get(sid);
      const dist = Math.hypot(from.left - to.left, from.top - to.top);
      if (dist < 2 && Math.abs(from.width - to.width) < 2) return;
      const isNew = !!origins[id];
      const lift = isNew || (arcs && dist > 40) || dist > 140 ? Math.min(150, 34 + dist * 0.45) * (isNew && flight++ % 2 ? -1 : 1) : 0;
      const target = k === 0 ? el : ghostOf(el, to, br);
      const dur = isNew ? 700 : 520;
      fly(target, from, to, lift, dur, k > 0);
      if (k === 0) moving.add(el);
      if (isNew && dist > 50) trail(svg, from, to, lift, br, dur);
      longest = Math.max(longest, dur);
    });
  });
  setTimeout(() => svg.remove(), longest + 500);
  return longest;
}
const mid = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
function ghostOf(el, to, br) {
  const g = el.cloneNode(true);
  g.classList.remove('born', 'sel', 'partner', 'hint');
  g.classList.add('ghost');
  [g, ...g.querySelectorAll('[data-id]')].forEach(e => e.removeAttribute('data-id')); // never mistaken for the real tile
  // left/top are measured from the board's padding box, inside its border
  Object.assign(g.style, { left: to.left - br.left - board.clientLeft + 'px', top: to.top - br.top - board.clientTop + 'px', width: to.width + 'px', height: to.height + 'px' });
  board.append(g);
  return g;
}
function fly(el, from, to, lift, dur, isGhost) {
  const p0 = mid(from), p1 = mid(to);
  const c = { x: (p0.x + p1.x) / 2, y: (lift >= 0 ? Math.min(p0.y, p1.y) : Math.max(p0.y, p1.y)) - lift };
  const s0 = Math.min(2, Math.max(.4, from.width / to.width));
  const frames = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, u = 1 - t;
    const x = u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y = u * u * p0.y + 2 * u * t * c.y + t * t * p1.y;
    const s = s0 + (1 - s0) * t;
    frames.push({ transform: `translate(${x - p1.x}px, ${y - p1.y}px) scale(${s})`, opacity: isGhost && t > .8 ? (1 - t) * 5 : 1 });
  }
  el.style.zIndex = 7;
  const a = el.animate(frames, { duration: dur, easing: 'cubic-bezier(.45,0,.25,1)' });
  a.onfinish = a.oncancel = () => { if (isGhost) el.remove(); else el.style.zIndex = ''; };
}
function trail(svg, from, to, lift, br, dur) {
  const p0 = mid(from), p1 = mid(to);
  const c = { x: (p0.x + p1.x) / 2, y: (lift >= 0 ? Math.min(p0.y, p1.y) : Math.max(p0.y, p1.y)) - lift };
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', `M${p0.x - br.left},${p0.y - br.top} Q${c.x - br.left},${c.y - br.top} ${p1.x - br.left},${p1.y - br.top}`);
  svg.append(path);
  const len = path.getTotalLength ? path.getTotalLength() : 300;
  path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
  path.animate([{ strokeDashoffset: len, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .7 }, { strokeDashoffset: 0, opacity: 0 }],
    { duration: dur + 450, easing: 'ease-out', fill: 'forwards' });
}

function shake(ids) {
  requestAnimationFrame(() => ids.forEach(id => {
    const e = board.querySelector(`[data-id="${id}"],[data-tid="${id}"]`);
    if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
  }));
}

function run(fn, animIds) {
  if (busy || won) return;
  const rects = tileRects();
  const before = snap();
  const r = fn(S);
  if (!r) return false;
  if (r.no) {
    S = JSON.parse(before).S; // ensure untouched
    sel = null; hintIds = new Set(); born = new Set();
    render(); say(r.no, r.p, 'warn'); shake(r.ids || []);
    return true;
  }
  const finish = () => {
    history.push(before); moves++; normalize(S);
    // only bracket moves (putting outside brackets, opening brackets) travel along arcs; everything else just pops
    const origins = r.arcs ? r.origins || {} : {};
    lastHint = null; sel = null; hintIds = new Set(); born = new Set((r.born || []).filter(id => !(id in origins)));
    render(); say(r.ok, r.p, 'ok');
    const ms = r.arcs ? animateMoves(rects, origins, true) : 0;
    busy = ms > 0;
    // the new bracket closes around what was left only once those pieces have arrived
    const w = r.wrap != null && ms && board.querySelector(`.tile.p[data-id="${r.wrap}"]`);
    if (w) w.classList.add('wrapin');
    setTimeout(() => { busy = false; }, ms);
  };
  if (r.cancel && animIds) {
    busy = true;
    animIds.forEach(id => board.querySelector(`[data-id="${id}"]`)?.classList.add('vanish'));
    setTimeout(finish, 380);
  } else finish();
  return true;
}

function onFactor(id) {
  if (sel && sel.t === 'f' && sel.id === id) { run(s => opExplode(s, id)); return; }
  if (sel && sel.t === 'f') {
    const a = sel.id;
    if (run(s => opPair(s, a, id), [a, id])) return;
  }
  select({ t: 'f', id });
}
function onTerm(tid) {
  if (sel && sel.t === 't' && sel.id === tid) {
    sel = null; render(); return;
  }
  if (sel && sel.t === 't') { const a = sel.id; run(s => termPair(s, a, tid)); return; }
  select({ t: 't', id: tid });
}
function select(s) {
  const rects = tileRects(), folded = !!block;
  sel = s; hintIds = new Set(); born = new Set();
  render();
  if (block || folded) animateMoves(rects, {}, false);   // the brackets visibly fold into blocks
  if (block) return say('pickedBlock', { x: mx(fx(block.L.f)), ex: mx(blockHTML(block.L.terms, block.key)) }, 'info');
  const has = partnersOf(S, sel).size > 0;
  const canExplode = s.t === 'f' && !$('btnExplode').hidden;
  if (isEquation(S) && !has) return say('pickedEq', {}, 'info');
  say(s.t === 'f' ? (has ? 'pickedP' : canExplode ? 'picked' : 'pickedAtom') : (has ? 'pickedTermP' : 'pickedTerm'), {}, 'info');
}

/* ---- balance mode: tap =, then drag a piece across it; it is undone on both sides ---- */
function setBalancing(on) {
  balancing = on && isEquation(S);
  if (balancing) { bal.lets = {}; balFromHint(); }
  sel = null; born = new Set();
  if (!balancing || !(lastHint && lastHint.balance && lastHint.drag == null)) hintIds = new Set();
  render(); say(balancing ? 'balanceMode' : 'balanceOff', {}, 'info');
}
function dropAcross(id) {
  run(s => { const r = opDrag(s, id); if (r && !r.no) balancing = false; return r; });
}
let bdrag = null;
// the other side's fraction: where the piece has to land
function otherSide(fromRight, row) {
  row = row || board.querySelector('.eqrow');
  return row && (fromRight ? row.querySelector(':scope > .frac') : row.querySelector('.eqright > .frac'));
}
function overOtherSide(x, y) {
  const wrap = board.querySelector('.expr'), row = bdrag.row, eq = row && row.querySelector('.opchip.eq'), other = otherSide(bdrag.right, row);
  if (!eq || !other) return false;
  const e = eq.getBoundingClientRect(), b = board.getBoundingClientRect();
  if (wrap.classList.contains('oneline'))   // on one line: anywhere past the = counts
    return (branchCount(S) > 1 ? y >= row.getBoundingClientRect().top - 30 && y <= row.getBoundingClientRect().bottom + 30 : y >= b.top - 40 && y <= b.bottom + 40) && (bdrag.right ? x < e.left + e.width / 2 : x > e.left + e.width / 2);
  const r = other.getBoundingClientRect(), m = 32;
  return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
}
// a finger is wide and the tiles wobble: a press just next to a piece still picks it up
function pieceNear(x, y) {
  let best = null, bd = 22;
  board.querySelectorAll('.frac > .side > .term > .tile').forEach(el => {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
    if (d < bd) { bd = d; best = el; }
  });
  return best;
}
function balanceDown(e) {
  if (e.target.closest('.opchip')) return;
  const el = e.target.closest('#board .tile, #board .term') || pieceNear(e.clientX, e.clientY);
  // a press on nothing still becomes a drag record, so letting go somewhere else isn't read as a tap on the board
  bdrag = { el, id: el && (el.classList.contains('tile') ? +el.dataset.id : +el.dataset.tid), x: e.clientX, y: e.clientY, pid: e.pointerId, active: false, right: !!(el && el.closest('.eqright')), row: el && el.closest('.eqrow') };
}
function balanceMove(e) {
  const d = bdrag;
  if (e.pointerId !== d.pid) return;
  if (!d.active) {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    d.active = true;
    if (!d.el) return;
    try { board.setPointerCapture(e.pointerId); } catch {}
    const r = d.el.getBoundingClientRect();
    d.k = r.width / (d.el.offsetWidth || r.width);           // the board's zoom
    d.ox = d.x - r.left; d.oy = d.y - r.top;
    d.ghost = d.el.cloneNode(true);
    d.ghost.classList.add('dragghost'); d.ghost.classList.remove('sel', 'hint', 'born', 'partner');
    d.ghost.style.width = d.el.offsetWidth + 'px';
    document.body.append(d.ghost);
    d.el.classList.add('lifted');
  }
  if (!d.el) return;
  d.ghost.style.transform = `translate(${e.clientX - d.ox}px, ${e.clientY - d.oy}px) scale(${d.k * 1.08})`;
  const over = overOtherSide(e.clientX, e.clientY);
  otherSide(d.right, d.row)?.classList.toggle('droptarget', over);
}
function balanceDrop() {
  if (!bdrag) return;
  bdrag.ghost?.remove(); bdrag.el?.classList.remove('lifted');
  board.querySelectorAll('.droptarget').forEach(el => el.classList.remove('droptarget'));
  bdrag = null;
}
function balanceUp(e) {
  const d = bdrag;
  if (e.pointerId !== d.pid) return;
  const over = d.active && d.el && overOtherSide(e.clientX, e.clientY);
  balanceDrop();
  if (!d.active) {                                // a tap: the click handler explains, also for a near miss
    if (d.el && !e.target.closest('.tile, .term')) { shake([d.id]); say('balanceTap', {}, 'info'); suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); }
    return;
  }
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  if (!d.el) return;
  if (over) dropAcross(d.id);
  else say('balanceMiss', {}, 'info');
}

let drag = null, suppressClick = false;
const SVGNS = 'http://www.w3.org/2000/svg';
function tileAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const t = el && el.closest('#board .tile');
  return t && !t.classList.contains('p') && !t.classList.contains('pw') ? t : null;
}
function clearSweep() {
  if (drag && drag.svg) drag.svg.remove();
  board.querySelectorAll('.swept').forEach(el => el.classList.remove('swept'));
}
board.addEventListener('pointerdown', e => {
  if (busy || won || e.button > 0) return;
  if (balancing) { balanceDown(e); return; }
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, id: e.pointerId, active: false, ids: [], pts: [] };
});
board.addEventListener('pointermove', e => {
  if (bdrag) { balanceMove(e); return; }
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
    drag.active = true;
    try { board.setPointerCapture(e.pointerId); } catch {}
    const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('class', 'trail');
    const line = document.createElementNS(SVGNS, 'polyline'); svg.append(line);
    board.append(svg); drag.svg = svg; drag.line = line;
    sample(drag.x, drag.y);
  }
  // sample along the segment so fast swipes don't skip tiles
  const steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - drag.lx, e.clientY - drag.ly) / 8));
  for (let i = 1; i <= steps; i++) sample(drag.lx + (e.clientX - drag.lx) * i / steps, drag.ly + (e.clientY - drag.ly) * i / steps);
  drag.lx = e.clientX; drag.ly = e.clientY;
});
function sample(x, y) {
  const br = board.getBoundingClientRect();
  drag.pts.push(`${x - br.left},${y - br.top}`);
  drag.line.setAttribute('points', drag.pts.join(' '));
  const t = tileAt(x, y);
  if (t && !drag.ids.includes(+t.dataset.id)) { drag.ids.push(+t.dataset.id); t.classList.add('swept'); }
}
const endDrag = e => {
  if (bdrag) { balanceUp(e); return; }
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  if (!d.active) { drag = null; return; }
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  clearSweep(); drag = null;
  if (d.ids.length >= 2) run(s => opSweep(s, d.ids));
  else if (d.ids.length === 1) select({ t: 'f', id: d.ids[0] });
};
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', () => { clearSweep(); drag = null; balanceDrop(); });

board.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  if (busy || won) return;
  const chip = e.target.closest('.opchip');
  if (chip) { if (!isEquation(S)) return run(s => opOp(s)); balBranch = +chip.dataset.b || 0; return setBalancing(!balancing); }
  if (e.target.closest('.fbar')) return run(s => opBar(s));
  const hit = e.target.closest('.tile, .term');
  if (balancing) {
    if (!hit) return setBalancing(false);
    if (e.detail === 0) return dropAcross(hit.classList.contains('tile') ? +hit.dataset.id : +hit.dataset.tid);   // keyboard: Enter moves it across
    shake([+(hit.dataset.id || hit.dataset.tid)]); return say('balanceTap', {}, 'info');
  }
  if (hit && hit.classList.contains('pw')) { shake([+hit.dataset.id]); return say('powTap', {}, 'info'); }
  if (hit && hit.classList.contains('tile')) return onFactor(+hit.dataset.id);
  if (hit) return onTerm(+hit.dataset.tid);
  if (sel) { sel = null; render(); }
});

$('btnExplode').onclick = () => sel && run(s => opExplode(s, sel.id));
$('btnGather').onclick = () => sel && run(s => opGather(s, sel.id));
$('btnSwap').onclick = () => { if (busy || won) return; balancing = false; run(s => opSwap(s, balBranch)); };
document.querySelectorAll('#balOps [data-bop]').forEach(b => { b.onclick = () => balSet(b.dataset.bop, null); });
$('balLets').addEventListener('click', e => { const b = e.target.closest('[data-let]'); if (!b) return; bal.lets[b.dataset.let] = ((bal.lets[b.dataset.let] || 0) + 1) % 3; balSync(true); });
$('balRange').addEventListener('input', e => balSet(null, +e.target.value));
$('balLess').onclick = () => { const [lo] = balBounds(); balSet(null, Math.max(lo, bal.v - 1)); };
$('balMore').onclick = () => { const [, hi] = balBounds(); balSet(null, Math.min(hi, bal.v + 1)); };
$('balGo').onclick = () => {
  if (busy || won || !balancing) return;
  const v = balTerm();
  run(s => { const r = opBalance(s, bal.op, v, balBranch); if (r && !r.no) balancing = false; return r; });
};
$('btnSplitTwo').onclick = () => sel && !busy && !won && showSplit(splitTermOf(sel.id));
$('btnUndo').onclick = () => {
  if (!history.length || busy) return;
  const prev = JSON.parse(history.pop()); S = prev.S; moves = prev.moves;
  sel = null; born = new Set(); hintIds = new Set(); won = false; balancing = false; board.classList.remove('won');
  render(); say(null, null, 'info', { en: 'One step back.', nl: 'Eén stap terug.' });
};
$('btnHint').onclick = () => {
  if (won) return;
  const h = hint(S); lastHint = h; sel = null; born = new Set(); hintIds = new Set(h.k === 'hDone' ? ['done'] : h.ids); hintIds.bi = h.bi;
  if (balancing && h.balance && h.drag == null) balFromHint();
  render(); say(h.k, h.p, 'info');
};
// winning is the player's call: they press Done? when they think nothing is left
$('btnDone').onclick = () => {
  if (busy || won) return;
  sel = null; born = new Set(); hintIds = new Set();
  const why = whyNotDone(S);
  render();
  if (!why) return win();
  say(why.k, why.p, 'warn');
};
$('btnRestart').onclick = () => {
  if (mode === 'levels') return loadLevel(lvl);
  closeSheet(); S = JSON.parse(initial); history = []; moves = 0; sel = null; born = new Set(); hintIds = new Set(); won = false; balancing = false;
  board.classList.remove('won'); render(); sayIntro();
};
$('btnPractice').onclick = showPractice;
$('btnSkip').onclick = () => { if (busy) return; if (mode === 'custom') return showOwn(); session.streak = 0; nextProblem(); say('skipped', {}, 'info'); };
$('btnLang').onclick = () => {
  setLang(lang === 'nl' ? 'en' : 'nl'); store.set('lang', lang); render();
  if (lastNote) say(lastNote.key, lastNote.p, lastNote.type, lastNote.raw);
  if (won) win(true);
  else if (sheetFn && $('sheetHost').children.length) sheetFn();
};
$('btnLevels').onclick = () => showLevels();

/* ---- the menu (levels, practice, restart, language) and the floating bars ---- */
function setMenu(open) {
  $('menu').hidden = !open; $('btnMenu').setAttribute('aria-expanded', String(open));
  if (open) $('menu').querySelector('.menuitem').focus();
}
$('btnMenu').onclick = e => { e.stopPropagation(); setMenu($('menu').hidden); };
$('menu').addEventListener('click', e => { if (e.target.closest('.menuitem')) setMenu(false); });
document.addEventListener('pointerdown', e => { if (!$('menu').hidden && !e.target.closest('#menu, #btnMenu')) setMenu(false); });
// the board keeps its tiles in the open space between the bars, whatever their height
// only room for a two-line note is kept free: a longer note floats over the board instead of shifting every tile
// (tiles that jump when the message changes are hard to grab)
const hudFit = () => {
  const note = $('note'), keep = parseFloat(getComputedStyle(note).minHeight) || 0;
  const top = $('hudTop').offsetHeight + 'px', bottom = ($('hudBottom').offsetHeight - note.offsetHeight + keep) + 'px';
  if (board.style.getPropertyValue('--hud-top') === top && board.style.getPropertyValue('--hud-bottom') === bottom) return;
  board.style.setProperty('--hud-top', top); board.style.setProperty('--hud-bottom', bottom);
  const w = board.querySelector('.expr'); if (w) fitBoard(w);
};
if (window.ResizeObserver) { const ro = new ResizeObserver(hudFit); ro.observe($('hudTop')); ro.observe($('hudBottom')); }
hudFit();
board.addEventListener('keydown', e => {
  const p = e.target.closest && e.target.closest('.tile.p, .tile.r');
  if (p && e.target === p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onFactor(+p.dataset.id); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSheet(); if (!$('menu').hidden) { setMenu(false); $('btnMenu').focus(); } }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('btnUndo').click(); }
});

function closeSheet() { $('sheetHost').replaceChildren(); sheetFn = null; }
function openSheet(html) {
  const host = $('sheetHost');
  host.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  host.querySelector('.scrim').addEventListener('click', e => { if (e.target.classList.contains('scrim') && !won) closeSheet(); });
  return host;
}

function win(refresh) {
  won = true;
  if (mode !== 'levels') {
    const custom = mode === 'custom';
    if (!refresh) { session.solved++; session.streak++; store.set('solvedTotal', store.get('solvedTotal', 0) + 1); board.classList.add('won'); render(); }
    const show = () => {
      const host = openSheet(`
        <h2>${t('win')}</h2>
        <p style="margin-bottom:0">${t(S.goal === 'factor' ? 'winSubF' : S.goal === 'solve' ? 'winSubS' : 'winSub')}</p>
        <div class="result expr-n">${stateHTML(S)}</div>${condsHTML()}
        <p>${t('winMoves', { n: moves })} ${t('winPractice', { n: session.solved })}</p>
        <div class="row">
          <button class="tool main" type="button" id="wNext">${t(custom ? 'ownAnother' : 'nextProblem')} →</button>
          <button class="tool" type="button" id="wTopics">${t('changeTopics')}</button>
        </div>`);
      host.querySelector('#wNext').addEventListener('click', () => { if (custom) { won = false; return showOwn(); } closeSheet(); nextProblem(); });
      host.querySelector('#wTopics').addEventListener('click', () => { closeSheet(); won = false; showPractice(); });
      host.querySelector('#wNext').focus();
    };
    refresh ? show() : setTimeout(show, 650);
    return;
  }
  if (!refresh) {
    if (best[lvl] == null || moves < best[lvl]) { best[lvl] = moves; store.set('best', best); }
    board.classList.add('won'); render();
  }
  const last = lvl === LEVELS.length - 1;
  const show = () => {
    const host = openSheet(`
      <h2>${t('win')}</h2>
      <p style="margin-bottom:0">${t(S.goal === 'factor' ? 'winSubF' : S.goal === 'solve' ? 'winSubS' : 'winSub')}</p>
      <div class="result expr-n">${stateHTML(S)}</div>${condsHTML()}
      <p>${t('winMoves', { n: moves })}${t('winBest', { n: best[lvl] })}${last ? ' ' + t('allDone') : ''}</p>
      ${LEVELS[lvl].abc ? `<div class="abc">${abcHTML(LEVELS[lvl].abc)}</div>` : ''}
      <div class="row">
        ${last ? '' : `<button class="tool main" type="button" id="wNext">${t('next')} →</button>`}
        <button class="tool" type="button" id="wReplay">${t('replay')}</button>
        <button class="tool" type="button" id="wLevels">${t('levels')}</button>
      </div>`);
    host.querySelector('#wNext')?.addEventListener('click', () => { closeSheet(); loadLevel(lvl + 1); });
    host.querySelector('#wReplay').addEventListener('click', () => { closeSheet(); loadLevel(lvl); });
    host.querySelector('#wLevels').addEventListener('click', () => { closeSheet(); won = false; showLevels(); });
    (host.querySelector('#wNext') || host.querySelector('#wReplay')).focus();
  };
  refresh ? show() : setTimeout(show, 650);
}

// a − c ≠ 0, b² − 4ac ≥ 0: what dividing by letters and taking roots of them took for granted
const condsHTML = () => S.conds && S.conds.length ? `<p class="conds">${t('condsLine', { c: S.conds.map(condHTML).join(lang === 'nl' ? ' en ' : ' and ') })}</p>` : '';
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
function showLevels() {
  sheetFn = showLevels;
  const btns = LEVELS.map((L, i) => `<button type="button" class="lvlbtn${best[i] != null ? ' done' : ''}${i === lvl ? ' cur' : ''}${L.book ? ' book' : ''}" data-l="${i}">
      ${best[i] != null ? '✓ ' : ''}${i + 1}<small>${L.book ? t('book') : L.goal === 'factor' ? t('factorBadge') : L.goal === 'solve' ? t('solveBadge') : best[i] != null ? t('best', { n: best[i] }).replace(' · ', '') : '&nbsp;'}</small></button>`).join('');
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('chooseLevel')}</h2><div class="lvlgrid">${btns}</div>`);
  host.querySelectorAll('.lvlbtn').forEach(b => b.addEventListener('click', () => { closeSheet(); loadLevel(+b.dataset.l); }));
}

loadLevel(lvl);

// for devtools and the browser playthrough scripts: the module's state and entry points (alg.S, alg.loadLevel(3) …)
window.alg = {
  get S() { return S; }, get busy() { return busy; }, get balancing() { return balancing; }, get bdrag() { return bdrag; },
  get mode() { return mode; }, get won() { return won; }, set won(v) { won = v; }, bal, board,
  loadLevel, render, closeSheet, showOwn, overOtherSide, hint, autoSolveStep, setLang,
};
