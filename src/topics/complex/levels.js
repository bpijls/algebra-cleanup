/* Complex numbers: one skill, from i · i = −1 to a quadratic equation with D < 0. */
import { defineLevel, defineSkill } from '../../content/registry.js';
import { GEN, pick } from '../../practice.js';
import { parseProblem } from '../../parse.js';

const P = (src, extra) => () => Object.assign(parseProblem(src).S, { complex: true }, extra || {});
[
  ['complex.1', 'i^2', 'A new number, <i>i</i>, with one rule: <i>i</i> · <i>i</i> = −1. Explode <i>i</i>², then tap one <i>i</i> and the other.',
    'Een nieuw getal, <i>i</i>, met één regel: <i>i</i> · <i>i</i> = −1. Laat <i>i</i>² ontploffen en tik de ene <i>i</i> en dan de andere.'],
  ['complex.2', '3i·2i', 'Numbers with numbers, <i>i</i> with <i>i</i>.', 'Getallen met getallen, <i>i</i> met <i>i</i>.'],
  ['complex.3', '√(-9)', 'The root of a negative number: explode the root. √(−9) = <i>i</i> · √9, because (<i>i</i> · 3)² = −9.',
    'De wortel van een negatief getal: laat de wortel ontploffen. √(−9) = <i>i</i> · √9, want (<i>i</i> · 3)² = −9.'],
  ['complex.4', '(2+i)(3-i)', 'Open the brackets as always. One term ends up with <i>i</i> · <i>i</i>.',
    'Werk de haakjes weg zoals altijd. In één term komt <i>i</i> · <i>i</i> te staan.'],
  ['complex.5', 'x^2=-4', 'No real number squares to −4. With <i>i</i> there are two: take the root of both sides.',
    'Geen reëel getal heeft −4 als kwadraat. Met <i>i</i> zijn het er twee: neem de wortel van beide kanten.'],
  ['complex.6', 'x^2+2x+5=0', 'D < 0: no real solutions, but completing the square still works. Carry on past the root of a negative number.',
    'D < 0: geen reële oplossingen, maar kwadraat afsplitsen werkt nog steeds. Ga door voorbij de wortel van een negatief getal.'],
].forEach(([id, src, en, nl]) => defineLevel({ id, s: P(src), goal: src.includes('=') ? 'solve' : undefined, en, nl }));

defineSkill('complex', { field: 'algebra', requires: ['quadratic', 'sqrt'], glyph: 'i²', title: { en: 'Complex numbers', nl: 'Complexe getallen' },
  blurb: { en: 'A number i with i · i = −1. Now every quadratic equation has solutions.', nl: 'Een getal i met i · i = −1. Nu heeft elke kwadratische vergelijking oplossingen.' },
  levels: Array.from({ length: 6 }, (_, i) => `complex.${i + 1}`), gen: ['complex'] });

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const prob = src => Object.assign(parseProblem(src).S, { complex: true });
const sg = n => (n < 0 ? '-' : '+') + Math.abs(n);
GEN.complex = d => {
  const a = r(1, 5), b = r(1, 4) * pick([1, -1]), c = r(1, 5), e = r(1, 4) * pick([1, -1]), k = r(2, 6);
  if (d === 1) return prob(pick([`${a}i·${c}i`, `√(-${k * k})`, `(${a}${sg(b)}i)+(${c}${sg(e)}i)`, `i^${r(2, 4)}`]));
  if (d === 2) return prob(pick([`(${a}${sg(b)}i)(${c}${sg(e)}i)`, `x^2=-${k * k}`, `(${a}${sg(b)}i)^2`]));
  const p = r(1, 4) * pick([1, -1]), q = p * p + pick([1, 4, 9, 16, 2, 3]);   // (x + p)² + (q − p²): D < 0
  return prob(`x^2${sg(2 * p)}x${sg(q)}=0`);
};
