/* The menu. */
import { $ } from './state.js';

/* ---- the menu (levels, practice, restart, language) and the floating bars ---- */
export function setMenu(open) {
  $('menu').hidden = !open; $('btnMenu').setAttribute('aria-expanded', String(open));
  if (open) $('menu').querySelector('.menuitem').focus();
}
$('btnMenu').onclick = e => { e.stopPropagation(); setMenu($('menu').hidden); };
$('menu').addEventListener('click', e => { if (e.target.closest('.menuitem')) setMenu(false); });
document.addEventListener('pointerdown', e => { if (!$('menu').hidden && !e.target.closest('#menu, #btnMenu')) setMenu(false); });
