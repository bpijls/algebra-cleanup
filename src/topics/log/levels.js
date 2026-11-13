/* The logarithm levels and their skill. */
import { defineLevel, defineSkill } from '../../content/registry.js';
import { V } from '../../core/kinds/letter.js';
import { F, T } from '../../core/kinds/sums.js';
import { Lg } from './kind.js';

// the log of a product is the sum of the logs, and nothing else is a rule
[
  { id: 'logs.1', s: () => ({ parts: [F([T([Lg([T([V('a'), V('b')])])])])] }),
    en: 'A new piece: <b>log</b>. The log of a product is the sum of the logs. Tap log twice to explode it. That only holds for numbers above 0, so the game writes that down.',
    nl: 'Een nieuw stuk: <b>log</b>. De log van een product is de som van de logs. Tik twee keer op log om hem te exploderen. Dat klopt alleen voor getallen boven 0, dus het spel schrijft dat op.' },
  { id: 'logs.2', s: () => ({ parts: [F([T([Lg([T([V('a', 3)])])])])] }),
    en: 'log(<i>a</i>³) is not a product yet. Explode <i>a</i>³ first: what does log(<i>a</i>·<i>a</i>·<i>a</i>) become?',
    nl: 'log(<i>a</i>³) is nog geen product. Explodeer eerst <i>a</i>³: wat wordt log(<i>a</i>·<i>a</i>·<i>a</i>)?' },
  { id: 'logs.3', s: () => ({ parts: [F([T([Lg([T([V('a', 2), V('b')])])]), T([Lg([T([V('b')])])], true)])] }),
    en: 'Explode, then look for like terms. What is left?',
    nl: 'Explodeer, en zoek dan gelijksoortige termen. Wat blijft er over?' },
].forEach(defineLevel);

defineSkill('logs', { requires: ['like'], glyph: 'log',
  title: { en: 'Logarithms', nl: 'Logaritmen' },
  blurb: { en: 'The log of a product is the sum of the logs. Everything else follows from exploding.',
           nl: 'De log van een product is de som van de logs. De rest volgt uit exploderen.' },
  levels: ['logs.1', 'logs.2', 'logs.3'], gen: ['logs'] });
