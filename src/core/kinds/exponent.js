/* Exponents are whole numbers or halves (a⁻², a^½, a^(3/2)): halves add up exactly in floating point, so an
   exponent stays a plain number. These helpers write one down. */
export const isWhole = e => Number.isInteger(e);
// as text: 2, −2, ½, 3/2, −½ (a whole positive exponent reads exactly as it always did)
export function expText(e) {
  if (isWhole(e)) return e < 0 ? '−' + -e : String(e);
  const s = e < 0 ? '−' : '', n = Math.round(Math.abs(e) * 2);
  return s + (n === 1 ? '½' : n + '/2');
}
// an exponent that has to be shown: anything but 1 (0 never stays on the board)
export const showsExp = e => e !== 1 && e !== 0;
