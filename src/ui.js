/* Rendering, input (tap, swipe), animation, levels/practice screens. Uses globals from core.js, practice.js, i18n.js. */
const VARCOL = { a: '--va', b: '--vb', x: '--vx', y: '--vy' };
const store = { get(k, d) { try { const v = localStorage.getItem('alg-cleanup:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('alg-cleanup:' + k, JSON.stringify(v)); } catch {} } };

let lang = store.get('lang', (navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en');
let lvl = Math.min(store.get('level', 0), LEVELS.length - 1);
let best = store.get('best', {});
let S, history, moves, sel, born, hintIds, lastNote, busy = false, won = false;

const $ = id => document.getElementById(id);
const board = $('board'), note = $('note');
const t = (k, p = {}) => { const q = { ...p, ...(p.extra || {}) }; return (I18N[lang][k] || k).replace(/\{(\w+)\}/g, (_, n) => q[n] ?? ''); };
const snap = () => JSON.stringify({ S, moves });

function say(key, p, type = 'info', raw) {
  lastNote = { key, p, type, raw };
  note.className = 'note ' + type;
  note.innerHTML = raw ? raw[lang] : t(key, p);
}
function sayIntro() {
  if (mode === 'custom') return say(S.unsure ? 'ownUnsure' : S.goal === 'factor' ? 'ti_customF' : 'ti_custom', {}, S.unsure ? 'warn' : 'info');
  if (mode === 'practice') return say('ti_' + S.topic, {}, 'info');
  say(null, null, 'info', { en: LEVELS[lvl].en, nl: LEVELS[lvl].nl });
}
const TOPICS = ['powers', 'like', 'frac', 'open', 'double', 'square', 'factor', 'trinomial', 'mixed'];
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
  history = []; moves = 0; sel = null; born = new Set(); hintIds = new Set(); won = false;
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
const OWN_EXAMPLES = ['(x+3)(x-2)', '(a+b)^2', '-2(x+4)-3(x-1)', '12a^5/4a^2', 'x^2+5x+6', '4a^2b+6ab^2'];
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
      </div>
      <div class="row" style="margin-top:16px"><button class="tool main" type="submit">${t('ownGo')} →</button></div>
    </form>
    <div class="plabel">${t('ownExamples')}</div>
    <div class="pchips">${OWN_EXAMPLES.map(e => `<button type="button" class="pchip ex" data-ex="${e}">${e}</button>`).join('')}</div>`);
  const input = host.querySelector('#ownIn'), prev = host.querySelector('#ownPrev'), errEl = host.querySelector('#ownErr');
  let goal = own.goal, touched = !!own.goal;
  input.value = own.src;
  const update = () => {
    if (!touched) goal = guessGoal(input.value);
    host.querySelectorAll('[data-g]').forEach(b => { const on = b.dataset.g === goal; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const r = input.value.trim() ? parseProblem(input.value, goal) : null;
    prev.innerHTML = r && !r.err ? stateHTML(r.S) : '';
    errEl.hidden = true;
    return r;
  };
  host.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { goal = b.dataset.g; touched = true; update(); }));
  host.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.ex; touched = false; update(); input.focus(); }));
  input.addEventListener('input', update);
  host.querySelector('#ownForm').addEventListener('submit', e => {
    e.preventDefault();
    const r = parseProblem(input.value, goal);
    const fail = (k, p) => { errEl.innerHTML = t(k, p); errEl.hidden = false; input.focus(); };
    if (r.err) { fail(r.err, { ch: r.ch }); if (r.at != null) input.setSelectionRange(r.at, r.at + 1); return; }
    if (isClean(r.S)) return fail('ownClean');
    own = { src: input.value, goal: touched ? goal : null }; store.set('own', own);
    S = r.S;
    S.unsure = autoSolve(JSON.parse(JSON.stringify(S))) == null;
    closeSheet(); mode = 'custom'; session = { solved: 0, streak: 0 }; startBoard();
  });
  update();
  setTimeout(() => input.focus(), 50);
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
  const left = r.ok === 'explodeNum' ? p.n : r.ok === 'hideOne' ? '1 · ' + inner(p.x) : inner(p.x || p.ex);
  const right = r.ok === 'hideOne' ? inner(p.x) : r.ok === 'gather' ? inner(p.r) : short(inner(p.ex));
  return mx(r.ok === 'gather' ? short(inner(p.ex)) + ' = ' + right : left + ' = ' + right);
}
function showSplit(tid) {
  const L = locate(S, tid);
  const c = L && coef(L.term), vp = L && varPart(L.term);
  if (!L || !tidy(L.term) || !vp.length) return run(s => opSplit(s, tid));
  const mono2 = k => T([...(Math.abs(k) !== 1 ? [N(Math.abs(k))] : []), ...vp.map(cloneF)], k < 0);
  let p = Math.sign(c) * (Math.abs(c) > 1 ? 1 : 2);
  const draw = () => {
    const host = openSheet(`<h2 style="font-size:1.6rem">${t('splitTitle', { x: mx(termHTML(L.term)) })}</h2><p>${t('splitHow')}</p>
      <div class="splitrow">
        <button type="button" class="tool" id="sMinus" aria-label="−1">−</button>
        <div class="splitprev expr-n">${sumHTML([L.term])} = ${sumHTML([mono2(p), mono2(c - p)])}</div>
        <button type="button" class="tool" id="sPlus" aria-label="+1">+</button>
      </div>
      <div class="row" style="margin-top:16px">
        <button class="tool main" type="button" id="sDo">${t('splitDo')}</button>
      </div>`);
    const step = d => { do p += d; while (p === 0 || p === c); draw(); host.querySelector(d < 0 ? '#sMinus' : '#sPlus').focus(); };
    host.querySelector('#sMinus').addEventListener('click', () => step(-1));
    host.querySelector('#sPlus').addEventListener('click', () => step(1));
    host.querySelector('#sDo').addEventListener('click', () => { closeSheet(); run(s => opSplitTwo(s, tid, p)); });
  };
  draw();
}

function loadLevel(i) {
  mode = 'levels';
  lvl = i; store.set('level', i);
  S = buildLevel(i); history = []; moves = 0; sel = null; born = new Set(); hintIds = new Set(); won = false;
  board.classList.remove('won');
  render(); sayIntro();
}

function tileEl(f, partners) {
  if (f.k === 'p') {
    const b = document.createElement('div');
    b.className = 'tile p'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button');
    b.setAttribute('aria-label', 'brackets');
    const l = document.createElement('span'); l.className = 'paren'; l.textContent = '(';
    const r = document.createElement('span'); r.className = 'paren'; r.textContent = ')';
    b.append(l, sideEl(f.terms, partners), r);
    if (f.e > 1) { const sp = document.createElement('sup'); sp.textContent = f.e; b.append(sp); b.setAttribute('aria-label', `brackets to the power ${f.e}`); }
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
    b.innerHTML = `${f.b}${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
    b.setAttribute('aria-label', f.e > 1 ? `${f.b} to the power ${f.e}` : f.b);
  } else {
    const inner = f.f.map(m => {
      const c = m.k === 'v' ? ` style="--c:var(${VARCOL[m.b] || '--vz'})"` : '';
      return `<span class="mini ${m.k}"${c}>${m.k === 'n' ? m.v : m.b}${m.k === 'v' && m.e > 1 ? `<sup>${m.e}</sup>` : ''}</span>`;
    }).join('');
    b.innerHTML = `<span class="paren">(</span>${inner}<span class="paren">)</span>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
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
    });
    d.append(te);
  });
  return d;
}

function render() {
  const partners = partnersOf(S, sel);
  born.idx = 0;
  const wrap = document.createElement('div'); wrap.className = 'expr';
  const stacked = S.parts.length > 1 && S.op === '/';
  if (stacked) wrap.classList.add('stack');
  S.parts.forEach((P, pi) => {
    if (pi > 0) {
      const op = document.createElement('button'); op.type = 'button'; op.dataset.op = '1';
      op.className = stacked ? 'opchip bigbar' : 'opchip';
      op.textContent = stacked ? '' : S.op;
      op.setAttribute('aria-label', stacked ? 'fraction bar' : S.op === ':' ? 'divide' : 'times');
      if (hintIds.has('op')) op.classList.add('hint');
      wrap.append(op);
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
    wrap.append(fr);
  });
  board.replaceChildren(wrap);
  $('written').innerHTML = stateHTML(S);

  // chrome
  $('btnLevels').textContent = t('levels');
  $('btnLang').textContent = lang === 'nl' ? 'EN' : 'NL';
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
    $('lvlBadge').hidden = !LEVELS[lvl].book && LEVELS[lvl].goal !== 'factor'; $('lvlBadge').textContent = LEVELS[lvl].book ? t('book') : t('factorBadge');
    $('moves').innerHTML = t('moves', { n: moves }) + (best[lvl] != null ? t('best', { n: best[lvl] }) : '');
  }
  $('writtenLabel').textContent = t('written');
  $('btnUndo').querySelector('span').textContent = t('undo');
  $('btnUndo').disabled = !history.length;
  $('btnHint').querySelector('span').textContent = t('hint');
  const fSel = sel && sel.t === 'f', tSel = sel && sel.t === 't';
  // the move buttons show what they will do, worked out on a copy of the board
  const exLabel = fSel && previewOf(s => opExplode(s, sel.id));
  $('btnExplode').hidden = !exLabel; if (exLabel) $('btnExplode').querySelector('span').innerHTML = exLabel;
  let gatherable = false;
  if (fSel) { const L = locate(S, sel.id); gatherable = L.term.f.filter(f => canMerge(L.f, f)).length >= 3; }
  $('btnGather').hidden = !gatherable;
  if (gatherable) $('btnGather').querySelector('span').innerHTML = previewOf(s => opGather(s, sel.id));
  const onesLabel = tSel && previewOf(s => opSplit(s, sel.id));
  $('btnSplit').hidden = !onesLabel; if (onesLabel) $('btnSplit').querySelector('span').innerHTML = onesLabel;
  // from a piece only when factoring (a lone −x is hard to hit as a term); elsewhere it would just be noise
  const twoId = tSel || (fSel && S.goal === 'factor') ? splitTermOf(sel.id) : null;
  $('btnSplitTwo').hidden = !twoId;
  if (twoId) $('btnSplitTwo').querySelector('span').innerHTML = mx(sumHTML([locate(S, twoId).term]) + ' = … + …');
  document.documentElement.lang = lang;
}

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
    sel = null; hintIds = new Set(); born = new Set((r.born || []).filter(id => !(id in origins)));
    render(); say(r.ok, r.p, 'ok');
    const ms = r.arcs ? animateMoves(rects, origins, true) : 0;
    busy = ms > 0;
    setTimeout(() => { busy = false; if (isClean(S)) win(); }, ms);
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
    // tapping a term twice writes it as a sum, like exploding a tile: 4x → x + x + x + x
    const L = locate(S, tid);
    if (L && coefAbs(L.term) >= 2 && varPart(L.term).length) { run(s => opSplit(s, tid)); return; }
    sel = null; render(); return;
  }
  if (sel && sel.t === 't') { const a = sel.id; run(s => termPair(s, a, tid)); return; }
  select({ t: 't', id: tid });
}
function select(s) {
  sel = s; hintIds = new Set(); born = new Set();
  render();
  const has = partnersOf(S, sel).size > 0;
  const canExplode = s.t === 'f' && !$('btnExplode').hidden;
  say(s.t === 'f' ? (has ? 'pickedP' : canExplode ? 'picked' : 'pickedAtom') : (has ? 'pickedTermP' : 'pickedTerm'), {}, 'info');
}

let drag = null, suppressClick = false;
const SVGNS = 'http://www.w3.org/2000/svg';
function tileAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const t = el && el.closest('#board .tile');
  return t && !t.classList.contains('p') ? t : null;
}
function clearSweep() {
  if (drag && drag.svg) drag.svg.remove();
  board.querySelectorAll('.swept').forEach(el => el.classList.remove('swept'));
}
board.addEventListener('pointerdown', e => {
  if (busy || won || e.button > 0) return;
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, id: e.pointerId, active: false, ids: [], pts: [] };
});
board.addEventListener('pointermove', e => {
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
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  if (!d.active) { drag = null; return; }
  suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
  clearSweep(); drag = null;
  if (d.ids.length >= 2) run(s => opSweep(s, d.ids));
  else if (d.ids.length === 1) select({ t: 'f', id: d.ids[0] });
};
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', () => { clearSweep(); drag = null; });

board.addEventListener('click', e => {
  if (suppressClick) { suppressClick = false; return; }
  if (busy || won) return;
  if (e.target.closest('.opchip')) return run(s => opOp(s));
  if (e.target.closest('.fbar')) return run(s => opBar(s));
  const hit = e.target.closest('.tile, .term');
  if (hit && hit.classList.contains('tile')) return onFactor(+hit.dataset.id);
  if (hit) return onTerm(+hit.dataset.tid);
  if (sel) { sel = null; render(); }
});

$('btnExplode').onclick = () => sel && run(s => opExplode(s, sel.id));
$('btnGather').onclick = () => sel && run(s => opGather(s, sel.id));
$('btnSplit').onclick = () => sel && run(s => opSplit(s, sel.id));
$('btnSplitTwo').onclick = () => sel && !busy && !won && showSplit(splitTermOf(sel.id));
$('btnUndo').onclick = () => {
  if (!history.length || busy) return;
  const prev = JSON.parse(history.pop()); S = prev.S; moves = prev.moves;
  sel = null; born = new Set(); hintIds = new Set(); won = false; board.classList.remove('won');
  render(); say(null, null, 'info', { en: 'One step back.', nl: 'Eén stap terug.' });
};
$('btnHint').onclick = () => {
  if (won) return;
  const h = hint(S); sel = null; born = new Set(); hintIds = new Set(h.ids); render(); say(h.k, h.p, 'info');
};
$('btnRestart').onclick = () => {
  if (mode === 'levels') return loadLevel(lvl);
  closeSheet(); S = JSON.parse(initial); history = []; moves = 0; sel = null; born = new Set(); hintIds = new Set(); won = false;
  board.classList.remove('won'); render(); sayIntro();
};
$('btnPractice').onclick = showPractice;
$('btnSkip').onclick = () => { if (busy) return; if (mode === 'custom') return showOwn(); session.streak = 0; nextProblem(); say('skipped', {}, 'info'); };
$('btnLang').onclick = () => {
  lang = lang === 'nl' ? 'en' : 'nl'; store.set('lang', lang); render();
  if (lastNote) say(lastNote.key, lastNote.p, lastNote.type, lastNote.raw);
  if (won) win(true);
  else if (sheetFn && $('sheetHost').children.length) sheetFn();
};
$('btnLevels').onclick = () => showLevels();
board.addEventListener('keydown', e => {
  const p = e.target.closest && e.target.closest('.tile.p');
  if (p && e.target === p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onFactor(+p.dataset.id); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSheet();
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
        <p style="margin-bottom:0">${t(S.goal === 'factor' ? 'winSubF' : 'winSub')}</p>
        <div class="result expr-n">${stateHTML(S)}</div>
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
      <p style="margin-bottom:0">${t(S.goal === 'factor' ? 'winSubF' : 'winSub')}</p>
      <div class="result expr-n">${stateHTML(S)}</div>
      <p>${t('winMoves', { n: moves })}${t('winBest', { n: best[lvl] })}${last ? ' ' + t('allDone') : ''}</p>
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

function showLevels() {
  sheetFn = showLevels;
  const btns = LEVELS.map((L, i) => `<button type="button" class="lvlbtn${best[i] != null ? ' done' : ''}${i === lvl ? ' cur' : ''}${L.book ? ' book' : ''}" data-l="${i}">
      ${best[i] != null ? '✓ ' : ''}${i + 1}<small>${L.book ? t('book') : L.goal === 'factor' ? t('factorBadge') : best[i] != null ? t('best', { n: best[i] }).replace(' · ', '') : '&nbsp;'}</small></button>`).join('');
  const host = openSheet(`<h2 style="font-size:1.6rem">${t('chooseLevel')}</h2><div class="lvlgrid">${btns}</div>`);
  host.querySelectorAll('.lvlbtn').forEach(b => b.addEventListener('click', () => { closeSheet(); loadLevel(+b.dataset.l); }));
}

loadLevel(lvl);
