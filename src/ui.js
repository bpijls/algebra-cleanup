/* The entry point (index.html loads it as a module): every UI module, then the first level. */
import './ui/input.js';
import './ui/buttons.js';
import './ui/menu.js';
import './ui/layout.js';
import './ui/balance.js';
import './topics/index.js';
import './topics/tiles.js';
import { hint } from './core/goals/index.js';
import { setLang } from './i18n.js';
import { autoSolveStep } from './practice.js';
import { bal, overOtherSide } from './ui/balance.js';
import { loadLevel } from './ui/controller.js';
import { showOwn } from './ui/own.js';
import { closeSheet } from './ui/sheets.js';
import { board, ui } from './ui/state.js';
import { render } from './ui/tiles.js';

// for devtools and the browser playthrough scripts: the module's state and entry points (alg.S, alg.loadLevel(3) …)
window.alg = {
  get S() { return ui.S; }, get busy() { return ui.busy; }, get balancing() { return ui.balancing; }, get bdrag() { return ui.bdrag; },
  get mode() { return ui.mode; }, get won() { return ui.won; }, set won(v) { ui.won = v; }, bal, board,
  loadLevel, render, closeSheet, showOwn, overOtherSide, hint, autoSolveStep, setLang,
};

loadLevel(ui.lvl);
