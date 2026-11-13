/* Negative and fractional exponents, as skills: a⁻² is 1/a² (the same power on the other side of the bar), and
   a^½ is √a (two halves make a whole). Levels with asPower ask for the other direction: everything written as
   one power, no bar and no root. The moves are in core/exponents.js. */
import { defineLevel, defineSkill } from './registry.js';
import { GEN, pick } from '../practice.js';
import { parseProblem } from '../parse.js';

// exps: the moves for these exponents are on (typed problems with a⁻² or a^½ turn them on by themselves)
const prob = (src, extra) => Object.assign(parseProblem(src, 'simplify').S, { exps: true }, extra || {});
const level = (id, src, en, nl, extra) => defineLevel({ id, s: () => prob(src, extra), en, nl });
const AS = { asPower: true };

/* ---- negative exponents ---- */
level('negexp.1', 'a^-2·a^5',
  'A negative power. <i>a</i>⁻² is the same as 1/<i>a</i>²: the power goes to the other side of the bar. Tap it twice to see it, bring <i>a</i>⁵ onto the top of that fraction, then cancel as usual.',
  'Een negatieve macht. <i>a</i>⁻² is hetzelfde als 1/<i>a</i>²: de macht gaat naar de andere kant van de streep. Tik er twee keer op om het te zien, haal <i>a</i>⁵ in de teller van die breuk en streep dan weg zoals altijd.');
level('negexp.2', '2^-3',
  'A number to a negative power: under the bar it becomes an ordinary power.',
  'Een getal tot een negatieve macht: onder de streep wordt het een gewone macht.');
level('negexp.3', '(2a)^-2',
  'The whole bracket goes below the bar, power and all.',
  'Het hele haakje gaat onder de streep, met macht en al.');
level('negexp.4', '3a^-2·2a^4',
  'Numbers and powers together. <i>a</i>⁴ and <i>a</i>⁻² don’t merge as they are: one is above the bar and one below.',
  'Getallen en machten door elkaar. <i>a</i>⁴ en <i>a</i>⁻² gaan niet zomaar samen: de een hoort boven de streep en de ander eronder.');
level('negexp.5', 'a^3/a^5',
  'Now the other way round: write the answer as <b>one power</b>, without a bar. Select a letter below the bar: a button moves it up, with a minus.',
  'Nu andersom: schrijf het antwoord als <b>één macht</b>, zonder streep. Kies een letter onder de streep: een knop zet hem omhoog, met een min.', AS);
level('negexp.6', '6a^-3/(2a^2)',
  'One power again. Bring the bottom up, then the powers merge.',
  'Weer één macht. Haal de noemer omhoog, dan gaan de machten samen.', AS);

/* ---- fractional exponents ---- */
level('fracexp.1', 'a^(1/2)·a^(1/2)',
  'A half as a power. Merge the two: ½ + ½ = 1. So <i>a</i><sup>½</sup> times itself is <i>a</i>: that is what √<i>a</i> means.',
  'Een half als macht. Voeg de twee samen: ½ + ½ = 1. Dus <i>a</i><sup>½</sup> keer zichzelf is <i>a</i>: dat is precies wat √<i>a</i> betekent.');
level('fracexp.2', '9^(1/2)',
  'A number to the power ½ is a root. Explode it and take the pair out.',
  'Een getal tot de macht ½ is een wortel. Laat hem ontploffen en haal het paar eruit.');
level('fracexp.3', 'a^(3/2)',
  'Three halves: one whole and a half left over.',
  'Drie halven: één geheel en een half dat overblijft.');
level('fracexp.4', 'a^(5/2)/a^(1/2)',
  'Only equal pieces cancel, halves too.',
  'Alleen gelijke stukken strepen weg, halven ook.');
level('fracexp.5', '√(a^3)',
  'Write it as <b>one power</b>. Take the pair out of the root first, then turn the root into a power ½.',
  'Schrijf het als <b>één macht</b>. Haal eerst het paar uit de wortel en maak van de wortel dan een macht ½.', AS);
level('fracexp.6', 'a^2·√a',
  'One power again: the root becomes a power, and powers of <i>a</i> merge.',
  'Weer één macht: de wortel wordt een macht, en machten van <i>a</i> gaan samen.', AS);

/* ---- the skills ---- */
const S = (id, requires, glyph, en, nl, ben, bnl, n, gen) => defineSkill(id, {
  field: 'algebra', requires, glyph, title: { en, nl }, blurb: { en: ben, nl: bnl }, levels: Array.from({ length: n }, (_, i) => `${id}.${i + 1}`), gen });
S('negexp', ['fracpow'], 'a⁻²', 'Negative exponents', 'Negatieve exponenten',
  'a⁻² = 1/a²: a negative power is the same power on the other side of the bar.',
  'a⁻² = 1/a²: een negatieve macht is dezelfde macht aan de andere kant van de streep.', 6, ['negexp']);
S('fracexp', ['negexp'], 'a½', 'Fractional exponents', 'Gebroken exponenten',
  'Two halves make a whole, so a to the power ½ is √a.',
  'Twee halven maken een geheel, dus a tot de macht ½ is √a.', 6, ['fracexp']);

/* ---- practice ---- */
const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
GEN.negexp = d => {
  const x = pick(['a', 'x']), m = r(1, 3), n = m + r(1, 3);
  if (d === 1) return pick([() => prob(`${x}^-${m}·${x}^${n}`), () => prob(`${pick([2, 3])}^-${r(1, 3)}`)])();
  if (d === 2) return pick([
    () => prob(`(${pick([2, 3])}${x})^-2`),
    () => prob(`${r(2, 4)}${x}^-${m}·${r(2, 3)}${x}^${n}`),
    () => prob(`${x}^-${m}·${x}^-${r(1, 3)}`),
  ])();
  const l = pick([2, 3]);
  return pick([() => prob(`${x}^${m}/${x}^${n}`, AS), () => prob(`${l * r(2, 3)}${x}^-${m}/(${l}${x}^${r(1, 3)})`, AS)])();
};
GEN.fracexp = d => {
  const x = pick(['a', 'x']), k = pick([3, 5, 7]);
  if (d === 1) return pick([() => prob(`${x}^(1/2)·${x}^(1/2)`), () => prob(`${pick([4, 9, 16, 25, 36])}^(1/2)`)])();
  if (d === 2) return pick([() => prob(`${x}^(${k}/2)`), () => prob(`${x}^(${k}/2)/${x}^(1/2)`), () => prob(`${x}^(1/2)·${x}^(${k}/2)`)])();
  return pick([() => prob(`√(${x}^${k})`, AS), () => prob(`${x}^${r(1, 3)}·√${x}`, AS)])();
};
