/* Fractions inside a sum, as skills: number fractions (½ + ⅓), square roots (√12 = 2√3, no root below the
   bar), fractions with letters (1/a + 1/b) and equations with fractions (x/3 + 2 = 5). The moves are in
   core/fractions.js and rules/pair.js. */
import { defineLevel, defineSkill } from './registry.js';
import { GEN, pick } from '../practice.js';
import { parseProblem } from '../parse.js';

// a level or practice problem as a student would type it; rootFree: no root may stay below the bar
const P = (src, goal, extra) => () => Object.assign(parseProblem(src, goal).S, extra || {});
// (a simplify level has no goal of its own: the badge only names other goals)
const level = (id, src, goal, en, nl, extra) => defineLevel({ id, s: P(src, goal, extra), goal: goal === 'simplify' ? undefined : goal, en, nl });

/* ---- number fractions (goal combine: write it as one fraction) ---- */
level('numfrac.1', '1/5+2/5', 'combine',
  'Two fractions with the same bottom: fifths and fifths. Tap one fraction’s bar, then the other’s: the tops add up. New goal: write it as <b>one fraction</b>.',
  'Twee breuken met dezelfde noemer: vijfden en vijfden. Tik de streep van de ene breuk en dan die van de andere: de tellers tel je op. Nieuw doel: schrijf het als <b>één breuk</b>.');
level('numfrac.2', '1/2+1/4', 'combine',
  'Halves and quarters don’t add up as they are. Pick ½ and press <b>Expand</b>: top and bottom times 2 keeps its value, and makes quarters.',
  'Halven en kwarten tel je niet zomaar op. Kies ½ en druk op <b>Uitbreiden</b>: teller en noemer keer 2 houdt de waarde gelijk, en maakt er kwarten van.');
level('numfrac.3', '2/3+3/4', 'combine',
  'Neither bottom goes into the other. Expand both to twelfths.',
  'Geen van de noemers past in de andere. Breid allebei uit tot twaalfden.');
level('numfrac.4', '2-3/4', 'combine',
  'A whole number is a fraction too: 2 = 2/1. Expand it to quarters.',
  'Een heel getal is ook een breuk: 2 = 2/1. Breid het uit tot kwarten.');
level('numfrac.5', '2/3·3/4', 'combine',
  'Times: tap one fraction, then the other. Top times top, bottom times bottom. Then cancel what is equal.',
  'Keer: tik de ene breuk en dan de andere. Teller keer teller, noemer keer noemer. Streep daarna weg wat gelijk is.');
level('numfrac.6', '2/3:4/5', 'combine',
  'Dividing by a fraction: tap the : and see what it turns into.',
  'Delen door een breuk: tik op de : en kijk waar hij in verandert.');

/* ---- square roots ---- */
level('sqrt.1', '√12', 'simplify',
  'A root is a tile with a sum inside. Explode 12 under it, then tap the two equal numbers: a pair comes out as one, √(2·2) = 2.',
  'Een wortel is een tegel met een som erin. Laat 12 eronder ontploffen en tik de twee gelijke getallen: een paar komt eruit als één, √(2·2) = 2.');
level('sqrt.2', '√2·√6', 'simplify',
  'Two roots in one term become one root: √2 · √6 = √(2·6). Tap one root, then the other.',
  'Twee wortels in één term worden één wortel: √2 · √6 = √(2·6). Tik de ene wortel en dan de andere.');
level('sqrt.3', '2√3+5√3', 'simplify',
  'Roots of the same number are like terms, the way a and a are.',
  'Wortels van hetzelfde getal zijn gelijksoortige termen, zoals a en a.');
level('sqrt.4', '√8+√18', 'simplify',
  '√8 and √18 don’t look alike. Take the pairs out of each and look again.',
  '√8 en √18 lijken niet op elkaar. Haal uit elk de paren en kijk nog eens.');
