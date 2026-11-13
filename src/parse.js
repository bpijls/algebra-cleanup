/* ===== PARSE: typed problems → game state. Uses N, V, G, Pr, T, F from core.js. =====
   Accepts textbook notation: 3a²·2a, (x+3)(x−2), −2(x−4), (2a)^3, 12a^5/4a^2, 12a⁵ : 4a², (8x/3y) : (3x/y).
   Returns { S } or { err: messageKey, at: index }. */
import { letters } from './core/balance.js';
import { Pr } from './core/kinds/bracket.js';
import { G } from './core/kinds/group.js';
import { V } from './core/kinds/letter.js';
import { N } from './core/kinds/number.js';
import { Q } from './core/kinds/fraction.js';
import { Rt } from './core/kinds/root.js';
import { F, T } from './core/kinds/sums.js';
import { isClean, isOne, liftFrac, normalize } from './core/model.js';
import { isEquation } from './core/problem.js';

export const SUP = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
export function tokenize(src) {
  const out = [];
  const s = src.replace(/[−–—]/g, '-').replace(/[×⋅∙*]/g, '·').replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch)) { let j = i; while (j < s.length && /\d/.test(s[j])) j++; out.push({ t: 'num', v: +s.slice(i, j), at: i }); i = j; continue; }
    if (ch in SUP || (ch === '⁻' && s[i + 1] in SUP)) {   // a⁵, a⁻²
      let j = ch === '⁻' ? i + 1 : i, v = ''; while (j < s.length && s[j] in SUP) v += SUP[s[j++]];
      out.push({ t: 'pow', v: (ch === '⁻' ? -1 : 1) * v, at: i }); i = j; continue;
    }
    if (ch === '^') {   // a^5, a^-2, a^(-2), a^(1/2), a^(3/2), a^½
      let j = i + 1; while (s[j] === ' ') j++;
      const open = s[j] === '('; if (open) j++;
      const neg = s[j] === '-'; if (neg) j++;
      let v;
      if (s[j] === '½') { v = 0.5; j++; }
      else {
        let k = j; while (k < s.length && /\d/.test(s[k])) k++;
        if (k === j) return { err: 'pPower', at: i };
        v = +s.slice(j, k); j = k;
        if (open && s[j] === '/') {   // a fraction as a power only in brackets: a^(3/2), while a^3/a^5 is a fraction
          let m = j + 1; while (m < s.length && /\d/.test(s[m])) m++;
          const d = +s.slice(j + 1, m);
          if (m === j + 1 || !d) return { err: 'pPower', at: i };
          if (!Number.isInteger(v * 2 / d)) return { err: 'pPowHalf', at: i };   // only halves: a^(1/3) has no tile yet
          v /= d; j = m;
        }
      }
      if (open) { if (s[j] !== ')') return { err: 'pPower', at: i }; j++; }
      out.push({ t: 'pow', v: neg ? -v : v, at: i }); i = j; continue;
    }
    if ((ch === "'" || ch === '′') && UNARY.prime) { out.push({ t: 'prime', at: i }); i++; continue; }   // (x³)′: the derivative
    if ((ch === '¬' || ch === '!') && UNARY.not) { out.push({ t: 'not', at: i }); i++; continue; }   // logic: not
    if (/[a-z]/i.test(ch)) { out.push({ t: 'var', v: ch.toLowerCase(), at: i }); i++; continue; }
    if ('<>≤≥'.includes(ch)) {   // an inequality: x < 3, x <= 3, x ≥ 3
      const eq = s[i + 1] === '=' && (ch === '<' || ch === '>');
      out.push({ t: '=', rel: eq ? (ch === '<' ? '≤' : '≥') : ch, at: i }); i += eq ? 2 : 1; continue;
    }
    if ('+-·:/()='.includes(ch)) { out.push({ t: ch, at: i }); i++; continue; }
    if (ch === '√') { out.push({ t: 'sqrt', at: i }); i++; continue; }
    return { err: 'pChar', at: i, ch };
  }
  return { toks: out };
}

// a letter that a topic reads as a piece of its own: defineLetter('i', { flag: 'complex', make: e => [...] })
const LETTERS = {};
export const defineLetter = (ch, h) => { LETTERS[ch] = h; };
// a sign in front of a factor that a topic defines: defineUnary('not', factors => piece) reads ¬a, !(a + b)
const UNARY = {};
export const defineUnary = (id, make) => { UNARY[id] = make; };

