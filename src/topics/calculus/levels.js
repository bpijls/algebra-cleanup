/* Derivatives: the rules come out of exploding, and the power rule is earned. */
import { defineLevel, defineSkill, defineShortcut } from '../../content/registry.js';
import { GEN, pick } from '../../practice.js';
import { parseProblem } from '../../parse.js';
import { EARNED_D } from './rules.js';

defineShortcut('dPower', { skill: 'deriv' });
const P = (src, extra) => () => Object.assign(parseProblem(src).S, extra || {});
const L = (id, src, en, nl, extra) => defineLevel({ id, s: P(src, extra), en, nl });
L('deriv.1', '(3x+5)′', 'The derivative (…)′ is the slope. Explode it: a sum gives one per term, a number in front stays, (x)′ = 1 and a number alone has slope 0.',
  'De afgeleide (…)′ is de helling. Laat hem ontploffen: een som geeft er één per term, een getal ervoor blijft staan, (x)′ = 1 en een los getal heeft helling 0.');
L('deriv.2', '(x^2)′', 'x² is x · x. Explode it, then the derivative of a product: (f · g)′ = f′ · g + f · g′.',
  'x² is x · x. Laat hem ontploffen, en dan de afgeleide van een product: (f · g)′ = f′ · g + f · g′.');
L('deriv.3', '(x^3)′', 'x · x · x: the first x against the rest, and again. Count what comes out.', 'x · x · x: de eerste x tegen de rest, en nog eens. Tel wat eruit komt.');
L('deriv.4', '(x^2+3x)′', 'Everything together.', 'Alles bij elkaar.');
L('derivrules.1', '(x^5)′', 'Finishing Derivatives earned you a shortcut: (xⁿ)′ = n · xⁿ⁻¹ in one tap. You saw why: n x’s, each one in turn.',
  'Door Afgeleiden af te maken verdiende je een kortere weg: (xⁿ)′ = n · xⁿ⁻¹ in één tik. Je zag waarom: n keer een x, elk om de beurt.', { earned: EARNED_D });
L('derivrules.2', '(4x^3-2x)′', 'A polynomial, term by term.', 'Een veelterm, term voor term.', { earned: EARNED_D });
L('derivrules.3', '((x+1)(x+2))′', 'A product of brackets: the product rule again.', 'Een product van haakjes: weer de productregel.', { earned: EARNED_D });

const Sk = (id, requires, glyph, en, nl, ben, bnl, n, gen) => defineSkill(id, { field: 'calculus', requires, glyph, title: { en, nl }, blurb: { en: ben, nl: bnl }, levels: Array.from({ length: n }, (_, i) => `${id}.${i + 1}`), gen });
Sk('deriv', ['brackets'], "f′", 'Derivatives', 'Afgeleiden', 'The slope as a tile: the sum rule, numbers in front, and the product rule. x² is x · x.',
  'De helling als tegel: de somregel, getallen ervoor, en de productregel. x² is x · x.', 4, ['deriv']);
Sk('derivrules', ['deriv'], "xⁿ′", 'The power rule', 'De machtsregel', '(xⁿ)′ = n · xⁿ⁻¹, earned, for whole polynomials and products.',
  '(xⁿ)′ = n · xⁿ⁻¹, verdiend, voor hele veeltermen en producten.', 3, ['derivrules']);

const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const sg = n => (n < 0 ? '-' : '+') + Math.abs(n);
GEN.deriv = d => {
  if (d === 1) return P(`(${r(2, 9)}x${sg(r(-9, 9) || 1)})′`)();
  if (d === 2) return P(pick(['(x^2)′', `(${r(2, 5)}x^2)′`, `(x^2${sg(r(-6, 6) || 1)}x)′`]))();
  return P(pick(['(x^3)′', `(x^3${sg(r(-5, 5) || 1)}x)′`, `(${r(2, 4)}x^2${sg(r(-9, 9) || 1)})′`]))();
};
GEN.derivrules = d => {
  const e = { earned: EARNED_D };
  if (d === 1) return P(`(x^${r(3, 8)})′`, e)();
  if (d === 2) return P(`(${r(2, 6)}x^${r(2, 5)}${sg(r(-9, 9) || 1)}x)′`, e)();
  return P(pick([`((x${sg(r(-5, 5) || 1)})(x${sg(r(-5, 5) || 1)}))′`, `(x^4${sg(r(-5, 5) || 1)}x^2${sg(r(-9, 9) || 1)})′`]), e)();
};