level('sqrt.5', '1/√2', 'simplify',
  'Textbooks write this without a root below the bar. Pick the fraction and expand it by √2: √2 · √2 has no root left.',
  'Boeken schrijven dit zonder wortel onder de streep. Kies de breuk en breid hem uit met √2: √2 · √2 heeft geen wortel meer.', { rootFree: true });
level('sqrt.6', '6/√3', 'simplify',
  'The same trick, then clean up what is left.',
  'Dezelfde truc, en ruim daarna op wat over is.', { rootFree: true });

/* ---- fractions with letters ---- */
level('algfrac.1', 'x/3+x/4', 'combine',
  'Letters on top change nothing: expand to the same bottom, add the tops.',
  'Letters in de teller veranderen niets: breid uit tot dezelfde noemer en tel de tellers op.');
level('algfrac.2', '1/a+1/b', 'combine',
  'Letters at the bottom: expand 1/<i>a</i> by <i>b</i> and 1/<i>b</i> by <i>a</i>. Expanding by a letter writes down that it isn’t 0.',
  'Letters in de noemer: breid 1/<i>a</i> uit met <i>b</i> en 1/<i>b</i> met <i>a</i>. Uitbreiden met een letter schrijft op dat hij niet 0 is.');
level('algfrac.3', '3/x-2/x^2', 'combine',
  'The common bottom is <i>x</i>²: <i>x</i> goes into it already.',
  'De gemeenschappelijke noemer is <i>x</i>²: <i>x</i> past er al in.');
level('algfrac.4', '(x+2)/x-2/x', 'combine',
  'Same bottom. Mind the minus: it goes with the whole top of the second fraction.',
  'Dezelfde noemer. Let op de min: die hoort bij de hele teller van de tweede breuk.');
level('algfrac.5', 'a/(a+1)+1/(a+1)', 'combine',
  'The bottom is a bracket. Add the tops and look at what you get.',
  'De noemer is een haakje. Tel de tellers op en kijk wat je krijgt.');

/* ---- equations with fractions ---- */
level('fraceq.1', 'x/3+2=5', 'solve',
  'A fraction in an equation. Balance as usual; to get rid of the bar, drag the 3 below it across the =.',
  'Een breuk in een vergelijking. Balanceer zoals altijd; om de streep kwijt te raken sleep je de 3 eronder naar de overkant.');
level('fraceq.2', 'x/2+x/3=5', 'solve',
  'Two bottoms: multiply both sides by a number both go into (the panel’s · button).',
  'Twee noemers: vermenigvuldig beide kanten met een getal waar ze allebei in passen (de · in het paneel).');
level('fraceq.3', '4/x=2', 'solve',
  'The unknown below the bar. Times <i>x</i> is allowed here: <i>x</i> can’t be 0, or 4/<i>x</i> would mean nothing.',
  'De onbekende onder de streep. Keer <i>x</i> mag hier: <i>x</i> kan geen 0 zijn, anders betekent 4/<i>x</i> niets.');
level('fraceq.4', '(x+1)/2=(x-1)/3', 'solve',
  'A fraction on each side. One bottom at a time, or both at once.',
  'Aan elke kant een breuk. Eén noemer tegelijk, of allebei in één keer.');

/* ---- the skills ---- */
const S = (id, requires, glyph, en, nl, ben, bnl, n, gen) => defineSkill(id, {
  field: 'algebra', requires, glyph, title: { en, nl }, blurb: { en: ben, nl: bnl }, levels: Array.from({ length: n }, (_, i) => `${id}.${i + 1}`), gen });
S('numfrac', [], '½+⅓', 'Fractions', 'Breuken',
  'Halves and thirds don’t add up as they are: expand them to the same bottom first.',
  'Halven en derden tel je niet zomaar op: breid ze eerst uit tot dezelfde noemer.', 6, ['numfrac']);
S('sqrt', ['powers'], '√12', 'Square roots', 'Wortels',
  'Pairs come out of a root, roots of the same number add up, and no root stays below the bar.',
  'Paren komen uit een wortel, wortels van hetzelfde getal tel je op, en er blijft geen wortel onder de streep.', 6, ['sqrt']);