export function parseProblem(src, goal, unknown) {
  const tk = tokenize(src || '');
  if (tk.err) return tk;
  const toks = tk.toks;
  if (!toks.length) return { err: 'pEmpty', at: 0 };
  let i = 0;
  const peek = () => toks[i], at = () => (toks[i] || toks[toks.length - 1]).at;
  const fail = (err, extra) => { throw Object.assign({ err, at: at() }, extra); };

  // sum := [±] term (± term)*
  function sum() {
    const terms = [];
    let neg = false;
    if (peek() && (peek().t === '+' || peek().t === '-')) { neg = peek().t === '-'; i++; }
    terms.push(term(neg));
    while (peek() && (peek().t === '+' || peek().t === '-')) { neg = peek().t === '-'; i++; terms.push(term(neg)); }
    return terms;
  }
  // term := product [/ product] [· term]: x/3 + 2 is (x/3) + 2, 12a⁵/4a² is 12a⁵ over 4a² (the whole product
  // below), and 2/3 · 3/4 is two fractions in one term
  function term(neg) {
    const top = product(neg);
    if (!peek() || peek().t !== '/') return top;
    i++;
    const bottom = product(false, true);
    if (peek() && peek().t === '/') fail('pFracTwo');
    if (bottom.f.length === 1 && bottom.f[0].k === 'n' && bottom.f[0].v === 0) { i--; fail('pDivZero'); }
    const t = T([Q([T(top.f)], [T(bottom.f, bottom.neg)])], top.neg);
    if (peek() && peek().t === '·') { i++; const more = term(false); t.f.push(...more.f); if (more.neg) t.neg = !t.neg; }
    return t;
  }
  // product := factor ([·] factor)*; below a bar it stops at a ·, so 2/3 · 3/4 is not 2 over 3·3
  function product(neg, bottom) {
    const fs = [];
    for (;;) {
      const p = peek();
      if (!p) break;
      if (p.t === '·' && bottom) break;
      if (p.t === '·') { if (!fs.length) fail('pMissing'); i++; fs.push(...factor()); continue; }
      if (p.t === 'sqrt') { fs.push(...factor()); continue; }
      if (p.t === 'num' || p.t === 'var' || p.t === '(' || p.t === 'not') { fs.push(...factor()); continue; }
      break;
    }
    if (!fs.length) fail('pMissing');
    if (fs.length > 1 && fs.some(f => f.k === 'n' && f.v === 0) && goal !== 'logic') { i--; fail('pZeroNum'); }   // logic: a · 0 is a move   // a lone 0 is fine: … = 0
    const t = T([], neg);
    for (const f of fs) { if (f.flip) t.neg = !t.neg; else t.f.push(f); }
    return t;
  }
  // a whole or half exponent; a negative one or a half turns on the moves that explode them (S.exps)
  let exps = false;
  const flags = new Set();   // a letter a topic reads as something else (i: the imaginary unit, S.complex)
  const power = () => {
    if (!(peek() && peek().t === 'pow')) return 1;
    const v = toks[i++].v;
    if (v === 0) fail('pZero');
    if (Math.abs(v) > 20) fail('pBig');
    if (v < 0 || !Number.isInteger(v)) exps = true;
    return v;
  };
  function factor() {
    const p = toks[i++];
    if (p.t === 'num') {
      const e = power();
      if (!p.v && e < 0) { i--; fail('pDivZero'); }
      return [e !== 1 && p.v ? G([N(p.v)], e) : N(p.v)];
    }
    if (p.t === 'not') { if (!peek()) fail('pMissing'); return [UNARY.not(factor())]; }
    if (p.t === 'var') { const e = power(), h = LETTERS[p.v]; if (h) { flags.add(h.flag); return h.make(e); } return [V(p.v, e)]; }
    // √12, √(x + 1): the root of what follows (a number, a letter, or a bracket)
    if (p.t === 'sqrt') {
      const n = peek();
      if (!n || !['num', 'var', '('].includes(n.t)) fail('pMissing');
      if (n.t === '(') { i++; const inner = sum(); if (!peek() || peek().t !== ')') fail('pParen'); i++; return [Rt(inner)]; }
      i++;
      return [Rt([T([n.t === 'num' ? N(n.v) : V(n.v)])])];
    }
    if (p.t !== '(') { i--; fail('pMissing'); }
    const open = i - 1;
    const inner = sum();
    if (!peek() || peek().t !== ')') { i = open; fail('pParen'); }
    i++;
    if (peek() && peek().t === 'prime') { i++; return [UNARY.prime(inner)]; }
    const e = power();
    if (inner.length > 1) { if (e < 0 || !Number.isInteger(e)) fail('pPowSum'); return [Pr(inner, e)]; }
    const it = inner[0];
    const simple = it.f.every(f => f.k === 'n' || f.k === 'v');
    if (e === 1) return it.neg ? [{ flip: true }, ...it.f] : it.f;   // (2a) is just 2a, (−a) is −a
    const lone = it.f.length === 1 && it.f[0];
    if (lone && lone.k === 'v' && lone.e === 1 && !it.neg) return [V(lone.b, e)];   // (a)⁻³ is just a⁻³ ((a²)³ stays: explode it)
    if (simple && !it.neg) return [G(it.f, e)];
    if (e < 0 || !Number.isInteger(e)) fail('pPowSum');
    return [Pr(inner, e)];                                            // (−2a)³: normalize turns it into a sign and a power
  }
  // a side: a sum of terms, each of which may be a fraction (x/3 + 2); a side that is one fraction is its own bar
  function fraction() { return liftFrac(F(sum())); }
  // a fraction in brackets, for (8x/3y) : (3x/y)
  function bracketFraction() {
    const save = i;
    if (!peek() || peek().t !== '(') return null;
    let depth = 0, j = i, slash = false;
    for (; j < toks.length; j++) {
      if (toks[j].t === '(') depth++;
      else if (toks[j].t === ')') { depth--; if (!depth) break; }
      else if (toks[j].t === '/' && depth === 1) slash = true;
    }
    if (!slash || j >= toks.length) return null;
    i++;
    const P = fraction();
    if (!peek() || peek().t !== ')') { i = save; return null; }
    i++;
    return P;
  }
  try {
    let S;
    const A = bracketFraction() || fraction();
    if (peek() && peek().t === '=') {   // an equation (or inequality): solve it with the balance method
      const rel = toks[i].rel;
      i++;
      if (!peek()) fail('pMissing');
      const B = bracketFraction() || fraction();
      if (peek()) fail(peek().t === '=' ? 'pTwoEq' : peek().t === ')' ? 'pParen' : 'pMissing');
      S = { parts: [A, B], op: '=', goal: 'solve' };
      if (rel) S.rel = rel;
      if (exps) S.exps = true;
      for (const fl of flags) S[fl] = true;
      normalize(S);
      // the unknown: the one asked for, else x, else the only letter (a, b, p … are then parameters)
      const bs = letters(S);
      if (!bs.length) return { err: 'pEqNoLetter', at: 0 };
      if (unknown && !bs.includes(unknown)) return { err: 'pEqUnknown', at: 0, p: { b: unknown } };
      const u = unknown || (bs.includes('x') ? 'x' : bs.length === 1 ? bs[0] : null);
      if (!u) return { err: 'pEqWhich', at: 0 };
      if (rel && bs.length > 1) return { err: 'pIneqLetters', at: 0 };   // a letter for a number could be negative
      if (bs.length > 1) S.unknown = u;
      return { S };
    }
    if (peek() && (peek().t === ':' || peek().t === '·')) {
      const op = toks[i++].t;
      const B = bracketFraction() || fraction();
      if (op === '·' && (isOne(A.den) || isOne(B.den))) fail('pTimes');
      S = { parts: [A, B], op };
    } else S = { parts: [A], op: null };
    if (peek()) fail(peek().t === ')' ? 'pParen' : 'pMissing');
    S.goal = goal || 'simplify';
    if (exps) S.exps = true;
    for (const fl of flags) S[fl] = true;
    normalize(S);
    return { S };
  } catch (e) {
    if (e && e.err) return e;
    throw e;
  }
}

// which kind of exercise this looks like: a plain sum with nothing to simplify asks to be factored
export function guessGoal(src) {
  const r = parseProblem(src, 'simplify');
  if (r.err) return 'simplify';
  const S = r.S;
  if (isEquation(S)) return 'solve';
  if (S.parts.length === 1 && isOne(S.parts[0].den) && S.parts[0].num.length >= 2 && isClean(S)) return 'factor';
  return 'simplify';
}
