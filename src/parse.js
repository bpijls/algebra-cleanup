/* ===== PARSE: typed problems → game state. Uses N, V, G, Pr, T, F from core.js. =====
   Accepts textbook notation: 3a²·2a, (x+3)(x−2), −2(x−4), (2a)^3, 12a^5/4a^2, 12a⁵ : 4a², (8x/3y) : (3x/y).
   Returns { S } or { err: messageKey, at: index }. */
import { letters } from './core/balance.js';
import { F, G, N, Pr, T, V, isClean, isOne, normalize } from './core/model.js';

export const SUP = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
export function tokenize(src) {
  const out = [];
  const s = src.replace(/[−–—]/g, '-').replace(/[×⋅∙*]/g, '·').replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
  for (let i = 0; i < s.length;) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch)) { let j = i; while (j < s.length && /\d/.test(s[j])) j++; out.push({ t: 'num', v: +s.slice(i, j), at: i }); i = j; continue; }
    if (ch in SUP) { let j = i, v = ''; while (j < s.length && s[j] in SUP) v += SUP[s[j++]]; out.push({ t: 'pow', v: +v, at: i }); i = j; continue; }
    if (ch === '^') {
      let j = i + 1; while (s[j] === ' ') j++;
      let k = j; while (k < s.length && /\d/.test(s[k])) k++;
      if (k === j) return { err: 'pPower', at: i };
      out.push({ t: 'pow', v: +s.slice(j, k), at: i }); i = k; continue;
    }
    if (/[a-z]/i.test(ch)) { out.push({ t: 'var', v: ch.toLowerCase(), at: i }); i++; continue; }
    if ('+-·:/()='.includes(ch)) { out.push({ t: ch, at: i }); i++; continue; }
    return { err: 'pChar', at: i, ch };
  }
  return { toks: out };
}

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
  // term := factor ([·] factor)*
  function term(neg) {
    const fs = [];
    for (;;) {
      const p = peek();
      if (!p) break;
      if (p.t === '·') { if (!fs.length) fail('pMissing'); i++; fs.push(...factor()); continue; }
      if (p.t === 'num' || p.t === 'var' || p.t === '(') { fs.push(...factor()); continue; }
      break;
    }
    if (!fs.length) fail('pMissing');
    if (fs.length > 1 && fs.some(f => f.k === 'n' && f.v === 0)) { i--; fail('pZeroNum'); }   // a lone 0 is fine: … = 0
    const t = T([], neg);
    for (const f of fs) { if (f.flip) t.neg = !t.neg; else t.f.push(f); }
    return t;
  }
  const power = () => { if (peek() && peek().t === 'pow') { const v = toks[i++].v; if (v < 1) fail('pZero'); if (v > 20) fail('pBig'); return v; } return 1; };
  function factor() {
    const p = toks[i++];
    if (p.t === 'num') { const e = power(); return [e > 1 && p.v ? G([N(p.v)], e) : N(p.v)]; }
    if (p.t === 'var') return [V(p.v, power())];
    if (p.t !== '(') { i--; fail('pMissing'); }
    const open = i - 1;
    const inner = sum();
    if (peek() && peek().t === '/') fail('pFracInside');
    if (!peek() || peek().t !== ')') { i = open; fail('pParen'); }
    i++;
    const e = power();
    if (inner.length > 1) return [Pr(inner, e)];
    const it = inner[0];
    const simple = it.f.every(f => f.k === 'n' || f.k === 'v');
    if (e === 1) return it.neg ? [{ flip: true }, ...it.f] : it.f;   // (2a) is just 2a, (−a) is −a
    if (simple && !it.neg) return [G(it.f, e)];
    return [Pr(inner, e)];                                            // (−2a)³: normalize turns it into a sign and a power
  }
  // fraction := sum [/ sum]; a whole parenthesised side may hold a sum: (x+2)/(x+3)
  // x/3 + 2 would read as x/(3 + 2): a sum on either side of / must be in brackets
  function fraction() {
    const num = sum();
    if (peek() && peek().t === '/') {
      if (num.length > 1) fail('pFracSum');
      i++; const den = sum();
      if (den.length > 1) { i--; fail('pFracSum'); }
      return F(num, den);
    }
    return F(num);
  }
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
    if (peek() && peek().t === '=') {   // an equation: solve it with the balance method
      i++;
      if (!peek()) fail('pMissing');
      const B = bracketFraction() || fraction();
      if (peek()) fail(peek().t === '=' ? 'pTwoEq' : peek().t === ')' ? 'pParen' : 'pMissing');
      S = { parts: [A, B], op: '=', goal: 'solve' };
      normalize(S);
      // the unknown: the one asked for, else x, else the only letter (a, b, p … are then parameters)
      const bs = letters(S);
      if (!bs.length) return { err: 'pEqNoLetter', at: 0 };
      if (unknown && !bs.includes(unknown)) return { err: 'pEqUnknown', at: 0, p: { b: unknown } };
      const u = unknown || (bs.includes('x') ? 'x' : bs.length === 1 ? bs[0] : null);
      if (!u) return { err: 'pEqWhich', at: 0 };
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
  if (S.op === '=') return 'solve';
  if (S.parts.length === 1 && isOne(S.parts[0].den) && S.parts[0].num.length >= 2 && isClean(S)) return 'factor';
  return 'simplify';
}
