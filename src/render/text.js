/* The text renderer: states, terms, sums and conditions as HTML (the board's formula line, notes, win sheets).
   The model and the moves hold no HTML; they call these for the math inside their messages. */
import { expText, showsExp } from '../core/kinds/exponent.js';
import { sumKey } from '../core/kinds/sums.js';
import { isOne, tidy, unbare } from '../core/model.js';
import { branchCount, eqView, isBranched } from '../core/problem.js';
import { I18N, lang } from '../i18n.js';

/* ---- notation (HTML) ---- */
// √ over some HTML: the hook is drawn so it meets the bar at any height; the glyph stays as hidden text
export const sqHTML = inner => `<span class="sq"><svg class="rs-svg" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0.5 64 L2.8 58 L5.4 100 L10 0"/></svg><span class="rs">√</span><span class="rad">${inner}</span></span>`;

// how each kind of node is written; rank orders the factors of a tidy term (numbers, letters, roots, brackets)
const HTML = {};
export const defineHTML = (k, rank, html) => { HTML[k] = { rank, html }; };
const sup = e => showsExp(e) ? `<sup>${expText(e)}</sup>` : '';
defineHTML('n', 0, f => `<span class="mn">${f.v}</span>`);
defineHTML('v', 1, f => `<i class="mv">${f.b}</i>${sup(f.e)}`);
defineHTML('r', 2, f => sqHTML(sumHTML(f.terms)));
defineHTML('g', 2, f => (f.f.length === 1 && f.f[0].k === 'n' ? factorsHTML(f.f) : `(${factorsHTML(f.f)})`) + sup(f.e));   // 2³ needs no brackets
defineHTML('p', 3, f => `(${sumHTML(f.terms)})${sup(f.e)}`);
defineHTML('q', 0, f => `<span class="nfrac q"><span class="nn">${sumHTML(unbare(f.num))}</span><span class="nd">${sumHTML(unbare(f.den))}</span></span>`);   // ⅔ in front, like a number
defineHTML('bk', 3, f => `<span class="bk">${sumHTML(f.terms)}</span>${sup(f.e)}`);   // a bracket shown as a block (blockHTML)

export const fx = f => HTML[f.k].html(f);

export function factorsHTML(fs, sort) {
  let list = fs;
  if (sort) list = [...fs].sort((a, b) => HTML[a.k].rank - HTML[b.k].rank || (a.b || '').localeCompare(b.b || ''));
  return list.map((f, i) => (i > 0 && f.k === 'n' ? '·' : '') + fx(f)).join('');
}

export function termHTML(t) { return factorsHTML(t.f, tidy(t, true)); }

export function sumHTML(terms) {
  return terms.map((t, i) => (i === 0 ? (t.neg ? '−' : '') : (t.neg ? ' − ' : ' + ')) + termHTML(t)).join('');
}

export function fracHTML(P, showOne) {
  if (isOne(P.den) && !showOne) return sumHTML(P.num);
  // a bracket that is the whole top or bottom is written without it: (d − b)/(a − c) reads d − b over a − c
  return `<span class="nfrac"><span class="nn">${sumHTML(unbare(P.num))}</span><span class="nd">${sumHTML(unbare(P.den))}</span></span>`;
}

// "or" between the branches of an equation: x = 3 ∨ x = −3 (Dutch textbooks write ∨)
export const orWord = () => (typeof I18N !== 'undefined' && typeof lang !== 'undefined' && I18N[lang] && I18N[lang].orWord) || '∨';

export function stateHTML(S) {
  if (isBranched(S))
    return Array.from({ length: branchCount(S) }, (_, b) => `<span class="branch">${stateHTML(eqView(S, b))}</span>`).join(` <span class="nop or">${orWord()}</span> `);
  if (S.parts.length > 1 && S.op === '/')
    return `<span class="nfrac big"><span class="nn">${fracHTML(S.parts[0])}</span><span class="nd">${fracHTML(S.parts[1])}</span></span>`;
  return S.parts.map(P => fracHTML(P, S.op === '·')).join(` <span class="nop">${S.op || ''}</span> `);
}

export const mx = h => `<span class="mx">${h}</span>`;

export const bx = b => mx(`<i class="mv">${b}</i>`);

/* a bracket that sits in several terms, written as one block: x(x + 2) + 3(x + 2) reads x·[x+2] + 3·[x+2],
   so putting it outside brackets looks like the familiar 2a + 2b = 2(a + b) */
export const blockHTML = (terms, key) => sumHTML(terms.map(t => ({ ...t, f: t.f.map(f => f.k === 'p' && sumKey(f.terms) === key ? { k: 'bk', terms: f.terms, e: f.e } : f) })));

// a condition a move took for granted (addCond): a − c ≠ 0, b² − 4ac ≥ 0
export const condHTML = c => mx(sumHTML(c.terms) + { ge: ' ≥ 0', gt: ' > 0', ne: ' ≠ 0' }[c.rel]);
