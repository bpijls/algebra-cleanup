/* The goniometry levels and skills: exact values on the unit circle, then identities shown by rewriting each
   side (goal prove), then the sum and double-angle formulas. */
import { defineLevel, defineSkill } from '../../content/registry.js';
import { Pr } from '../../core/kinds/bracket.js';
import { V } from '../../core/kinds/letter.js';
import { N } from '../../core/kinds/number.js';
import { F, T } from '../../core/kinds/sums.js';
import { Tr } from './kind.js';

const lvDeg = (fn, d) => Tr(fn, [T([N(d)])]);
const trA = (fn, e = 1, b = 'a') => Tr(fn, [T([V(b)])], e);
const trOne = (...ts) => ({ parts: [F(ts)] });
const trProve = (L, R) => ({ parts: [F(L), F(R)], op: '=', goal: 'prove' });

[
  { id: 'trigvals.1', s: () => trOne(T([lvDeg('sin', 30)])),
    en: 'Walk 30° around the unit circle: the point is at height ½. That height is <b>sin 30°</b>. Tap sin twice to see its value.',
    nl: 'Loop 30° over de eenheidscirkel: het punt ligt op hoogte ½. Die hoogte is <b>sin 30°</b>. Tik twee keer op sin om de waarde te zien.' },
  { id: 'trigvals.2', s: () => trOne(T([N(6), lvDeg('sin', 30)])),
    en: 'A number times sin 30°. The ½ goes below the bar; then clean up.',
    nl: 'Een getal keer sin 30°. De ½ komt onder de streep; ruim daarna op.' },
  { id: 'trigvals.3', s: () => trOne(T([lvDeg('sin', 90)]), T([lvDeg('cos', 0)])),
    en: 'cos is the other coordinate: how far to the right the point is. At 90° the point is at the top, at 0° on the right.',
    nl: 'cos is de andere coördinaat: hoe ver het punt naar rechts ligt. Bij 90° staat het punt bovenaan, bij 0° rechts.' },
  { id: 'trigvals.4', s: () => trOne(T([N(4), lvDeg('sin', 30), lvDeg('cos', 60)])),
    en: 'Two halves. Each one puts a 2 below the bar.',
    nl: 'Twee halven. Elk zet een 2 onder de streep.' },
  { id: 'trigvals.5', s: () => trOne(T([lvDeg('sin', 60), lvDeg('cos', 30)])),
    en: 'sin 60° = ½√3. Two roots of 3 multiply into one root: √3 · √3 = √(3·3).',
    nl: 'sin 60° = ½√3. Twee wortels van 3 worden samen één wortel: √3 · √3 = √(3·3).' },
  { id: 'trigvals.6', s: () => trOne(T([lvDeg('tan', 45)])),
    en: '<b>tan</b> is sin divided by cos. Explode tan, then the values, then cancel what is equal.',
    nl: '<b>tan</b> is sin gedeeld door cos. Laat tan ontploffen, dan de waarden, en streep weg wat gelijk is.' },
  { id: 'trigvals.7', s: () => trOne(T([lvDeg('tan', 60)])),
    en: 'Same plan for tan 60°.',
    nl: 'Hetzelfde plan voor tan 60°.' },

  { id: 'trigid.1', s: () => trProve([T([N(3), trA('sin', 2)]), T([N(3), trA('cos', 2)])], [T([N(3)])]),
    en: 'New goal: <b>show</b> that both sides are the same for every <i>a</i>. Rewrite a side until it reads like the other. The one fact you get: sin²<i>a</i> + cos²<i>a</i> = 1 (Pythagoras on the unit circle). Tap a sin² and a cos² with the same rest.',
    nl: 'Nieuw doel: <b>laat zien</b> dat beide kanten voor elke <i>a</i> gelijk zijn. Herschrijf een kant tot hij er net zo uitziet als de andere. Het ene feit dat je krijgt: sin²<i>a</i> + cos²<i>a</i> = 1 (Pythagoras op de eenheidscirkel). Tik een sin² en een cos² aan met dezelfde rest.' },
  { id: 'trigid.2', s: () => trProve([T([Tr('tan', [T([V('a')])]), trA('cos')])], [T([trA('sin')])]),
    en: 'tan <i>a</i> is sin <i>a</i> / cos <i>a</i>. Explode it and see what cancels. You never do anything to both sides here: that would take for granted what you want to show.',
    nl: 'tan <i>a</i> is sin <i>a</i> / cos <i>a</i>. Laat hem ontploffen en kijk wat wegvalt. Je doet hier nooit iets met beide kanten: dan neem je al aan wat je wilt laten zien.' },
  { id: 'trigid.3', s: () => trProve([T([N(1)]), T([trA('sin', 2)], true)], [T([trA('cos', 2)])]),
    en: 'Read sin²<i>a</i> + cos²<i>a</i> = 1 the other way: cos²<i>a</i> = 1 − sin²<i>a</i>. Select cos²<i>a</i> and use the button.',
    nl: 'Lees sin²<i>a</i> + cos²<i>a</i> = 1 andersom: cos²<i>a</i> = 1 − sin²<i>a</i>. Selecteer cos²<i>a</i> en gebruik de knop.' },
  { id: 'trigid.4', s: () => trProve([T([Pr([T([trA('sin')]), T([trA('cos')])], 2)])], [T([N(1)]), T([N(2), trA('sin'), trA('cos')])]),
    en: 'A square of a sum, like (<i>p</i> + <i>q</i>)². Open it, then look for sin² and cos².',
    nl: 'Een kwadraat van een som, zoals (<i>p</i> + <i>q</i>)². Werk het uit en zoek dan sin² en cos².' },
  { id: 'trigid.5', s: () => trProve([T([trA('cos', 2)]), T([trA('sin', 2)], true)], [T([N(2), trA('cos', 2)]), T([N(1)], true)]),
    en: 'The right side has no sin² at all. Write the sin² on the left in cos² instead.',
    nl: 'De rechterkant heeft helemaal geen sin². Schrijf de sin² links in cos².' },
  { id: 'trigid.6', s: () => trProve([T([Pr([T([N(1)]), T([trA('sin')], true)]), Pr([T([N(1)]), T([trA('sin')])])])], [T([trA('cos', 2)])]),
    en: 'Two brackets: every term times every term.',
    nl: 'Twee haakjes: elke term keer elke term.' },

  { id: 'trigsum.1', s: () => trProve([T([Tr('sin', [T([V('a')]), T([N(90)])])])], [T([trA('cos')])]),
    en: 'sin of a <b>sum</b> explodes by the sum formula: sin(<i>a</i> + <i>b</i>) = sin <i>a</i> cos <i>b</i> + cos <i>a</i> sin <i>b</i> (it comes from turning the unit circle). Then the values you know.',
    nl: 'sin van een <b>som</b> ontploft met de somformule: sin(<i>a</i> + <i>b</i>) = sin <i>a</i> cos <i>b</i> + cos <i>a</i> sin <i>b</i> (die komt van het draaien van de eenheidscirkel). Dan de waarden die je kent.' },
  { id: 'trigsum.2', s: () => trProve([T([Tr('cos', [T([N(180)]), T([V('a')], true)])])], [T([trA('cos')], true)]),
    en: 'cos(<i>a</i> + <i>b</i>) = cos <i>a</i> cos <i>b</i> − sin <i>a</i> sin <i>b</i>. And an angle with a minus is the point mirrored in the x-axis: sin(−<i>a</i>) = −sin <i>a</i>, cos(−<i>a</i>) = cos <i>a</i>.',
    nl: 'cos(<i>a</i> + <i>b</i>) = cos <i>a</i> cos <i>b</i> − sin <i>a</i> sin <i>b</i>. En een hoek met een min is het punt gespiegeld in de x-as: sin(−<i>a</i>) = −sin <i>a</i>, cos(−<i>a</i>) = cos <i>a</i>.' },
  { id: 'trigsum.3', s: () => trProve([T([Tr('cos', [T([V('a')]), T([V('b')], true)])]), T([Tr('cos', [T([V('a')]), T([V('b')])])])], [T([N(2), trA('cos'), trA('cos', 1, 'b')])]),
    en: 'Two sum formulas. What is left after the like terms?',
    nl: 'Twee somformules. Wat blijft er over na de gelijksoortige termen?' },
  { id: 'trigsum.4', s: () => trProve([T([Tr('sin', [T([N(2), V('a')])])])], [T([N(2), trA('sin'), trA('cos')])]),
    en: 'sin 2<i>a</i> is <b>not</b> 2 sin <i>a</i>. But 2<i>a</i> = <i>a</i> + <i>a</i>: select the <i>a</i> inside, split it, and use the sum formula.',
    nl: 'sin 2<i>a</i> is <b>niet</b> 2 sin <i>a</i>. Maar 2<i>a</i> = <i>a</i> + <i>a</i>: selecteer de <i>a</i> erin, splits hem, en gebruik de somformule.' },
  { id: 'trigsum.5', s: () => trProve([T([Tr('cos', [T([N(2), V('a')])])])], [T([trA('cos', 2)]), T([trA('sin', 2)], true)]),
    en: 'The double-angle formula for cos.',
    nl: 'De verdubbelingsformule voor cos.' },
  { id: 'trigsum.6', s: () => trProve([T([Tr('cos', [T([N(2), V('a')])])])], [T([N(1)]), T([N(2), trA('sin', 2)], true)]),
    en: 'The same cos 2<i>a</i>, another form. Only sin² on the right.',
    nl: 'Dezelfde cos 2<i>a</i>, een andere vorm. Rechts alleen sin².' },
].map(L => /^trig(id|sum)/.test(L.id) ? { goal: 'prove', ...L } : L).forEach(defineLevel);

