/* The algebra skills: the trunk of the skill tree. Each needs the skills in `requires` first (a soft lock: the
   map says so, but a player can open it anyway). Topics in src/topics/ hang their own skills onto these. */
import './levels.js';
import { defineSkill } from './registry.js';

const S = (id, requires, glyph, en, nl, ben, bnl, levels, gen) =>
  defineSkill(id, { field: 'algebra', requires, glyph, title: { en, nl }, blurb: { en: ben, nl: bnl }, levels, gen });
const n = (id, k) => Array.from({ length: k }, (_, i) => `${id}.${i + 1}`);

S('powers', [], 'a²', 'Powers', 'Machten',
  'A power is a product written short. Explode it and see why the rules work.',
  'Een macht is een kort geschreven product. Laat hem ontploffen en zie waarom de regels kloppen.', n('powers', 6), ['powers']);
S('like', ['powers'], 'a+a', 'Like terms', 'Gelijksoortige termen',
  'a + a = 2a, but a · a = a². Which terms can you add?',
  'a + a = 2a, maar a · a = a². Welke termen mag je optellen?', n('like', 2), ['like']);
S('fracpow', ['powers'], 'a⁵⁄a²', 'Fractions of powers', 'Breuken met machten',
  'Only exactly equal pieces cancel. Explode until they are.',
  'Alleen precies gelijke stukken streep je weg. Laat ze ontploffen tot ze dat zijn.', n('fracpow', 4), ['frac']);
S('book', ['like', 'fracpow'], '★', 'Textbook mix', 'Uit het boek',
  'Exercises as your textbook writes them, with everything so far.',
  'Opgaven zoals je boek ze schrijft, met alles tot nu toe.', n('book', 3), ['mixed']);
S('brackets', ['like'], 'a(b+c)', 'Opening brackets', 'Haakjes wegwerken',
  'The number in front goes to every term inside. A minus in front too.',
  'Het getal ervoor gaat naar elke term binnen. Een min ervoor ook.', n('brackets', 2), ['open']);
S('double', ['brackets'], '(a+b)²', 'Double brackets', 'Dubbele haakjes',
  'Every term times every term, and (a + b)² is no exception.',
  'Elke term keer elke term, en (a + b)² is geen uitzondering.', n('double', 2), ['double', 'square']);
S('factor', ['brackets'], 'a(…)', 'Outside brackets', 'Buiten haakjes brengen',
  'Find the piece every term shares and put it outside the brackets.',
  'Zoek het stuk dat elke term deelt en breng het buiten haakjes.', n('factor', 5), ['factor']);
S('sumproduct', ['double', 'factor'], 'x²+5x+6', 'Sum-product', 'Som-product',
  'Split the middle term, factor in pairs, and a shared bracket appears.',
  'Splits de middelste term, haal in paren buiten haakjes, en er verschijnt een gedeeld haakje.', n('sumproduct', 2), ['trinomial']);
S('linear', ['brackets'], 'x=?', 'Equations', 'Vergelijkingen',
  'The balance method: whatever you do to one side, you do to the other.',
  'De balansmethode: wat je aan de ene kant doet, doe je ook aan de andere.', n('linear', 7), ['equations']);
S('quadratic', ['sumproduct', 'linear'], 'x²=9', 'Quadratic equations', 'Kwadratische vergelijkingen',
  'Roots, product = 0 and completing the square, up to the abc-formula you find yourself.',
  'Wortels, product = 0 en kwadraatafsplitsen, tot aan de abc-formule die je zelf vindt.', n('quadratic', 8), ['quadratic']);
S('formulas', ['linear'], 'ax=b', 'Letters for numbers', 'Letters als getallen',
  'Solve once for every value: where two lines cross, for any a, b, c, d.',
  'Los één keer op voor alle waarden: waar twee lijnen snijden, voor elke a, b, c, d.', n('formulas', 3), ['generic']);
S('genquad', ['quadratic', 'formulas'], 'abc', 'The abc-formula', 'De abc-formule',
  'ax² + bx + c = 0 for every a, b and c at once.',
  'ax² + bx + c = 0 voor alle a, b en c tegelijk.', n('genquad', 4), ['generic']);
