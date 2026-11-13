/* Log rules, exponential equations and growth: levels and skills. */
import { defineLevel, defineSkill, defineShortcut } from '../../content/registry.js';
import { Q } from '../../core/kinds/fraction.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { F, T, cloneT } from '../../core/kinds/sums.js';
import { Lg } from '../log/kind.js';
import { Ex } from './kind.js';
import { EARNED } from './rules.js';
import { GEN, pick } from '../../practice.js';

// log(aˣ) = x·log a: earned by finishing the logarithm skill, where log(a³) was exploded by hand
defineShortcut('logPower', { skill: 'logs' });

const lq = (top, bot) => Lg([T([Q([T(top)], [T(bot)])])]);
// every build is fresh tiles (cloneT), so playing a level never changes its next start
const simp = (...terms) => () => ({ parts: [F(terms.map(cloneT))] });
[
  { id: 'logrules.1', s: simp(T([lq([V('a')], [V('b')])])),
    en: 'A log of a fraction. The twin of the product rule: the log of a quotient is the log of the top <b>minus</b> the log of the bottom.',
    nl: 'Een log van een breuk. De tweeling van de productregel: de log van een quotiënt is de log van de teller <b>min</b> de log van de noemer.' },
  { id: 'logrules.2', s: simp(T([lq([V('a', 2)], [V('b')])])),
    en: 'Explode the log, then what is still a power. You earned a shortcut in Logarithms: log(<i>a</i>²) can become 2 log <i>a</i> in one tap.',
    nl: 'Laat de log ontploffen, en daarna wat nog een macht is. In Logaritmen verdiende je een kortere weg: log(<i>a</i>²) wordt in één tik 2 log <i>a</i>.' },
  { id: 'logrules.3', s: simp(T([lq([V('a')], [V('b')])]), T([Lg([T([V('b')])])])),
    en: 'Explode and look for what cancels in the sum.',
    nl: 'Laat ontploffen en kijk wat er in de som tegen elkaar wegvalt.' },
  { id: 'logrules.4', s: simp(T([lq([V('a', 3)], [V('a')])])),
    en: 'The same letter on top and below. Two routes: cancel inside the log first, or explode the log. Do they agree?',
    nl: 'Dezelfde letter boven en onder. Twee routes: eerst in de log wegstrepen, of de log laten ontploffen. Komen ze op hetzelfde uit?' },
].forEach(L => defineLevel({ ...L, s: () => Object.assign(L.s(), { earned: EARNED }) }));

const x = (u = 'x') => T([V(u, 1)]);
const eq = (L, R, extra) => () => Object.assign({ parts: [F(L.map(cloneT)), F(R.map(cloneT))], op: '=', goal: 'solve' }, extra || {});
[
  { id: 'expeq.1', s: eq([T([Ex(2, [x()])])], [T([N(8)])]),
    en: 'An unknown in the exponent. Write 8 as a power of 2 (select it: a button shows how). Then the same base is on both sides: drag the power across the =, and the exponents must be equal.',
    nl: 'Een onbekende in de exponent. Schrijf 8 als macht van 2 (kies hem: een knop laat zien hoe). Dan staat links en rechts hetzelfde grondtal: sleep de macht over het =-teken, en de exponenten moeten gelijk zijn.' },
  { id: 'expeq.2', s: eq([T([Ex(3, [x(), T([N(1)])])])], [T([N(27)])]),
    en: 'The exponent is a sum. Same base, so the sums are equal.',
    nl: 'De exponent is een som. Hetzelfde grondtal, dus de sommen zijn gelijk.' },
  { id: 'expeq.3', s: eq([T([N(5), Ex(2, [x()])])], [T([N(40)])]),
    en: 'A number in front of the power: divide it away first.',
    nl: 'Een getal voor de macht: deel dat eerst weg.' },
  { id: 'expeq.4', s: eq([T([Ex(4, [x()])])], [T([N(8)])]),
    en: '4 and 8 are both powers of 2. Explode 4ˣ: 4 = 2 · 2.',
    nl: '4 en 8 zijn allebei machten van 2. Laat 4ˣ ontploffen: 4 = 2 · 2.' },
  { id: 'expeq.5', s: eq([T([Ex(2, [x()])])], [T([N(5)])], { earned: EARNED }),
    en: '5 is no power of 2. Take the log of both sides (the log button in the balance panel), then use your shortcut: log(2ˣ) = x · log 2.',
    nl: '5 is geen macht van 2. Neem de log van beide kanten (de log-knop in het balanspaneel), en gebruik je kortere weg: log(2ˣ) = x · log 2.' },
].forEach(L => defineLevel({ ...L, goal: 'solve' }));

