/* Formulas: sequences (the n-th term, and which term has a value), sums by their formulas, and physics
   formulas solved for one letter. */
import { defineLevel, defineSkill } from '../../content/registry.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { F, T, cloneT } from '../../core/kinds/sums.js';
import { GEN, pick } from '../../practice.js';
import { parseProblem } from '../../parse.js';
import { Ex } from '../exp/kind.js';

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
// a formula with a given value: n = 10
const ev = (src, given) => Object.assign(parseProblem(src).S, { goal: 'evaluate', given });
// a·rⁿ⁻¹ (the parser has no letters in exponents)
const geo = (a, q, n) => ({ parts: [F([T([N(a), Ex(q, [T([V('n')]), T([N(1)], true)])])])], op: null, goal: 'evaluate', given: { n } });
const geoEq = (a, q, u) => ({ parts: [F([T([N(a), Ex(q, [T([V('n')]), T([N(1)], true)])])]), F([T([N(u)])])], op: '=', goal: 'solve', unknown: 'n' });
const solveFor = (src, u) => parseProblem(src, 'solve', u).S;
const fresh = make => () => { const S = make(); S.parts.forEach(P => { P.num = P.num.map(cloneT); P.den = P.den.map(cloneT); }); return S; };

const L = (id, goal, s, en, nl) => defineLevel({ id, goal, s: fresh(s), en, nl });
/* ---- sequences ---- */
L('sequences.1', 'evaluate', () => ev('3+4(n-1)', { n: 10 }),
  'A sequence: 3, 7, 11, 15, … Each term is 4 more. The n-th term is 3 + 4(n − 1). Which is the 10th? Select n: a button writes 10 in its place.',
  'Een rij: 3, 7, 11, 15, … Elke term is 4 meer. De n-de term is 3 + 4(n − 1). Wat is de 10e? Kies n: een knop schrijft 10 op zijn plaats.');
L('sequences.2', 'solve', () => solveFor('3+4(n-1)=39', 'n'),
  'The other way round: which term is 39? Solve for n.', 'Andersom: de hoeveelste term is 39? Los op naar n.');
L('sequences.3', 'evaluate', () => geo(2, 3, 4),
  'Doubling is not the only growth: 2, 6, 18, … each term is 3 times the one before. The n-th term is 2 · 3ⁿ⁻¹. The 4th?',
  'Verdubbelen is niet de enige groei: 2, 6, 18, … elke term is 3 keer de vorige. De n-de term is 2 · 3ⁿ⁻¹. De 4e?');
L('sequences.4', 'solve', () => geoEq(5, 2, 80),
  '5, 10, 20, … which term is 80?', '5, 10, 20, … de hoeveelste term is 80?');
/* ---- sums by their formulas ---- */
L('sums.1', 'evaluate', () => ev('n(n+1)/2', { n: 100 }),
  '1 + 2 + … + 100. Gauss wrote the sum twice, once backwards: every pair adds up to 101, and there are 100 pairs, so twice the sum is 100 · 101. The sum is n(n + 1)/2.',
  '1 + 2 + … + 100. Gauss schreef de som twee keer op, één keer achterstevoren: elk paar is samen 101, en het zijn 100 paren, dus twee keer de som is 100 · 101. De som is n(n + 1)/2.');
L('sums.2', 'evaluate', () => ev('n/2·(3+39)', { n: 10 }),
  'The same trick for 3 + 7 + … + 39 (10 terms): first plus last, times the number of terms, halved.',
  'Dezelfde truc voor 3 + 7 + … + 39 (10 termen): eerste plus laatste, keer het aantal termen, gedeeld door 2.');
L('sums.3', 'evaluate', () => ev('n^2', { n: 12 }),
  '1 + 3 + 5 + … the first n odd numbers add up to n². The first 12?', '1 + 3 + 5 + … de eerste n oneven getallen zijn samen n². De eerste 12?');
/* ---- physics formulas: solve for one letter ---- */
L('physics.1', 'solve', () => solveFor('s=v·t', 't'),
  'Distance is speed times time. How long does it take? Solve for t: the other letters are numbers you don’t know yet.',
  'Afstand is snelheid keer tijd. Hoe lang duurt het? Los op naar t: de andere letters zijn getallen die je nog niet kent.');
L('physics.2', 'solve', () => solveFor('v=u+a·t', 't'),
  'Speed after accelerating: v = u + at. Solve for t.', 'Snelheid na versnellen: v = u + at. Los op naar t.');
L('physics.3', 'solve', () => solveFor('f=m·a', 'm'),
  'Newton: force is mass times acceleration. Which mass?', 'Newton: kracht is massa keer versnelling. Welke massa?');
L('physics.4', 'solve', () => solveFor('p·v=n·r·t', 't'),
  'The gas law pV = nRT (written small here). Solve for the temperature t.', 'De gaswet pV = nRT (hier klein geschreven). Los op naar de temperatuur t.');

const Sk = (id, field, requires, glyph, en, nl, ben, bnl, n, gen) => defineSkill(id, { field, requires, glyph, title: { en, nl }, blurb: { en: ben, nl: bnl }, levels: Array.from({ length: n }, (_, i) => `${id}.${i + 1}`), gen });
Sk('sequences', 'algebra', ['formulas', 'expeq'], 'uₙ', 'Sequences', 'Rijen', 'The n-th term of a sequence: write in n, or solve for it.',
  'De n-de term van een rij: vul n in, of los op naar n.', 4, ['sequences']);
Sk('sums', 'algebra', ['sequences'], 'Σ', 'Sums', 'Sommen', '1 + 2 + … + 100 without adding a hundred numbers: Gauss’s pairs.',
  '1 + 2 + … + 100 zonder honderd getallen op te tellen: de paren van Gauss.', 3, ['sums']);
Sk('physics', 'applied', ['formulas', 'fraceq'], 'v=at', 'Physics formulas', 'Natuurkundeformules', 'A formula solved for the letter you need, with the balance method.',
  'Een formule opgelost naar de letter die je nodig hebt, met de balansmethode.', 4, ['physics']);

GEN.sequences = d => {
  const a = r(1, 9), v = r(2, 6), n = r(5, 15);
  if (d === 1) return ev(`${a}+${v}(n-1)`, { n });
  if (d === 2) return solveFor(`${a}+${v}(n-1)=${a + v * (n - 1)}`, 'n');
  const q = pick([2, 3]), k = r(3, q === 2 ? 6 : 4), b = pick([1, 2, 3, 5]);
  return pick([() => geo(b, q, k), () => geoEq(b, q, b * q ** (k - 1))])();
};
GEN.sums = d => {
  const n = d === 1 ? pick([10, 20, 50]) : r(8, 30);
  if (d === 1) return ev('n(n+1)/2', { n });
  if (d === 2) return ev('n^2', { n });
  const a = r(1, 5), v = r(2, 4);
  return ev(`n/2·(${2 * a}+(n-1)·${v})`, { n: pick([10, 12, 20]) });
};
GEN.physics = () => pick([
  () => solveFor('s=v·t', 't'), () => solveFor('s=v·t', 'v'), () => solveFor('v=u+a·t', 'a'), () => solveFor('v=u+a·t', 't'),
  () => solveFor('f=m·a', 'a'), () => solveFor('p·v=n·r·t', 'n'), () => solveFor('e=m·g·h', 'h'),
])();
