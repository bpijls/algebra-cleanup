/* ===== PRACTICE: random problem generator ===== */
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const VARS = ['a', 'b', 'x', 'y'];
const otherVar = v => pick(VARS.filter(w => w !== v));
const coprime = (lo, hi, not) => { let u; do u = R(lo, hi); while (not && gcd(u, not) !== 1); return u; };
const coin = () => Math.random() < .5;

// a monomial term from {coef, vars:{a:2,...}}; untidy = spread it over several tiles
function mono(c, vars, neg, untidy) {
  const fs = [];
  if (untidy && c > 3 && primeFactors(c).length > 1) {
    const pf = primeFactors(c); const k = R(1, pf.length - 1);
    fs.push(N(pf.slice(0, k).reduce((a, b) => a * b, 1)), N(pf.slice(k).reduce((a, b) => a * b, 1)));
  } else if (c !== 1 || !Object.keys(vars).length) fs.push(N(c));
  for (const [b, e] of Object.entries(vars)) {
    if (untidy && e > 1 && coin()) { const k = R(1, e - 1); fs.push(V(b, k), V(b, e - k)); }
    else fs.push(V(b, e));
  }
  if (untidy) fs.sort(() => Math.random() - .5);
  return T(fs, neg);
}

const GEN = {
  powers(d) {
    const v = pick(VARS);
    const kinds = d === 1 ? ['prod', 'pp'] : d === 2 ? ['prod', 'pp', 'prodc', 'ppc'] : ['prod', 'prodc', 'ppc', 'mix'];
    const kind = pick(kinds);
    if (kind === 'prod') {
      const fs = Array.from({ length: d === 1 ? 2 : 3 }, () => V(v, R(1, d === 1 ? 4 : 5)));
      if (d === 3) { const w = otherVar(v); fs.splice(1, 0, V(w, R(1, 3))); fs.push(V(w, R(1, 3))); }
      return { parts: [F([T(fs)])] };
    }
    if (kind === 'pp') return { parts: [F([T([G([V(v, R(2, 4))], R(2, 3))])])] };
    if (kind === 'prodc') {
      const fs = [N(R(2, 6)), V(v, R(1, 4)), N(R(2, 5)), V(v, R(1, 3))];
      if (d === 3) fs.push(G([V(v, 2)], R(2, 3)));
      return { parts: [F([T(fs, d === 3 && coin())])] };
    }
    if (kind === 'ppc') {
      const inner = [N(R(2, 3)), V(v, R(1, 3))];
      if (d === 3) inner.push(V(otherVar(v), R(1, 2)));
      const fs = [G(inner, R(2, 3))];
      if (coin()) fs.unshift(N(R(2, 4)));
      return { parts: [F([T(fs)])] };
    }
    // mix: −2a · 5(a³)³ style
    return { parts: [F([T([N(R(2, 5)), V(v, R(1, 2)), N(R(2, 5)), G([V(v, R(2, 3))], R(2, 3))], coin())])] };
  },

  like(d) {
    const v = pick(VARS), w = otherVar(v);
    const sigPool = d === 1 ? [{ [v]: 1 }, { [v]: 2 }] : d === 2 ? [{ [v]: 1 }, { [v]: 2 }, { [w]: 1 }] : [{ [v]: 1, [w]: 1 }, { [v]: 2, [w]: 1 }, { [v]: 2 }];
    const n = d === 1 ? 3 : 4;
    const main = pick(sigPool);
    const sigs = [main, main];
    while (sigs.length < n) sigs.push(pick(sigPool));
    sigs.sort(() => Math.random() - .5);
    const terms = sigs.map((s, i) => mono(R(1, d === 1 ? 6 : 9), s, i > 0 && d > 1 && Math.random() < .35, d === 3 && Math.random() < .5));
    return { parts: [F(terms)] };
  },

  frac(d) {
    const v = pick(VARS), w = otherVar(v);
    if (d === 3 && coin()) {   // dividing fractions
      const p = R(2, 9), q = R(2, 5), r = R(2, 5), s = R(1, 3);
      return { parts: [F([mono(p, { [v]: R(1, 2) })], [mono(q, { [w]: R(1, 2) })]), F([mono(r, { [v]: 1 })], [mono(s, { [w]: 1 })])], op: ':' };
    }
    const g = d === 1 ? 1 : R(2, 5), p = R(1, 6), q = coprime(1, 5, p);
    const m = R(2, 7), k = R(1, 5);
    const numVars = { [v]: m }, denVars = { [v]: k === m ? k - 1 || 1 : k };
    if (d >= 2 && coin()) { numVars[w] = R(1, 4); denVars[w] = R(1, 3); }
    if (d === 3) {
      const e = R(2, 3), base = R(1, 2);
      const num = T([G([N(2), V(v, base)], e)]);
      return { parts: [F([num], [mono(2 * R(1, 3), { [v]: R(1, base * e) })])] };
    }
    return { parts: [F([mono(p * g, numVars)], [mono(q * g, denVars)])] };
  },

  open(d) {
    const v = pick(VARS), c = R(2, 6), dd = R(1, 7);
    const inner = () => Pr([T([V(v)]), T([N(R(1, 7))], coin())]);
    if (d === 1) return { parts: [F([T([N(c), Pr([T([V(v)]), T([N(dd)], coin())])])])] };
    if (d === 2) return coin()
      ? { parts: [F([T([N(c), inner()]), mono(R(1, 6), { [v]: 1 }, coin())])] }
      : { parts: [F([T([inner()], true), mono(R(2, 6), { [v]: 1 })])] };        // −(x − 3) + 4x
    return { parts: [F([T([N(c), inner()]), T([N(R(2, 5)), inner()], true)])] };  // 3(x + 1) − 2(x − 4)
  },

  // (x + 3)(x − 2), (2a + 1)(a − 4), (a + b)(a + 2b)
  double(d) {
    const v = pick(VARS), w = otherVar(v);
    const lin = (k, n) => Pr([mono(k, { [v]: 1 }), T([N(Math.abs(n))], n < 0)]);
    const nz = (lo, hi) => { let n; do n = R(lo, hi); while (!n); return n; };
    if (d === 1) return { parts: [F([T([lin(1, R(1, 6)), lin(1, R(1, 6))])])] };
    if (d === 2) return { parts: [F([T([lin(1, nz(-7, 7)), lin(1, nz(-7, 7))])])] };
    if (coin()) return { parts: [F([T([lin(R(1, 3), nz(-5, 5)), lin(R(2, 3), nz(-5, 5))])])] };
    const two = (k) => Pr([T([V(v)]), mono(k, { [w]: 1 }, coin())]);
    return { parts: [F([T([two(R(1, 3)), two(R(1, 3))])])] };
  },

  // merkwaardige producten: (a + b)², (a − b)², (a + b)(a − b), and with a number in front
  square(d) {
    const v = pick(VARS), w = otherVar(v), n = R(1, 7);
    const sum = (neg, k = 1, other) => Pr([mono(k, { [v]: 1 }), other ? mono(1, { [w]: 1 }, neg) : T([N(n)], neg)]);
    if (d === 1) return { parts: [F([T([Pr(sum(coin()).terms, 2)])])] };
    if (d === 2) return pick([
      () => ({ parts: [F([T([Pr(sum(true).terms, 2)])])] }),
      () => ({ parts: [F([T([sum(false), sum(true)])])] }),
      () => ({ parts: [F([T([Pr(sum(coin(), 1, true).terms, 2)])])] }),
    ])();
    return pick([
      () => ({ parts: [F([T([Pr(sum(coin(), R(2, 3)).terms, 2)])])] }),                       // (2x + 3)²
      () => ({ parts: [F([T([N(R(2, 4)), Pr(sum(coin()).terms, 2)])])] }),                    // 3(x − 2)²
      () => ({ parts: [F([T([Pr(sum(false).terms, 2)]), T([sum(false), sum(true)], true)])] }), // (x + 3)² − (x + 3)(x − 3)
    ])();
  },

  // ontbinden: x² + bx + c from (x + p)(x + q); at Hard also a number in front or 2x² + …
  trinomial(d) {
    const v = pick(VARS);
    const nz = (lo, hi) => { let n; do n = R(lo, hi); while (!n); return n; };
    let a = 1, p, q, k = 1;
    if (d === 1) { p = R(1, 6); q = R(1, 6); }
    else { do { p = nz(-8, 8); q = nz(-8, 8); } while (p + q === 0); }
    if (d === 3) { if (coin()) k = R(2, 3); else { a = 2; if (p % 2 === 0) p++; } }
    // k(ax + p)(x + q) = k(a x² + (aq + p) x + pq)
    const b = k * (a * q + p), c = k * p * q, A = k * a;
    const terms = [mono(A, { [v]: 2 })];
    if (b) terms.push(mono(Math.abs(b), { [v]: 1 }, b < 0));
    terms.push(T([N(Math.abs(c))], c < 0));
    return { parts: [F(terms)], goal: 'factor' };
  },

  factor(d) {
    const v = pick(VARS), w = otherVar(v);
    let g, cv, inner;
    if (d === 1) { g = R(2, 7); cv = {}; inner = [mono(R(1, 3) === 1 ? 1 : 1, { [v]: 1 }), mono(1, { [w]: 1 }, coin())]; }
    else if (d === 2) {
      if (coin()) { g = R(2, 5); const u = R(1, 4), s = coprime(2, 5, u); cv = {}; inner = [mono(u, { [v]: 1 }), mono(s, { [w]: 1 }, coin())]; }
      else { g = 1; cv = { [v]: 1 }; const u = R(2, 5); inner = [mono(u, { [v]: 1 }), mono(R(1, 7), {}, coin())]; }
    } else {
      g = R(2, 4); cv = { [v]: 1 }; const u = R(1, 4), s = coprime(2, 5, u);
      inner = [mono(u, { [v]: 1 }), mono(s, { [w]: R(1, 2) }, coin())];
    }
    const terms = inner.map(t => {
      const vars = { ...cv };
      varPart(t).forEach(f => { vars[f.b] = (vars[f.b] || 0) + f.e; });
      return mono(g * coefAbs(t), vars, t.neg);
    });
    return { parts: [F(terms)], goal: 'factor' };
  },

  // the balance method, built from the answer k: x + 3 = 7, 3x + 5 = 20, 5x + 3 = 2x + 12, 2(x + 3) = 4x − 2, (x + 3)/2 = 4
  equations(d) {
    const v = pick(['x', 'x', 'a', 'y']);
    const nz = (lo, hi) => { let n; do n = R(lo, hi); while (!n); return n; };
    const sg = n => (n < 0 ? '-' : '+') + Math.abs(n);   // as a following term: +3, -3
    const k = nz(-9, 9);
    const other = a => { let c; do c = nz(-6, 6); while (c === a); return c; };
    let src;
    if (d === 1) {
      const a = R(2, 9), b = nz(-9, 9);
      src = coin() ? `${v}${sg(b)}=${k + b}` : `${a}${v}=${a * k}`;
    } else if (d === 2) {
      const a = nz(-6, 6), b = nz(-9, 9), c = other(a), e = a * k + b - c * k;
      src = coin() ? `${a}${v}${sg(b)}=${a * k + b}` : `${a}${v}${sg(b)}=${c}${v}${e ? sg(e) : ''}`;
    } else {
      const a = R(2, 5), b = nz(-6, 6), c = other(a), e = a * (k + b) - c * k;
      src = pick([
        `${a}(${v}${sg(b)})=${c}${v}${e ? sg(e) : ''}`,       // 2(x + 3) = 4x − 2
        `${v}/${a}=${k}`,                                   // x/3 = 4
        `(${v}${sg(b)})/${a}=${(k + b) % a ? k : (k + b) / a}`,   // (x + 3)/2 = 4
      ]);
    }
    return parseProblem(src).S;
  },

  // kwadratische vergelijkingen. Easy: x² = c, (x + p)² = c, a product = 0. Medium: sum-product, or
  // completing the square with an even b. Hard: odd b or a ≠ 1, through multiplying by 4a. Real solutions only.
  quadratic(d) {
    const v = pick(['x', 'x', 'a']);
    const nz = (lo, hi) => { let n; do n = R(lo, hi); while (!n); return n; };
    const sg = n => (n < 0 ? '-' : '+') + Math.abs(n);
    const poly = (a, b, c) => `${a === 1 ? '' : a}${v}^2${b ? sg(b) + (Math.abs(b) === 1 ? '' : '').replace(/^([+-])1$/, '$1') + v : ''}${c ? sg(c) : ''}=0`.replace(/([+-])1([a-z])/, '$1$2');
    let src;
    if (d === 1) src = pick([
      () => `${v}^2=${pick([4, 9, 16, 25, 36, 49, 64, 81, 100, 8, 12, 18, 20, 27, 7])}`,
      () => `(${v}${sg(nz(-6, 6))})^2=${pick([4, 9, 16, 25, 2, 3, 5, 7, 8, 12])}`,
      () => `(${v}${sg(nz(-7, 7))})(${v}${sg(nz(-7, 7))})=0`,
      () => { const k = R(2, 5); return `${k}${v}^2=${k * pick([4, 9, 16, 25])}`; },
    ])();
    else if (d === 2) {
      if (coin()) { const p = nz(-8, 8), q = nz(-8, 8); src = poly(1, p + q, p * q); }   // (x + p)(x + q) written out
      else { let p, c; do { p = nz(-5, 5); c = nz(-15, 15); } while (p * p - c <= 0 || Number.isInteger(Math.sqrt(p * p - c))); src = poly(1, 2 * p, c); }
    } else {
      let a, b, c;
      do { a = pick([1, 1, 2, 2, 3]); b = nz(-7, 7); c = nz(-9, 9); }
      // b odd and sharing nothing with a: then 4a·(ax² + bx) + b² is a square with nothing to take out
      while (b % 2 === 0 || gcd(a, b) > 1 || b * b - 4 * a * c <= 0 || Number.isInteger(Math.sqrt(b * b - 4 * a * c)) || gcd(gcd(a, b), c) > 1);
      src = poly(a, b, c);
    }
    const r = parseProblem(src, 'solve');
    return r.err ? GEN.quadratic(d) : r.S;
  },

  mixed(d) {
    const v = pick(VARS);
    const E = pick([6, 8, 12]);
    const pairs = [[2, E / 2], [E / 2, 2], ...(E % 3 === 0 ? [[3, E / 3]] : []), ...(E % 4 === 0 ? [[4, E / 4]] : [])];
    const [m, n] = pick(pairs); let [k, l] = pick(pairs);
    const c1 = R(2, 9), c2 = R(1, 7);
    const t1 = T([N(c1), G([V(v, m)], n)]);
    const t2 = d === 1 ? T([N(c2), G([V(v, k)], l)], coin()) : T([G([N(R(2, 3)), V(v, k)], l)]);
    if (d < 3) return { parts: [F([t1, t2])] };
    const s = c1 + Math.pow(t2.f[0].f[0].v, l);
    const divs = [2, 3, 5, 7].filter(p => s % p === 0);
    return { parts: [F([t1, t2], [mono(divs.length ? pick(divs) : R(2, 5), { [v]: R(1, 4) })])] };
  },
};

