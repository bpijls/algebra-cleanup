/* The sine/cosine/tangent tile: its name (with a power), and a bracket around its pieces, which are tiles of
   their own. A number inside is an angle in degrees: its tile gets a °. */
import { opPythSwap } from './rules.js';
import { defineTile, defineToolMove } from '../../ui/tiles.js';

defineTile('trig', (f, partners, sideEl) => {
  const b = document.createElement('div');
  b.className = 'tile log trig'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', f.fn + (f.e > 1 ? ' squared' : ''));
  const name = Object.assign(document.createElement('span'), { className: 'lname', textContent: f.fn });
  if (f.e > 1) name.append(Object.assign(document.createElement('sup'), { textContent: f.e }));
  const l = Object.assign(document.createElement('span'), { className: 'paren', textContent: '(' });
  const r = Object.assign(document.createElement('span'), { className: 'paren', textContent: ')' });
  const inner = sideEl(f.terms, partners);
  for (const t of f.terms) if (t.f.length === 1 && t.f[0].k === 'n') inner.querySelector(`[data-id="${t.f[0].id}"]`)?.append(Object.assign(document.createElement('span'), { className: 'deg', textContent: '°' }));
  b.append(name, l, inner, r);
  return b;
});

// the button for a selected sin² or cos²: cos²a = 1 − sin²a
defineToolMove('pythSwap', opPythSwap);
