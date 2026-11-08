/* The i tile: like a letter tile, in a colour of its own (it is a number, not an unknown). */
import { defineTile } from '../../ui/tiles.js';

defineTile('im', f => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tile v im'; b.dataset.id = f.id; b.setAttribute('aria-label', f.e > 1 ? `i to the power ${f.e}` : 'i');
  b.innerHTML = f.e > 1 ? `i<sup>${f.e}</sup>` : 'i';
  return b;
});
