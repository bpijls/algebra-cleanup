// Textbook exercises, chapter by chapter (Dutch klas 2–3 algebra), typed the way a student would type them:
// [typed, the answer the hints leave, goal]. Shared by corpus.test.js and golden.test.js.
const CHAPTERS = {
  'breuken optellen (adding fractions)': [
    ['1/2+1/3', '[5/6', 'combine'], ['2/3+3/4', '[17/12', 'combine'], ['2-3/4', '[5/4', 'combine'], ['5/6-1/4', '[7/12', 'combine'],
    ['2/3·3/4', '[1/2', 'combine'], ['x/3+x/4', '[7x/12', 'combine'], ['1/a+1/b', '[b + a/ab', 'combine'], ['3/x-2/x^2', '[3x − 2/x^2', 'combine'],
  ],
  'wortels (square roots)': [
    ['√12', '2√3'], ['√8+√18', '5√2'], ['√2·√6', '2√3'], ['3√2·4√2', '24'], ['√50-√2', '4√2'],
  ],
  'vergelijkingen met breuken (equations with fractions)': [
    ['x/3+2=5', 'x = 9'], ['x/2+x/3=5', 'x = 6'], ['4/x=2', 'x = 2'], ['(x+1)/2=(x-1)/3', 'x = −5'], ['x/4=x/6+1', 'x = 12'],
  ],
  'negatieve en gebroken exponenten (negative and fractional exponents)': [
    ['a^-2·a^5', 'a^3'], ['2^-3', '[1/8'], ['3a^-2·2a^4', '6a^2'], ['(2a)^-2', '[1/4a^2'], ['a^-1·a^-2', '[1/a^3'], ['a⁻³·a⁵', 'a^2'],
    ['a^(1/2)·a^(1/2)', 'a'], ['16^(1/2)', '4'], ['a^(3/2)', 'a√a'], ['x^(5/2)/x^(1/2)', 'x^2'],
  ],
  'ongelijkheden (inequalities)': [
    ['x+3<7', 'x &lt; 4'], ['3x>=12', 'x ≥ 4'], ['-2x<6', 'x &gt; −3'], ['4-x>1', 'x &lt; 3'], ['5x+3>2x+12', 'x &gt; 3'],
    ['x/3<=4', 'x ≤ 12'], ['2x+5≥4x-3', 'x ≤ 4'], ['3(x-2)<x+4', 'x &lt; 5'], ['-x/2>3', 'x &lt; −6'],
  ],
  'complexe getallen (complex numbers)': [
    ['i^2', '−1'], ['i^3', '−i'], ['i^4', '1'], ['3i·2i', '−6'], ['4i·(-i)', '4'], ['(3+2i)-(1-i)', '2 + 3i'],
    ['(2+i)(3-i)', '7 + i'], ['(1+i)^2', '2i'], ['(2+3i)(2-3i)', '13'],
  ],
  // logic: + is OR, · is AND, ¬ is NOT (typed ¬ or !)
  'logica (Boolean algebra)': [
    ['a·a·b', 'ab', 'logic'], ['a+a+b', 'a + b', 'logic'], ['a·¬a', '0', 'logic'], ['¬¬a', 'a', 'logic'], ['a+a·b', 'a', 'logic'],
    ['a·(a+b)', 'a', 'logic'], ['a·b+a·¬b', 'a', 'logic'], ['¬(a·b)', '¬a + ¬b', 'logic'], ['¬(a+b)', '¬a¬b', 'logic'],
    ['¬(¬a·¬b)', 'a + b', 'logic'], ['(a+b)·(a+¬b)', 'a', 'logic'], ['!(a+!b)', '¬ab', 'logic'],
  ],
  'machten (powers)': [
    ['3a^2·2a^5', '6a^7'], ['a^3·a^4·a', 'a^8'], ['(a^2)^3', 'a^6'], ['(2a)^3', '8a^3'], ['(3a^2b)^2', '9a^4b^2'],
    ['-2a·5a^3', '−10a^4'], ['2a^3·(a^2)^4', '2a^11'], ['3a^4b·2ab^3', '6a^5b^4'],
  ],
  'gelijksoortige termen (like terms)': [
    ['3a + 5a - 2a', '6a'], ['4x^2 + 3x - x^2 + 2x', '3x^2 + 5x'], ['2ab + 3ba', '5ab'], ['a + 2b + 3a - b', '4a + b'],
  ],
  'breuken (fractions)': [
    ['12a^5/4a^2', '3a^3'], ['6a^2b/9ab^3', '[2a/3b^2'], ['12a⁵ : 4a²', '3a^3'], ['(8x/3y):(3x/y)', '[8/9'],
    ['x(x+2)/3(x+2)', '[x/3'], ['(x+2)/((x+2)(x+3))', '[1/x + 3'],
  ],
  'haakjes wegwerken (opening brackets)': [
    ['3(x+4)', '3x + 12'], ['-(x-3) + 2x', 'x + 3'], ['-2(x+4) - 3(x-1)', '−5x − 5'], ['a(a+3) - 2(a-1)', 'a^2 + a + 2'],
    ['2x(3x-5)', '6x^2 − 10x'],
  ],
  'dubbele haakjes (double brackets)': [
    ['(x+3)(x-2)', 'x^2 + x − 6'], ['(a+5)(a+1)', 'a^2 + 6a + 5'], ['(2x+1)(x-4)', '2x^2 − 7x − 4'], ['(a+b)(a+2b)', 'a^2 + 3ab + 2b^2'],
  ],
  'merkwaardige producten (special products)': [
    ['(a+b)^2', 'a^2 + 2ab + b^2'], ['(x-5)^2', 'x^2 − 10x + 25'], ['(a-b)(a+b)', 'a^2 − b^2'], ['(2x-y)^2', '4x^2 − 4xy + y^2'],
    ['3(x+1)^2', '3x^2 + 6x + 3'], ['(x+1)^2-(x-1)^2', '4x'], ['2(a+3)^2-(a-1)(a+1)', 'a^2 + 12a + 19'],
  ],
  'buiten haakjes brengen (common factor)': [
    ['6a+9b', '3(2a + 3b)', 'factor'], ['4a^2b+6ab^2', '2ab(2a + 3b)', 'factor'], ['3x^2+x', 'x(3x + 1)', 'factor'],
    ['-3x+6', '−3(x − 2)', 'factor'], ['a(x+2)+3(x+2)', '(x + 2)(a + 3)', 'factor'], ['6a+9b+12', '3(2a + 3b + 4)', 'factor'],
  ],
  'ontbinden: som-product (trinomials)': [
    ['x^2+5x+6', '(x + 2)(x + 3)', 'factor'], ['x^2-x-6', '(x − 3)(x + 2)', 'factor'], ['x^2-5x+6', '(x − 3)(x − 2)', 'factor'],
    ['x^2+4x+4', '(x + 2)^2', 'factor'], ['x^2+2x-15', '(x − 3)(x + 5)', 'factor'], ['2x^2+10x+12', '2(x + 2)(x + 3)', 'factor'],
    ['2x^2+7x+3', '(2x + 1)(x + 3)', 'factor'],
  ],
  'vergelijkingen: balansmethode (equations)': [
    ['x+3=7', 'x = 4'], ['3x=12', 'x = 4'], ['3x+5=20', 'x = 5'], ['5x+3=2x+12', 'x = 3'], ['-2x+7=1', 'x = 3'],
    ['2(x+3)=4x-2', 'x = 4'], ['x/3=4', 'x = 12'], ['(x+1)/2=3', 'x = 5'], ['4x-3=2x+6', 'x = [9/2'], ['7=2x+1', 'x = 3'],
    ['3(x-1)-2(x+4)=0', 'x = 11'], ['2a-5=3a+1', 'a = −6'], ['6=-3x', 'x = −2'],
  ],
  // the answers as the hints leave them: x = −2 ∨ x = −3 reads "x = −2 of x = −3"
  'kwadratische vergelijkingen (quadratic equations)': [
    ['x^2=49', 'x = 7 ∨ x = −7'], ['x^2=12', 'x = 2√3 ∨ x = −2√3'], ['3x^2=75', 'x = 5 ∨ x = −5'], ['x^2-9=0', 'x = 3 ∨ x = −3'],
    ['(x-2)^2=16', 'x = 6 ∨ x = −2'], ['(x+1)^2=3', 'x = √3 − 1 ∨ x = −√3 − 1'], ['(x-3)(x+4)=0', 'x = 3 ∨ x = −4'],
    ['x(x-5)=0', 'x = 0 ∨ x = 5'], ['x^2+3x=0', 'x = 0 ∨ x = −3'], ['x^2+7x+12=0', 'x = −3 ∨ x = −4'],
    ['x^2-2x-15=0', 'x = 5 ∨ x = −3'], ['x^2+x=6', 'x = 2 ∨ x = −3'], ['x^2+4x-1=0', 'x = √5 − 2 ∨ x = −√5 − 2'],
    ['x^2-6x+2=0', 'x = √7 + 3 ∨ x = −√7 + 3'], ['x^2+3x+1=0', 'x = [√5 − 3/2 ∨ x = [−√5 − 3/2'],
    ['2x^2+3x-1=0', 'x = [√17 − 3/4 ∨ x = [−√17 − 3/4'], ['x^2+6x+9=0', 'x = −3'],
  ],
};
module.exports = { CHAPTERS };