const trigIds = (id, k) => Array.from({ length: k }, (_, i) => `${id}.${i + 1}`);
defineSkill('trigvals', { field: 'goniometry', requires: ['fracpow', 'like'], glyph: 'sin',
  title: { en: 'The unit circle', nl: 'De eenheidscirkel' },
  blurb: { en: 'sin and cos are the coordinates of a point on the unit circle. Their exact values, and tan = sin / cos.',
           nl: 'sin en cos zijn de coördinaten van een punt op de eenheidscirkel. Hun exacte waarden, en tan = sin / cos.' },
  levels: trigIds('trigvals', 7), gen: ['trigvals'] });
defineSkill('trigid', { field: 'goniometry', requires: ['trigvals', 'double'], glyph: 'sin²+cos²',
  title: { en: 'Identities', nl: 'Identiteiten' },
  blurb: { en: 'Show that two forms are always equal, with one fact: sin²a + cos²a = 1.',
           nl: 'Laat zien dat twee vormen altijd gelijk zijn, met één feit: sin²a + cos²a = 1.' },
  levels: trigIds('trigid', 6), gen: ['trigid'] });
defineSkill('trigsum', { field: 'goniometry', requires: ['trigid'], glyph: 'sin(a+b)',
  title: { en: 'Sum formulas', nl: 'Somformules' },
  blurb: { en: 'sin and cos of a sum, a mirrored angle, and the double-angle formulas you derive yourself.',
           nl: 'sin en cos van een som, een gespiegelde hoek, en de verdubbelingsformules die je zelf afleidt.' },
  levels: trigIds('trigsum', 6), gen: ['trigid'] });
