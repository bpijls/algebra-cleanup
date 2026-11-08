/* Inequalities, solved with the balance method like equations (S.rel holds the sign). Times or divided by a
   negative number turns the sign round, with a note that says why; the win sheet draws the answer on a number line. */
import { defineLevel, defineSkill } from './registry.js';
import { GEN, pick } from '../practice.js';
import { parseProblem } from '../parse.js';

const prob = src => parseProblem(src, 'solve').S;
const level = (id, src, en, nl) => defineLevel({ id, s: () => prob(src), goal: 'solve', en, nl });

level('ineq.1', 'x+3<7',
  'An inequality: not one answer, but every number below a boundary. Balance it as you would an equation: tap the sign, then drag the 3 across.',
  'Een ongelijkheid: niet één antwoord, maar alle getallen onder een grens. Balanceer zoals bij een vergelijking: tik op het teken en sleep de 3 naar de overkant.');
level('ineq.2', '3x>=12',
  '≥ means “greater than or equal to”. Dividing by 3, a positive number, keeps the sign.',
  '≥ betekent “groter dan of gelijk aan”. Delen door 3, een positief getal, houdt het teken gelijk.');
level('ineq.3', '-2x<6',
  'Now divide by −2. Watch the sign: −2 &lt; 3, but 2 &gt; −3. Times or divided by a negative number, the sign turns round.',
  'Deel nu door −2. Let op het teken: −2 &lt; 3, maar 2 &gt; −3. Keer of gedeeld door een negatief getal draait het teken om.');
level('ineq.4', '4-x>1',
  'A lone −x: divide by −1, and the sign turns round.',
  'Een losse −x: deel door −1, en het teken draait om.');
level('ineq.5', '5x+3>2x+12',
  'Letters on both sides: the same steps as an equation.',
  'Letters aan beide kanten: dezelfde stappen als bij een vergelijking.');
level('ineq.6', 'x/3<=4',
  'A fraction: multiply both sides by 3, a positive number.',
  'Een breuk: vermenigvuldig beide kanten met 3, een positief getal.');
level('ineq.7', '2x+5>=4x-3',
  'Which way does the sign end up? Count the times you divided by a negative number.',
  'Welke kant wijst het teken op? Tel hoe vaak je door een negatief getal deelde.');

defineSkill('ineq', {
  field: 'algebra', requires: ['linear'], glyph: 'x<3', title: { en: 'Inequalities', nl: 'Ongelijkheden' },
  blurb: { en: 'Balance as with an equation; times a negative number turns the sign round.', nl: 'Balanceer zoals bij een vergelijking; keer een negatief getal draait het teken om.' },
  levels: Array.from({ length: 7 }, (_, i) => `ineq.${i + 1}`), gen: ['ineq'],
});

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const S = () => pick(['<', '>', '<=', '>=']);
GEN.ineq = d => {
  const x = r(-4, 6), a = r(2, 5), b = r(1, 9);
  if (d === 1) return pick([() => prob(`x+${b}${S()}${x + b}`), () => prob(`${a}x${S()}${a * x}`)])();
  if (d === 2) return pick([() => prob(`-${a}x${S()}${-a * x}`), () => prob(`${b}-x${S()}${b - x}`)])();
  const c = a + r(1, 3);
  return pick([() => prob(`${a}x+${b}${S()}${c}x+${b - (c - a) * x}`.replace('+-', '-')), () => prob(`x/${a}${S()}${r(1, 5)}`)])();
};
