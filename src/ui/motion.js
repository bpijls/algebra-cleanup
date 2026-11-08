/* Motion: tiles travel from where they were; new pieces fly in along arcs; refusals shake. */
import { SVGNS } from './input.js';
import { board } from './state.js';

/* ---- motion: every tile travels from where it was; new pieces fly in from their sources along arcs ---- */
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function tileRects() {
  const m = new Map();
  board.querySelectorAll('.tile[data-id]').forEach(el => m.set(+el.dataset.id, el.getBoundingClientRect()));
  return m;
}
export function animateMoves(rects, origins, arcs) {
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
export function shake(ids) {
  requestAnimationFrame(() => ids.forEach(id => {
    const e = board.querySelector(`[data-id="${id}"],[data-tid="${id}"]`);
    if (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
  }));
}
