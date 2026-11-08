/* The power tile 2ˣ: the base, and its exponent raised and smaller, whose pieces are tiles of their own. Also the
   "8 = 2³" button and the log of both sides in the balance panel. */
import { opAsPower, opLogBoth } from './rules.js';
import { definePanelMove } from '../../ui/balance.js';
import { defineTile, defineToolMove } from '../../ui/tiles.js';

defineTile('ex', (f, partners, sideEl) => {
  const b = document.createElement('div');
  b.className = 'tile log ex'; b.dataset.id = f.id; b.tabIndex = 0; b.setAttribute('role', 'button'); b.setAttribute('aria-label', `${f.b} to a power`);
  const base = Object.assign(document.createElement('span'), { className: 'xbase', textContent: f.b });
  const up = document.createElement('div'); up.className = 'xpow'; up.append(sideEl(f.terms, partners));
  b.append(base, up);
  return b;
});

// in an equation with 2ˣ: 8 = 2³
defineToolMove('asPower', opAsPower);

// log of both sides, in the balance panel, when the equation has a power with the unknown in its exponent
definePanelMove({ id: 'logBoth', label: 'logBothBtn', applies: S => JSON.stringify(S.parts).includes('"k":"ex"'), run: (S, bi) => opLogBoth(S, bi) });