// follow one hint; returns the move's result, or null when the hint can't be followed
function autoSolveStep(S) {
  const h = hint(S); let r = null;
  if (h.k === 'hDone') return null;
  if (h.k === 'hDiv' || h.k === 'hBar' || h.k === 'hJoin') r = opOp(S);
  else if (h.k === 'hGroup' || h.k === 'hOpen' || h.k === 'hExplodeVar') r = opExplode(S, h.ids[0]);
  else if (h.k === 'hExplodeCancel' || h.k === 'hExplodeNums' || h.k === 'hExplodeFor' || h.k === 'hExplodeRoot') { for (const id of h.ids) { r = opExplode(S, id); normalize(S); if (r && r.no) break; } }
  else if (h.k === 'hSumProduct') r = opSplitTwo(S, h.ids[0], h.split);
  else if (h.drag != null) r = opDrag(S, h.drag);   // the hinted piece, dragged across the =
  else if (h.k === 'hSwap') r = opSwap(S, h.bi || 0);
  else if (h.balance) r = opBalance(S, h.balance.op, h.balance.value, h.bi || 0);   // typed: + 9, · 8
  else if (h.k === 'hNoReal' || h.k === 'hNoRealD') return null;
  else r = opPair(S, h.ids[0], h.ids[1]);
  if (!r || r.no) return null;
  normalize(S);
  return r;
}
function autoSolve(S) {
  let k = 0;
  while (k < 80 && !isClean(S) && autoSolveStep(S)) k++;
  return isClean(S) ? k : null;
}

function makeProblem(topics, d) {
  for (let tries = 0; tries < 60; tries++) {
    const topic = pick(topics);
    const S = GEN[topic](d);
    S.op = S.op || null; S.goal = S.goal || 'simplify';
    normalize(S);
    if (isClean(S)) continue;
    const test = JSON.parse(JSON.stringify(S));
    const moves = autoSolve(test);
    if (moves == null || moves > 60) continue;
    if (/^<span class="mn">0<\/span>$/.test(stateHTML(test))) continue;
    S.topic = topic;
    return S;
  }
  return null;
}
/* ===== END PRACTICE ===== */
