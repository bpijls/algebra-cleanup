/* The NOT tile: a bar over its pieces, which are tiles of their own. */
import { defineTile } from '../../ui/tiles.js';

defineTile('not', (f, partners, sideEl) => {
  const b = document.createElement('div');
  b.className = 'tile not'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'not');
  const bar = Object.assign(document.createElement('span'), { className: 'notbar' }); bar.setAttribute('aria-hidden', 'true');
  b.append(bar, sideEl(f.terms, partners));
  return b;
});
