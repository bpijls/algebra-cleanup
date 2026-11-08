/* The log tile: "log" and a bracket around its pieces, which are tiles of their own (like a root's). */
import { defineTile } from '../../ui/tiles.js';

defineTile('log', (f, partners, sideEl) => {
  const b = document.createElement('div');
  b.className = 'tile log'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'log');
  const name = Object.assign(document.createElement('span'), { className: 'lname', textContent: 'log' });
  const l = Object.assign(document.createElement('span'), { className: 'paren', textContent: '(' });
  const r = Object.assign(document.createElement('span'), { className: 'paren', textContent: ')' });
  b.append(name, l, sideEl(f.terms, partners), r);
  return b;
});