const g = (c, b, n) => eq(c === 1 ? [T([Ex(b, [x('t')])])] : [T([N(c), Ex(b, [x('t')])])], [T([N(n)])]);
[
  { id: 'growth.1', s: g(1, 2, 16),
    en: 'Bacteria double every hour. After how many hours are there 16 times as many? 2<sup><i>t</i></sup> = 16.',
    nl: 'Bacteriën verdubbelen elk uur. Na hoeveel uur zijn het er 16 keer zoveel? 2<sup><i>t</i></sup> = 16.' },
  { id: 'growth.2', s: g(100, 2, 800),
    en: '100 bacteria, doubling every hour. When are there 800?',
    nl: '100 bacteriën, die elk uur verdubbelen. Wanneer zijn het er 800?' },
  { id: 'growth.3', s: g(5, 3, 405),
    en: 'A rumour: 5 people know it, and every day each tells 2 more, so it triples. When do 405 people know?',
    nl: 'Een gerucht: 5 mensen weten het, en elke dag vertelt ieder het aan 2 anderen, dus het verdrievoudigt. Wanneer weten 405 mensen het?' },
].forEach(L => defineLevel({ ...L, goal: 'solve' }));

defineSkill('logrules', { requires: ['logs'], glyph: 'log a⁄b', title: { en: 'Log rules', nl: 'Logregels' },
  blurb: { en: 'The log of a quotient is a difference of logs; log(aˣ) is a shortcut you earned.', nl: 'De log van een quotiënt is een verschil van logs; log(aˣ) is een kortere weg die je verdiende.' },
  levels: ['logrules.1', 'logrules.2', 'logrules.3', 'logrules.4'], gen: ['logrules'] });
defineSkill('expeq', { requires: ['logrules'], glyph: '2ˣ=8', title: { en: 'Exponential equations', nl: 'Exponentiële vergelijkingen' },
  blurb: { en: 'The same base on both sides: the exponents are equal. Otherwise: log of both sides.', nl: 'Hetzelfde grondtal aan beide kanten: de exponenten zijn gelijk. Anders: de log van beide kanten.' },
  levels: ['expeq.1', 'expeq.2', 'expeq.3', 'expeq.4', 'expeq.5'], gen: ['expeq'] });
defineSkill('growth', { field: 'applied', requires: ['expeq'], glyph: '2ᵗ', title: { en: 'Growth', nl: 'Groei' },
  blurb: { en: 'Doubling and tripling: when does it reach the number?', nl: 'Verdubbelen en verdrievoudigen: wanneer wordt het getal bereikt?' },
  levels: ['growth.1', 'growth.2', 'growth.3'], gen: ['growth'] });

// practice for the log rules: a quotient inside, a power on top or below, a difference that leaves less
GEN.logrules = d => {
  const [p, q] = pick([['a', 'b'], ['x', 'y'], ['p', 'q']]), k = pick([2, 3]);
  const forms = d === 1 ? [[T([lq([V(p)], [V(q)])])], [T([N(2), lq([V(p)], [V(q)])])]]
    : d === 2 ? [[T([lq([V(p, k)], [V(q)])])], [T([lq([V(p)], [V(q, k)])])]]
      : [[T([lq([V(p)], [V(q)])]), T([Lg([T([V(q)])])])], [T([lq([V(p, k + 1)], [V(p)])])]];
  return { parts: [F(pick(forms))], goal: 'simplify', earned: EARNED };
};