S('algfrac', ['factor', 'fracpow', 'numfrac'], 'a⁄b+c⁄d', 'Fractions with letters', 'Breuken met letters',
  '1/a + 1/b: the same expanding, now with letters at the bottom.',
  '1/a + 1/b: hetzelfde uitbreiden, nu met letters in de noemer.', 5, ['algfrac']);
S('fraceq', ['linear', 'algfrac'], 'x⁄3=4', 'Equations with fractions', 'Vergelijkingen met breuken',
  'Multiply both sides by the bottoms, and the fractions are gone.',
  'Vermenigvuldig beide kanten met de noemers, en de breuken zijn weg.', 4, ['fraceq']);

/* ---- practice ---- */
const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const proper = den => { let n; do n = r(1, den - 1); while (gcd(n, den) > 1); return n; };
const prob = (src, goal, extra) => Object.assign(parseProblem(src, goal).S, extra || {});

GEN.numfrac = d => {
  if (d === 1) { const b = pick([3, 4, 5, 7, 8]), m = pick([2, 3]); return prob(`${proper(b)}/${b}+${proper(b * m)}/${b * m}`, 'combine'); }
  if (d === 2) { const [b, c] = pick([[2, 3], [3, 4], [2, 5], [4, 6], [3, 5], [6, 8]]); return prob(`${proper(b)}/${b}${pick(['+', '-'])}${proper(c)}/${c}`, 'combine'); }
  const b = pick([3, 4, 5, 6]), c = pick([2, 3, 4, 5]);
  return pick([
    () => prob(`${r(1, 3)}-${proper(b)}/${b}`, 'combine'),
    () => prob(`${proper(b)}/${b}·${proper(c)}/${c}`, 'combine'),
    () => prob(`${proper(b)}/${b}:${proper(c)}/${c}`, 'combine'),
  ])();
};
GEN.sqrt = d => {
  const m = pick([2, 3, 5, 6, 7]), k = pick([2, 3]);
  if (d === 1) return prob(pick([`√${k * k * m}`, `${r(2, 4)}√${m}+${r(2, 5)}√${m}`]), 'simplify');
  if (d === 2) return prob(pick([`√${m}+√${k * k * m}`, `√${m}·√${m * k * k}`, `√2·√${pick([6, 10, 14])}`]), 'simplify');
  return prob(pick([`1/√${m}`, `${m * r(2, 3)}/√${m}`, `${r(1, 5)}/(2√${m})`]), 'simplify', { rootFree: true });
};
GEN.algfrac = d => {
  const [p, q] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 6]]);
  if (d === 1) return prob(pick([`x/${p}+x/${q}`, `${r(2, 3)}x/${p}-x/${q}`, `a/${p}+a/${q}`]), 'combine');
  if (d === 2) return prob(pick(['1/a+1/b', '1/a-1/b', `${r(2, 5)}/x+${r(1, 5)}/x^2`, `${r(2, 5)}/a-1/a^2`]), 'combine');
  return prob(pick([`(x+${p})/x-${p}/x`, `a/(a+${p})+${p}/(a+${p})`, `${p}/a+${q}/b`]), 'combine');
};
GEN.fraceq = d => {
  if (d === 1) { const a = pick([2, 3, 4, 5]), b = r(1, 6), x = a * r(1, 5); return prob(`x/${a}+${b}=${x / a + b}`, 'solve'); }
  if (d === 2) { const [a, b] = pick([[2, 3], [3, 4], [2, 4], [3, 6], [4, 6]]), x = a * b * r(1, 3); return prob(`x/${a}+x/${b}=${x / a + x / b}`, 'solve'); }
  const x = r(2, 5), b = r(1, 4);
  return pick([() => prob(`${x * b}/x=${b}`, 'solve'), () => prob(`(x+${b})/2=(x+${b + 2})/3`, 'solve')])();
};
