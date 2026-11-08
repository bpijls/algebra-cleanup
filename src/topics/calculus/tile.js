/* The derivative tile: a bracket around its pieces with a prime after it, (…)′. */
import { defineTile } from '../../ui/tiles.js';

defineTile('d', (f, partners, sideEl) => {
  const b = document.createElement('div');
  b.className = 'tile log deriv'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'derivative');
  const l = Object.assign(document.createElement('span'), { className: 'paren', textContent: '(' });
  const r = Object.assign(document.createElement('span'), { className: 'paren', textContent: ')′' });
  b.append(l, sideEl(f.terms, partners), r);
  return b;
});
