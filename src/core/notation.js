/* Notation: states, terms and sums as HTML. */
import { branchCount, eqView, isOne, sumKey, tidy, unbare } from './model.js';
import { I18N, lang } from '../i18n.js';

/* ---- notation (HTML) ---- */
// √ over some HTML: the hook is drawn so it meets the bar at any height; the glyph stays as hidden text
export const sqHTML = inner => `<span class="sq"><svg class="rs-svg" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0.5 64 L2.8 58 L5.4 100 L10 0"/></svg><span class="rs">√</span><span class="rad">${inner}</span></span>`;

export function fx(f) {
  if (f.k === 'n') return `<span class="mn">${f.v}</span>`;
  if (f.k === 'v') return `<i class="mv">${f.b}</i>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  if (f.k === 'p') return `(${sumHTML(f.terms)})${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  if (f.k === 'r') return sqHTML(sumHTML(f.terms));
  if (f.k === 'bk') return `<span class="bk">${sumHTML(f.terms)}</span>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  return `(${factorsHTML(f.f)})${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
}

export const RANK = { n: 0, v: 1, r: 2, g: 2, p: 3, bk: 3 };

export function factorsHTML(fs, sort) {
  let list = fs;
  if (sort) list = [...fs].sort((a, b) => RANK[a.k] - RANK[b.k] || (a.b || '').localeCompare(b.b || ''));
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
  if (S.op === '=' && S.parts.length > 2)
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
