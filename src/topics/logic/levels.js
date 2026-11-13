/* Boolean logic: its own field and root. + is OR, · is AND. */
import { defineLevel, defineSkill } from '../../content/registry.js';
import { GEN, pick } from '../../practice.js';
import { parseProblem } from '../../parse.js';

const P = src => () => parseProblem(src, 'logic').S;
const L = (id, src, en, nl) => defineLevel({ id, s: P(src), goal: 'logic', en, nl });
L('logic.1', 'a·a', 'Logic: letters are true or false. · is AND, + is OR. Is “a AND a” anything other than a? Tap one a, then the other.',
  'Logica: letters zijn waar of onwaar. · is EN, + is OF. Is “a EN a” iets anders dan a? Tik de ene a en dan de andere.');
L('logic.2', 'a+¬a', 'The bar is NOT. “a OR not a”: one of the two is always true.', 'De streep is NIET. “a OF niet a”: een van de twee is altijd waar.');
L('logic.3', 'a·0+b', '0 is false, 1 is true. AND with false is false; OR with false changes nothing.', '0 is onwaar, 1 is waar. EN met onwaar is onwaar; OF met onwaar verandert niets.');
L('logic.4', 'a·¬a+b·1', 'Something and its opposite at once: never. And AND true changes nothing.', 'Iets en zijn tegendeel tegelijk: nooit. En EN waar verandert niets.');
L('logicsimp.1', 'a+a·b', 'a appears in both terms: put it outside brackets, as with numbers. Then look at what is inside.',
  'a staat in beide termen: breng hem buiten haakjes, zoals bij getallen. Kijk dan wat er tussen de haakjes staat.');
L('logicsimp.2', 'a·b+a·¬b', 'Again a shared piece. Inside the brackets something familiar appears.', 'Weer een gedeeld stuk. Tussen de haakjes verschijnt iets bekends.');
L('logicsimp.3', 'a·b+a·b·c', 'Absorption, one piece at a time.', 'Absorptie, één stuk tegelijk.');
L('logicsimp.4', 'a·b·c+a·b·¬c+a·¬b', 'Three terms. Pair two of them, then look again.', 'Drie termen. Neem er twee samen en kijk dan opnieuw.');
L('demorgan.1', '¬(a·b)', 'Explode the NOT: “not (a and b)” is “not a, or not b”. That is De Morgan.', 'Laat de NIET ontploffen: “niet (a en b)” is “niet a, of niet b”. Dat is De Morgan.');
L('demorgan.2', '¬(a+b)', 'And “not (a or b)” is “not a, and not b”.', 'En “niet (a of b)” is “niet a, en niet b”.');
L('demorgan.3', '¬(¬a+b)', 'Two NOTs on top of each other cancel out.', 'Twee keer NIET heft elkaar op.');
L('demorgan.4', '¬(a·b)+a', 'De Morgan first, then what you already know.', 'Eerst De Morgan, dan wat je al weet.');

const Sk = (id, requires, glyph, en, nl, ben, bnl, n, gen) => defineSkill(id, { field: 'logic', requires, glyph, title: { en, nl }, blurb: { en: ben, nl: bnl }, levels: Array.from({ length: n }, (_, i) => `${id}.${i + 1}`), gen });
Sk('logic', [], 'a·a', 'Logic', 'Logica', 'True and false with letters: AND is ·, OR is +, NOT is a bar. a · a = a, a + ¬a = 1.',
  'Waar en onwaar met letters: EN is ·, OF is +, NIET is een streep. a · a = a, a + ¬a = 1.', 4, ['logic']);
Sk('logicsimp', ['logic'], 'a+ab', 'Simplifying logic', 'Logica vereenvoudigen', 'Outside brackets, as with numbers: a + ab = a(1 + b) = a.',
  'Buiten haakjes, zoals bij getallen: a + ab = a(1 + b) = a.', 4, ['logicsimp']);
Sk('demorgan', ['logicsimp'], '¬(ab)', 'De Morgan', 'De Morgan', 'A NOT over a product becomes a sum of NOTs, and the other way round.',
  'Een NIET over een product wordt een som van NIETs, en andersom.', 4, ['demorgan']);

const lt = () => pick(['a', 'b', 'd']);   // c is the third letter of one template
const two = () => { const a = lt(); let b; do b = lt(); while (b === a); return [a, b]; };
const prob = src => parseProblem(src, 'logic').S;
GEN.logic = () => { const [a, b] = two(); return prob(pick([`${a}·${a}`, `${a}+¬${a}`, `${a}·0+${b}`, `${a}·1+${a}`, `${a}·¬${a}+${b}`, `${a}+${b}+${a}`, `1+${a}·${b}`])); };
GEN.logicsimp = () => { const [a, b] = two(); return prob(pick([`${a}+${a}·${b}`, `${a}·${b}+${a}·¬${b}`, `${a}·${b}+${a}`, `¬${a}·${b}+¬${a}`, `${a}·${b}·c+${a}·${b}·¬c+${a}·¬${b}`, `${a}·(${b}+¬${b})`])); };
GEN.demorgan = () => { const [a, b] = two(); return prob(pick([`¬(${a}·${b})`, `¬(${a}+${b})`, `¬(¬${a}+${b})`, `¬(${a}·${b})+${a}`, `¬(${a}+¬${b})·${a}`, `¬¬${a}+${b}`])); };
