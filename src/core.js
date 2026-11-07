/* ===== CORE: algebra model and moves (no DOM) ===== */
let uid = 1;
const nid = () => uid++;
const N = v => ({ k: 'n', v, id: nid() });
const V = (b, e = 1) => ({ k: 'v', b, e, id: nid() });
const G = (f, e) => ({ k: 'g', f, e, id: nid() });          // bracket around a product, with exponent
const Pr = (terms, e = 1) => ({ k: 'p', terms, e, id: nid() });  // bracket around a sum, with exponent
const T = (f, neg = false) => ({ k: 't', f, neg, id: nid() });
const F = (num, den) => ({ num, den: den || [T([N(1)])] });
const MAX_VAR = 16, MAX_GROUP = 8;

const cloneF = f => f.k === 'n' ? N(f.v) : f.k === 'v' ? V(f.b, f.e) : f.k === 'g' ? G(f.f.map(cloneF), f.e) : Pr(f.terms.map(cloneT), f.e);
const cloneT = t => T(t.f.map(cloneF), t.neg);
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
function primeFactors(n) { const r = []; let d = 2; while (n > 1) { while (n % d === 0) { r.push(d); n /= d; } d++; } return r; }
const fkey = f => f.k === 'n' ? 'n' + f.v : f.k === 'v' ? f.b + '^' + f.e : f.k === 'g' ? '(' + f.f.map(fkey).join('*') + ')^' + f.e
  : sumKey(f.terms) + '^' + f.e;
// a sum, independent of the order of its terms and of the factors inside each term
const sumKey = terms => '[' + terms.map(t => (t.neg ? '-' : '+') + t.f.map(fkey).sort().join('*')).sort().join('') + ']';
const innerKey = g => g.f.map(fkey).join('*');
function canMerge(x, y) {
  if (x.k !== y.k) return false;
  if (x.k === 'n') return true;
  if (x.k === 'v') return x.b === y.b;
  if (x.k === 'p') return sumKey(x.terms) === sumKey(y.terms);
  return innerKey(x) === innerKey(y);
}
function mergeF(x, y) {
  if (x.k === 'n') return N(x.v * y.v);
  if (x.k === 'v') return V(x.b, x.e + y.e);
  if (x.k === 'p') return Pr(x.terms.map(cloneT), x.e + y.e);
  return G(x.f.map(cloneF), x.e + y.e);
}
const varPart = t => t.f.filter(f => f.k === 'v');
const sig = t => t.f.filter(f => f.k === 'v' || f.k === 'p').map(f => f.k === 'v' ? f.b + f.e : fkey(f)).sort().join('.');
const coefAbs = t => { const n = t.f.find(f => f.k === 'n'); return n ? n.v : 1; };
const coef = t => coefAbs(t) * (t.neg ? -1 : 1);
const isOne = den => den.length === 1 && !den[0].neg && den[0].f.length === 1 && den[0].f[0].k === 'n' && den[0].f[0].v === 1;
const SIDES = ['num', 'den'];

/* A term is tidy when it reads as: one number, each letter once (and, if allowed, one clean bracket). */
function tidy(t, allowB) {
  let n = 0, p = 0; const bs = new Set();
  for (const f of t.f) {
    if (f.k === 'g') return false;
    if (f.k === 'p') { if (!allowB || f.e !== 1 || !sumClean(f.terms)) return false; p++; }
    else if (f.k === 'n') n++;
    else { if (bs.has(f.b)) return false; bs.add(f.b); }
  }
  return n <= 1 && p <= 1;
}
function sumClean(terms) {
  if (terms.length < 2 || !terms.every(t => tidy(t, true))) return false;
  const s = terms.map(sig); return new Set(s).size === s.length;
}

function cleanTerm(t) {
  t.f = t.f.filter(f => !(f.k !== 'n' && f.e === 0));
  if (t.f.length > 1) t.f = t.f.filter(f => !(f.k === 'n' && f.v === 1));
  if (!t.f.length) t.f = [N(1)];
  return t;
}
function normTerms(terms, keepBare) {
  for (const t of terms) {
    const nf = [];
    for (const f of t.f) {
      if (f.k === 'p') {
        normTerms(f.terms);
        if (f.terms.length === 1) {
          const it = f.terms[0];
          if (it.neg && f.e % 2) t.neg = !t.neg;
          if (f.e === 1) nf.push(...it.f); else nf.push(G(it.f, f.e));   // (2a)² is a power of a product
          continue;
        }
      }
      nf.push(f);
    }
    t.f = nf;
    cleanTerm(t);
  }
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    // a bare bracket with + in front is just its terms; a minus or a power in front must be opened by the player
    if (t.f.length === 1 && t.f[0].k === 'p' && !t.neg && t.f[0].e === 1 && !(keepBare && terms.length === 1)) {
      const inner = t.f[0].terms;
      terms.splice(i, 1, ...inner); i += inner.length - 1;
    }
  }
  // + 0 adds nothing: x + 0 is x
  for (let i = terms.length - 1; i >= 0 && terms.length > 1; i--)
    if (terms[i].f.length === 1 && terms[i].f[0].k === 'n' && terms[i].f[0].v === 0) terms.splice(i, 1);
}
const isUnit = side => side.length === 1 && side[0].f.length === 1 && side[0].f[0].k === 'n' && side[0].f[0].v === 1;
function negate(side) {
  if (side.length === 1) side[0].neg = !side[0].neg;
  else side.forEach(t => { t.neg = !t.neg; });
}
function normalize(S) {
  for (const P of S.parts) for (const side of SIDES) {
    // (x+2)/(x+2)(x+3): a bracket that is the whole top or bottom stays a bracket, so it can cancel as one piece
    normTerms(P[side], !isUnit(P[side === 'num' ? 'den' : 'num']) && S.op !== '·');
    if (!P[side].length) P[side] = [T([N(side === 'num' ? 0 : 1)])];
  }
  // a minus below the bar goes on top: 6/−2 is −6/2 (dividing both sides of an equation by −2 makes these)
  for (const P of S.parts) if (P.den.length === 1 && P.den[0].neg) { P.den[0].neg = false; negate(P.num); }
  // a fraction that is used up (1 over 1) stays on the board: the player cancels the 1's (opPair, 'ones')
  // (a/1) / (b/1) is just a/b
  if (S.parts.length === 2 && S.op === '/' && isOne(S.parts[0].den) && isOne(S.parts[1].den))
    S.parts = [F(S.parts[0].num, S.parts[1].num)];
  if (S.parts.length === 1) S.op = null;
}

function isFactored(S) {
  if (S.parts.length > 1) return false;
  const P = S.parts[0];
  if (!isOne(P.den) || P.num.length !== 1) return false;
  const t = P.num[0];
  const ps = t.f.filter(f => f.k === 'p');
  if (!ps.length || !tidy({ f: t.f.filter(f => f.k !== 'p') })) return false;
  const keys = ps.map(f => sumKey(f.terms));
  if (new Set(keys).size !== keys.length) return false;   // (x+2)(x+2) is written (x+2)²
  return ps.every(f => {
    const inner = f.terms;
    if (!sumClean(inner) || !inner.every(t => tidy(t))) return false;   // no half-finished brackets inside
    let g = 0; inner.forEach(it => { g = gcd(g, coefAbs(it)); });
    if (g > 1 || quadSplit(inner)) return false;   // x² + 5x + 6 still splits into (x + 2)(x + 3)
    return !varPart(inner[0]).some(v => inner.every(it => varPart(it).some(w => w.b === v.b)));
  });
}
// a side that is one bare bracket reads as the sum inside it
const unbare = side => side.length === 1 && !side[0].neg && side[0].f.length === 1 && side[0].f[0].k === 'p' && side[0].f[0].e === 1 ? side[0].f[0].terms : side;
function isClean(S) {
  if (S.goal === 'solve') return isSolved(S);
  if (S.goal === 'factor') return isFactored(S);
  if (S.parts.length > 1) return false;
  const P = S.parts[0];
  for (const side of SIDES) {
    const ts = unbare(P[side]);
    if (!ts.every(t => tidy(t, !!S.allowB))) return false;
    const sigs = ts.map(sig);
    if (new Set(sigs).size !== sigs.length) return false;
  }
  if (isOne(P.den)) return true;
  const all = [...unbare(P.num), ...unbare(P.den)];
  let g = 0; for (const t of all) g = gcd(g, coefAbs(t));
  if (g > 1) return false;
  const shared = varPart(all[0]).map(f => f.b).filter(b => all.every(t => varPart(t).some(f => f.b === b)));
  return shared.length === 0;
}

/* walk every term and factor, including those inside brackets */
function walkTerms(terms, ctx, fn) {
  terms.forEach((term, t) => {
    fn({ kind: 't', ...ctx, t, term, terms });
    term.f.forEach((f, i) => {
      fn({ kind: 'f', ...ctx, t, i, term, terms, f });
      if (f.k === 'p') walkTerms(f.terms, { ...ctx, depth: ctx.depth + 1 }, fn);
    });
  });
}
function walk(S, fn) { S.parts.forEach((P, p) => SIDES.forEach(side => walkTerms(P[side], { p, side, depth: 0 }, fn))); }
function locate(S, id) {
  let hit = null;
  walk(S, L => { if (!hit && (L.kind === 't' ? L.term.id : L.f.id) === id) hit = L; });
  if (hit && hit.kind === 'f') hit.i = hit.term.f.indexOf(hit.f);
  return hit;
}
const eachFactor = (S, fn) => walk(S, L => L.kind === 'f' && fn(L));
const eachTerm = (S, fn) => walk(S, L => L.kind === 't' && fn(L));
function containers(S) { const out = []; walk(S, L => { if (L.kind === 't' && !out.includes(L.terms)) out.push(L.terms); }); return out; }

/* ---- notation (HTML) ---- */
function fx(f) {
  if (f.k === 'n') return `<span class="mn">${f.v}</span>`;
  if (f.k === 'v') return `<i class="mv">${f.b}</i>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  if (f.k === 'p') return `(${sumHTML(f.terms)})${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  return `(${factorsHTML(f.f)})${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
}
const RANK = { n: 0, v: 1, g: 2, p: 3 };
function factorsHTML(fs, sort) {
  let list = fs;
  if (sort) list = [...fs].sort((a, b) => RANK[a.k] - RANK[b.k] || (a.b || '').localeCompare(b.b || ''));
  return list.map((f, i) => (i > 0 && f.k === 'n' ? '·' : '') + fx(f)).join('');
}
function termHTML(t) { return factorsHTML(t.f, tidy(t, true)); }
function sumHTML(terms) {
  return terms.map((t, i) => (i === 0 ? (t.neg ? '−' : '') : (t.neg ? ' − ' : ' + ')) + termHTML(t)).join('');
}
function fracHTML(P, showOne) {
  if (isOne(P.den) && !showOne) return sumHTML(P.num);
  return `<span class="nfrac"><span class="nn">${sumHTML(P.num)}</span><span class="nd">${sumHTML(P.den)}</span></span>`;
}
function stateHTML(S) {
  if (S.parts.length > 1 && S.op === '/')
    return `<span class="nfrac big"><span class="nn">${fracHTML(S.parts[0])}</span><span class="nd">${fracHTML(S.parts[1])}</span></span>`;
  return S.parts.map(P => fracHTML(P, S.op === '·')).join(` <span class="nop">${S.op || ''}</span> `);
}
const mx = h => `<span class="mx">${h}</span>`;
const bx = b => mx(`<i class="mv">${b}</i>`);

/* ---- moves ---- each returns {ok,p,born} after mutating, or {no,p,ids} without mutating ---- */
function opExplode(S, id) {
  const L = locate(S, id), f = L.f, arr = L.term.f;
  if (f.k === 'v') {
    if (f.e < 2) return { no: 'atom', p: { x: mx(fx(f)) }, ids: [id] };
    if (f.e > MAX_VAR) return { no: 'tooBig', ids: [id] };
    const copies = Array.from({ length: f.e }, () => V(f.b, 1));
    arr.splice(L.i, 1, ...copies);
    return { ok: 'explodeVar', p: { x: mx(fx(f)), n: f.e, b: bx(f.b), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: Object.fromEntries(copies.map(c => [c.id, [f.id]])) };
  }
  if (f.k === 'n') {
    if (f.v === 1) return { no: 'atom', p: { x: mx('1') }, ids: [id] };
    const pf = primeFactors(f.v);
    if (pf.length < 2) return { no: 'prime', p: { n: f.v }, ids: [id] };
    const parts = pf.map(N);
    arr.splice(L.i, 1, ...parts);
    return { ok: 'explodeNum', p: { n: f.v, ex: mx(pf.join(' · ')) }, born: parts.map(c => c.id), origins: Object.fromEntries(parts.map(c => [c.id, [f.id]])) };
  }
  if (f.k === 'p' && f.e >= 2) {   // (a+b)² is (a+b)·(a+b)
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    const copies = Array.from({ length: f.e }, () => Pr(f.terms.map(cloneT)));
    arr.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x: mx(fx(f)), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: Object.fromEntries(copies.map(c => [c.id, [f.id]])) };
  }
  if (f.k === 'p') {   // open the brackets: multiply everything outside with every term inside
    const before = mx(termHTML(L.term));
    const others = L.term.f.filter(g => g !== f);
    const origins = {};
    const nts = f.terms.map(it => {
      const copies = others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; });
      // inner pieces keep their identity and slide; another bracket goes behind: a(c + d), not (c + d)a
      return T([...copies.filter(c => c.k !== 'p'), ...it.f, ...copies.filter(c => c.k === 'p')], L.term.neg !== it.neg);
    });
    L.terms.splice(L.t, 1, ...nts);
    return { ok: others.length ? 'distribute' : L.term.neg ? 'unwrapNeg' : 'unwrapSum', p: { x: before, ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins, arcs: true };
  }
  if (f.e >= 2) {
    if (f.e > MAX_GROUP) return { no: 'tooBig', ids: [id] };
    const copies = Array.from({ length: f.e }, () => G(f.f.map(cloneF), 1));
    arr.splice(L.i, 1, ...copies);
    return { ok: 'explodeGroup', p: { e: f.e, x: mx(fx(f)), ex: mx(copies.map(fx).join(' · ')) }, born: copies.map(c => c.id), origins: Object.fromEntries(copies.map(c => [c.id, [f.id]])) };
  }
  const items = f.f.map(cloneF);
  arr.splice(L.i, 1, ...items);
  return { ok: 'unwrap', p: { x: mx(fx(f)), ex: mx(items.map(fx).join(' · ')) }, born: items.map(c => c.id), origins: Object.fromEntries(items.map(c => [c.id, [f.id]])) };
}

function related(x, y) { return canMerge(x, y) || (x.k === 'v' && y.k === 'v' && x.b === y.b); }
function groupHasBase(g, b) { return g.k === 'g' && g.f.some(f => f.k === 'v' && f.b === b); }

// only exactly equal pieces cancel: x³ with x³, 2 with 2
function cancelCheck(x, y) {
  if (x.k === 'v' && y.k === 'v' && x.b === y.b) {
    if (x.e === y.e) return { type: 'cancel' };
    const big = x.e > y.e ? x : y, small = big === x ? y : x;
    return { type: 'fizzle', msg: 'cancelUnequal', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
  }
  if (x.k === 'p' && y.k === 'p' && sumKey(x.terms) === sumKey(y.terms)) {
    if (x.e === y.e) return { type: 'cancel' };
    const big = x.e > y.e ? x : y, small = big === x ? y : x;
    return { type: 'fizzle', msg: 'cancelUnequal', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
  }
  if (x.k === 'n' && y.k === 'n') {
    if (x.v === y.v) return x.v === 1 ? { type: 'none' } : { type: 'cancel' };
    if (gcd(x.v, y.v) === 1) return { type: 'fizzle', msg: 'cancelCoprime', p: { a: x.v, b: y.v } };
    return { type: 'fizzle', msg: 'cancelUnequalNum', p: { a: x.v, b: y.v } };
  }
  return null;
}
const usedUp = P => isUnit(P.num) && isUnit(P.den);
function pairCheck(S, A, B) {
  const x = A.f, y = B.f;
  if (A.p !== B.p) {
    if (S.op === '=') return { type: 'fizzle', msg: 'diffSides' };   // no "move it across and flip the sign"
    if (S.op !== '·') return { type: 'fizzle', msg: 'diffFrac' };
    if (A.side === B.side) return { type: 'move' };
    const PA = S.parts[A.p], PB = S.parts[B.p];
    const single = PA[A.side].length === 1 && PB[B.side].length === 1 && !A.depth && !B.depth;
    if (single) { const cr = cancelCheck(x, y); if (cr && cr.type !== 'none') return cr; }
    return { type: 'fizzle', msg: 'crossSide' };
  }
  if (A.terms === B.terms) {
    if (A.term === B.term) return canMerge(x, y) ? { type: 'merge' } : { type: 'none' };
    if (x.k === 'p' && y.k === 'p' && canMerge(x, y)) {   // a(x+2) + 3(x+2): the same bracket in both terms
      if (x.e === y.e) return { type: 'factor', useless: false };
      const big = x.e > y.e ? x : y, small = big === x ? y : x;
      return { type: 'fizzle', msg: 'explodeFirstVar', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
    }
    if (x.k !== y.k || x.k === 'g' || x.k === 'p' || (x.k === 'v' && x.b !== y.b)) return { type: 'none' };
    const strictA = tidy(A.term), strictB = tidy(B.term);
    if (strictA && strictB && sig(A.term) === sig(B.term)) return { type: 'addTerms' };
    // not like terms: the shared piece can go outside brackets (allowed everywhere)
    if (x.k === 'n' && x.v !== y.v) {
      if (gcd(x.v, y.v) === 1) return { type: 'fizzle', msg: S.goal === 'factor' ? 'noCommon' : 'notLike', p: { a: x.v, b: y.v, v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) } };
      return { type: 'fizzle', msg: 'explodeFirst', p: { a: x.v, b: y.v } };
    }
    if (x.k === 'n' && x.v === 1) return { type: 'none' };
    if (x.k === 'v' && x.e !== y.e) {
      if (S.goal !== 'factor' && strictA && strictB) return { type: 'fizzle', msg: 'notLike', p: { v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) } };
      const big = x.e > y.e ? x : y, small = big === x ? y : x;
      return { type: 'fizzle', msg: 'explodeFirstVar', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
    }
    return { type: 'factor', useless: S.goal !== 'factor' && strictA && strictB };
  }
  if (A.side === B.side || A.depth || B.depth) {
    if (!related(x, y)) return { type: 'none' };
    if (A.side === B.side) return { type: 'fizzle', msg: 'bracketWall' };
    return { type: 'fizzle', msg: 'cancelSum' };
  }
  // across the fraction bar
  const P = S.parts[A.p];
  // a used-up fraction while multiplying: 1 over 1 cancels away, and the fraction with it
  if (S.op === '·' && usedUp(P)) return { type: 'ones' };
  const sameVar = x.k === 'v' && y.k === 'v' && x.b === y.b;
  const nums = x.k === 'n' && y.k === 'n';
  const brk = x.k === 'p' && y.k === 'p' && sumKey(x.terms) === sumKey(y.terms);
  const grp = (x.k === 'g' && (y.k === 'g' || (y.k === 'v' && groupHasBase(x, y.b)) || y.k === 'n'))
    || (y.k === 'g' && ((x.k === 'v' && groupHasBase(y, x.b)) || x.k === 'n'));
  if (!sameVar && !nums && !grp && !brk) return { type: 'none' };
  if (P.num.length > 1 || P.den.length > 1) return { type: 'fizzle', msg: 'cancelSum' };
  if (grp) return { type: 'fizzle', msg: 'cancelGroup' };
  return cancelCheck(x, y);
}

/* Putting outside brackets: only from the two terms the player tapped, only the tapped pieces.
   The sign of the first term goes in front with it, so −3x + 6 becomes −3(x − 2). */
function opFactor(S, A, B) {
  const terms = A.terms;
  const [first, second] = [A, B].sort((p, q) => terms.indexOf(p.term) - terms.indexOf(q.term));
  const set = [first.term, second.term], picked = [first.f, second.f];
  const c = cloneF(first.f), lead = first.term.neg;
  const ex = mx(sumHTML(set));
  const inner = set.map((t, i) => { t.f.splice(t.f.indexOf(picked[i]), 1); t.neg = t.neg !== lead; return cleanTerm(t); });
  const nt = T([c, Pr(inner)], lead);
  const at = terms.indexOf(set[0]);
  set.forEach(t => terms.splice(terms.indexOf(t), 1));
  terms.splice(at, 0, nt);
  const leftOne = inner.some(t => t.f.length === 1 && t.f[0].k === 'n' && t.f[0].v === 1);
  return { ok: lead ? 'factorNeg' : leftOne ? 'factorOne' : 'factor', p: { c: mx(fx(c)), ex, r: mx(termHTML(nt)) }, born: [c.id], origins: { [c.id]: picked.map(f => f.id) }, arcs: true };
}

const sgn = n => String(n).replace('-', '−');
/* Write a·x as p·x + q·x with p + q = a (the step behind the sum-product method). */
function opSplitTwo(S, tid, p) {
  const L = locate(S, tid);
  if (!L || L.kind !== 't') return null;
  const t = L.term, c = coef(t), vp = varPart(t);
  if (!tidy(t) || !vp.length || !Number.isInteger(p) || p === 0 || p === c) return { no: 'splitTwoNo', ids: [tid] };
  const q = c - p;
  const mk = k => T([...(Math.abs(k) !== 1 ? [N(Math.abs(k))] : []), ...vp.map(cloneF)], k < 0);
  const nts = [mk(p), mk(q)];
  L.terms.splice(L.t, 1, ...nts);
  return { ok: 'splitTwo', p: { x: mx(sumHTML([t])), ex: mx(sumHTML(nts)), a: sgn(p), b: q < 0 ? `(${sgn(q)})` : q, c: sgn(c) }, born: nts.flatMap(n => n.f.map(f => f.id)) };
}

function opPair(S, aId, bId) {
  const A = locate(S, aId), B = locate(S, bId);
  const r = pairCheck(S, A, B);
  if (r.type === 'fizzle') return { no: r.msg, p: r.p || {}, ids: [aId, bId] };
  if (r.type === 'none') return null;
  if (r.type === 'move') return opMove(S, A, B);
  if (r.type === 'ones') {
    const P = S.parts[A.p], other = S.parts[1 - A.p];
    if (P.num[0].neg !== P.den[0].neg) negate(other.num);   // −1 over 1: the minus goes to the other fraction
    S.parts.splice(A.p, 1);
    return { ok: 'cancelOnes', cancel: true };
  }
  if (r.type === 'factor') {
    const v1 = mx(termHTML(A.term)), v2 = mx(termHTML(B.term));
    const res = opFactor(S, A, B);
    if (r.useless) { res.ok = 'factorUseless'; res.p.v1 = v1; res.p.v2 = v2; }
    return res;
  }
  if (r.type === 'addTerms') {
    const vp = varPart(A.term);
    const res = termPair(S, A.term.id, B.term.id);
    if (res.ok === 'likeAdd' && vp.length) {
      const one = factorsHTML(vp), sq = factorsHTML(vp.map(f => V(f.b, f.e * 2)));
      res.p.extra = { v: mx(one), two: mx('2' + one), sq: mx(sq) };
      res.ok = 'likeAddTap';
    }
    return res;
  }
  const x = A.f, y = B.f;
  if (r.type === 'merge') {
    const m = mergeF(x, y);
    const arr = A.term.f;
    arr.splice(A.i, 1, m);
    arr.splice(arr.indexOf(y), 1);
    const origins = { [m.id]: [x.id, y.id] };
    if (x.k === 'v') return { ok: 'mergeVar', p: { x: mx(fx(x)), y: mx(fx(y)), r: mx(fx(m)), b: bx(x.b), m: x.e, n: y.e, s: m.e }, born: [m.id], origins };
    if (x.k === 'n') return { ok: 'mergeNum', p: { x: x.v, y: y.v, r: m.v }, born: [m.id], origins };
    return { ok: 'mergeGroup', p: { x: mx(fx(x)), y: mx(fx(y)), r: mx(fx(m)) }, born: [m.id], origins };
  }
  // cancel
  const shown = mx(fx(x));
  if (x.k === 'n') { x.v = 1; y.v = 1; } else { x.e = 0; y.e = 0; }
  return { ok: 'cancelVar', p: { x: shown }, cancel: true };
}

function opGather(S, id) {
  const L = locate(S, id), arr = L.term.f;
  const same = arr.filter(f => canMerge(L.f, f));
  if (same.length < 2) return { no: 'nothingGather', p: { x: mx(fx(L.f)) }, ids: [id] };
  const r = same.reduce((a, b) => mergeF(a, b));
  const first = arr.indexOf(same[0]);
  const ex = mx(same.map(fx).join(' · '));
  L.term.f = arr.filter(f => !same.includes(f));
  L.term.f.splice(first, 0, r);
  return { ok: 'gather', p: { ex, r: mx(fx(r)) }, born: [r.id], origins: { [r.id]: same.map(f => f.id) } };
}

function addTermsIn(terms, list) {
  const rest = list[0].f.filter(f => f.k !== 'n');
  const total = list.reduce((s, t) => s + coef(t), 0);
  const ex = mx(sumHTML(list));
  const at = terms.indexOf(list[0]);
  list.forEach(t => terms.splice(terms.indexOf(t), 1));
  if (total === 0) { if (!terms.length) terms.push(T([N(0)])); return { ex, r: '0', born: [], nt: null }; }
  const nf = [], origins = {};
  if (Math.abs(total) !== 1 || !rest.length) {
    const n = N(Math.abs(total)); nf.push(n);
    origins[n.id] = list.map(t => (t.f.find(f => f.k === 'n') || t.f[0]).id);
  }
  rest.forEach((f, k) => {
    const cf = cloneF(f); nf.push(cf);
    origins[cf.id] = list.map(t => t.f.filter(g => g.k !== 'n')[k]).filter(Boolean).map(g => g.id);
  });
  const nt = T(nf, total < 0);
  terms.splice(Math.min(at, terms.length), 0, nt);
  return { ex, r: mx(sumHTML([nt])), born: nf.map(f => f.id), nt, origins };
}

/* A sweep is accepted only as ONE valid move: group matching pieces inside one term,
   or add like terms by sweeping one matching piece in each. Otherwise nothing happens. */
function opSweep(S, ids) {
  const locs = ids.map(id => locate(S, id)).filter(L => L && L.kind === 'f' && L.f.k !== 'p');
  if (locs.length < 2) return null;
  const all = locs.map(L => L.f.id);
  const first = locs[0].f;
  if (!locs.every(L => canMerge(first, L.f)))
    return { no: 'sweepMixed', p: { list: mx(locs.map(L => fx(L.f)).join(' , ')) }, ids: all };
  const terms = [...new Set(locs.map(L => L.term))];
  if (terms.length === 1) {
    const term = terms[0], same = locs.map(L => L.f);
    const r = same.reduce((a, b) => mergeF(a, b));
    const at = Math.min(...same.map(f => term.f.indexOf(f)));
    const ex = mx(same.map(fx).join(' · '));
    term.f = term.f.filter(f => !same.includes(f));
    term.f.splice(at, 0, r);
    return { ok: 'gather', p: { ex, r: mx(fx(r)) }, born: [r.id], origins: { [r.id]: same.map(f => f.id) } };
  }
  if (terms.length !== locs.length || !locs.every(L => L.terms === locs[0].terms))
    return { no: 'sweepSplit', ids: all };
  if (!terms.every(t => tidy(t))) return { no: 'untidy', ids: all };
  if (new Set(terms.map(sig)).size > 1) return { no: 'sweepTerms', ids: all };
  const container = locs[0].terms;
  terms.sort((a, b) => container.indexOf(a) - container.indexOf(b));
  const r = addTermsIn(container, terms);
  if (!r.nt) return { ok: 'likeZero', p: { ex: r.ex } };
  return { ok: 'sweepAdd', p: { ex: r.ex, r: r.r }, born: r.born, origins: r.origins };
}

function termPair(S, aId, bId) {
  const A = locate(S, aId), B = locate(S, bId);
  if (A.p !== B.p) return { no: S.op === '=' ? 'diffSides' : 'diffFrac', ids: [aId, bId] };
  if (A.terms !== B.terms) return { no: A.side !== B.side ? 'termSide' : 'bracketWall', ids: [aId, bId] };
  if (!tidy(A.term) || !tidy(B.term)) return { no: 'untidy', ids: [aId, bId] };
  if (sig(A.term) !== sig(B.term)) return { no: 'notLike', p: { v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) }, ids: [aId, bId] };
  const vp = varPart(A.term);
  const r = addTermsIn(A.terms, [A.term, B.term].sort((a, b) => A.terms.indexOf(a) - A.terms.indexOf(b)));
  if (!r.nt) return { ok: 'likeZero', p: { ex: r.ex } };
  return { ok: 'likeAdd', p: { v: vp.length ? mx(factorsHTML(vp)) : '1', ex: r.ex, r: r.r }, born: r.born, origins: r.origins };
}

function flipPart(P) { [P.num, P.den] = [P.den, P.num]; return [...P.num, ...P.den].flatMap(t => t.f.map(f => f.id)); }
// (A/1)·(1/B) or (1/B)·(A/1): every top piece sits in one fraction and every bottom piece in the other
function joinable(S) {
  if (S.parts.length !== 2 || S.op !== '·') return null;
  const [P, Q] = S.parts;
  if (isUnit(P.den) && isUnit(Q.num)) return { top: P, bottom: Q };
  if (isUnit(P.num) && isUnit(Q.den)) return { top: Q, bottom: P };
  return null;
}
function opOp(S) {
  if (S.parts.length < 2 || S.op === '=') return null;
  if (S.op === '/') { S.op = ':'; return { ok: 'toDiv' }; }
  if (S.op === ':') { const born = flipPart(S.parts[1]); S.op = '·'; return { ok: 'flip', born }; }
  // tops times tops, bottoms times bottoms: with only 1's left to multiply by, the two fractions become one
  const j = joinable(S);
  if (j) {
    const ones = [j.top.den[0], j.bottom.num[0]].filter(t => t.neg).length;
    S.parts = [F(j.top.num, j.bottom.den)];
    if (ones % 2) negate(S.parts[0].num);
    return { ok: 'joined' };
  }
  const born = flipPart(S.parts[1]); S.op = '/';
  return { ok: 'toBar', born };
}
// tapping the bar of a single fraction writes it as top : bottom
function opBar(S) {
  if (S.parts.length !== 1 || isOne(S.parts[0].den)) return null;
  const P = S.parts[0];
  S.parts = [F(P.num), F(P.den)];
  S.op = ':';
  return { ok: 'toDiv' };
}
// multiplying fractions by hand: move a piece into the same row of the other fraction
function opMove(S, A, B) {
  const src = S.parts[A.p][A.side];
  let moving, whole = false;
  const label = mx(src.length > 1 || A.depth > 0 ? '(' + sumHTML(src) + ')' : fx(A.f));
  if (src.length > 1 || A.depth > 0) {
    moving = [src.length > 1 ? Pr(src.map(cloneT)) : null].filter(Boolean);
    if (src.length === 1) moving = src[0].f.map(cloneF);   // a single term that contains a bracket: move the whole term
    const neg = src.length === 1 && src[0].neg;
    S.parts[A.p][A.side] = [T([N(1)], neg)];
    whole = true;
  } else {
    const t = src[0];
    t.f.splice(t.f.indexOf(A.f), 1);
    if (!t.f.length) t.f = [N(1)];
    moving = [A.f];
  }
  const dst = S.parts[B.p][B.side];
  let target, at;
  if (dst.length > 1) { target = T([Pr(dst)]); S.parts[B.p][B.side] = [target]; at = target.f.length; }
  else { target = dst[0]; at = B.depth === 0 ? target.f.indexOf(B.f) + 1 : target.f.length; }
  target.f.splice(at, 0, ...moving);
  return { ok: whole ? 'moveWhole' : (A.side === 'num' ? 'moveNum' : 'moveDen'), p: { x: label }, born: moving.map(f => f.id) };
}

function partnersOf(S, sel) {
  const out = new Set();
  if (!sel) return out;
  const A = locate(S, sel.id);
  if (!A) return out;
  if (sel.t === 'f') {
    eachFactor(S, B => {
      if (B.f.id === sel.id) return;
      const r = pairCheck(S, A, B);
      if (r.type === 'merge' || r.type === 'cancel' || r.type === 'move' || r.type === 'addTerms' || (r.type === 'factor' && !r.useless)) out.add(B.f.id);
    });
  } else {
    eachTerm(S, B => {
      if (B.term.id === sel.id || B.terms !== A.terms) return;
      if (tidy(A.term) && tidy(B.term) && sig(A.term) === sig(B.term)) out.add(B.term.id);
    });
  }
  return out;
}

/* ---- factor goal hints ---- */
// which terms to take something out of next: the terms without a bracket when some term already has one
// (x(x+2) + 3x + 6 → work on 3x + 6), or the first pair of a sum split into four (x² + 2x + 3x + 6)
function factorFocus(ts) {
  const withP = ts.filter(t => t.f.some(f => f.k === 'p'));
  if (withP.length) { const rest = ts.filter(t => !withP.includes(t)); return rest.length >= 2 ? rest : ts; }
  return ts.length === 4 ? ts.slice(0, 2) : ts;
}
const numProd = t => t.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);
function factorHint(S) {
  for (const ts of containers(S)) {
    if (ts.length < 2) continue;
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++)
      for (const a of ts[i].f) for (const b of ts[j].f)
        if (a.k === 'p' && b.k === 'p' && canMerge(a, b) && a.e === b.e) return { k: 'hFactor', p: { x: mx(fx(a)), y: mx(fx(b)) }, ids: [a.id, b.id] };
    const focus = factorFocus(ts);
    // a piece that is exactly in every one of these terms
    for (const a of focus[0].f) {
      if (!((a.k === 'n' && a.v > 1) || a.k === 'v')) continue;
      const match = t => t.f.find(f => f.k === a.k && (a.k === 'n' ? f.v === a.v : f.b === a.b && f.e === a.e));
      if (focus.every(match)) { const b = match(focus[1]); return { k: 'hFactor', p: { x: mx(fx(a)), y: mx(fx(b)) }, ids: [a.id, b.id] }; }
    }
    // a factor they share but that is hidden inside a bigger number or power: explode it
    const g = focus.reduce((g, t) => gcd(g, numProd(t)), 0);
    if (g > 1) {
      const p = primeFactors(g)[0];
      for (const t of focus) {
        if (t.f.some(f => f.k === 'n' && f.v === p)) continue;
        const n = t.f.find(f => f.k === 'n' && f.v % p === 0);
        if (n) return { k: 'hExplodeFor', p: { x: n.v, p }, ids: [n.id] };
      }
    }
    for (const v of varPart(focus[0])) {
      if (!focus.every(t => varPart(t).some(w => w.b === v.b))) continue;
      for (const t of focus) {
        if (t.f.some(f => f.k === 'v' && f.b === v.b && f.e === 1)) continue;
        const big = t.f.find(f => f.k === 'v' && f.b === v.b);
        return { k: 'hExplodeVar', p: { x: mx(fx(big)), y: mx(termHTML(focus.find(u => u !== t))), b: bx(v.b) }, ids: [big.id] };
      }
    }
  }
  return null;
}
// x² + 5x + 6: two numbers with product 6 and sum 5 tell how to split 5x, so the four terms factor in pairs.
// Returns the split for a sum written as ax² + bx + c, or null when there is none with whole numbers.
function quadSplit(ts) {
  if (ts.length !== 3 || !ts.every(t => tidy(t)) || ts.some(t => t.f.some(f => f.k === 'p'))) return null;
  const vs = ts.map(varPart);
  if (vs[2].length || vs[0].length !== 1 || vs[1].length !== 1) return null;
  const [sq, lin] = [vs[0][0], vs[1][0]];
  if (sq.b !== lin.b || sq.e !== 2 || lin.e !== 1) return null;
  const a = coef(ts[0]), b = coef(ts[1]), c = coef(ts[2]);
  if (a < 1 || gcd(gcd(a, b), c) > 1) return null;
  const inner = (u, v) => { const g = gcd(u, v) * Math.sign(u); return u / g + ',' + v / g; };
  for (let p = -Math.abs(a * c); p <= Math.abs(a * c); p++) {
    const q = b - p;
    if (!p || !q || p * q !== a * c) continue;
    if (inner(a, p) === inner(q, c)) return { a, b, c, p, q };   // this order leaves the same bracket twice
  }
  return null;
}
function sumProductHint(S) {
  for (const ts of containers(S)) {
    const q = quadSplit(ts);
    if (q) return { k: 'hSumProduct', p: { x: mx(termHTML(ts[1])), prod: q.a * q.c, sum: q.b, a: q.p, b: q.q }, ids: [ts[1].id], split: q.p };
  }
  return null;
}

function hint(S) {
  if (S.op === '=') return eqHint(S);
  if (S.parts.length > 1) {
    if (S.op === '/') return { k: 'hBar', ids: ['op'] };
    if (S.op === ':') return { k: 'hDiv', ids: ['op'] };
    const [P1, P2] = S.parts;
    if (S.op === '·') for (const P of S.parts)
      if (usedUp(P)) return { k: 'hCancelOnes', ids: [P.num[0].f[0].id, P.den[0].f[0].id] };
    for (const [a, b] of [[P1.num, P2.den], [P2.num, P1.den]]) {
      if (a.length !== 1 || b.length !== 1) continue;
      for (const x of a[0].f) for (const y of b[0].f)
        if (cancelCheck(x, y)?.type === 'cancel') return { k: 'hCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
    }
    if (joinable(S)) return { k: 'hJoin', ids: ['op'] };
    for (const side of SIDES) {
      const src = P2[side], dst = P1[side];
      if (isUnit(src)) continue;
      const x = src[0].f[0], y = dst[0].f[0];
      return { k: 'hMove', p: { x: mx(src.length > 1 ? '(' + sumHTML(src) + ')' : fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
    }
  }
  const P = S.parts[0];
  let h = null;
  eachFactor(S, L => {
    if (h) return;
    if (L.f.k === 'g' || (L.f.k === 'p' && L.f.e > 1 && S.goal !== 'factor')) h = { k: 'hGroup', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
  });
  if (h) return h;
  if (P.num.length === 1 && P.den.length === 1 && !isOne(P.den)) {
    const a = P.num[0], b = P.den[0];
    for (const x of a.f) for (const y of b.f)
      if (cancelCheck(x, y)?.type === 'cancel') return { k: 'hCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids: [x.id, y.id] };
    for (const x of a.f) for (const y of b.f) {
      const cr = cancelCheck(x, y);
      if (!cr || cr.type !== 'fizzle' || cr.msg === 'cancelCoprime') continue;
      const ids = x.k === 'v' ? [(x.e > y.e ? x : y).id] : [x, y].filter(f => primeFactors(f.v).length > 1).map(f => f.id);
      return { k: 'hExplodeCancel', p: { x: mx(fx(x)), y: mx(fx(y)) }, ids };
    }
  }
  if (S.goal === 'factor') { h = factorHint(S); if (h) return h; }
  eachTerm(S, L => {
    const t = L.term;
    for (let i = 0; !h && i < t.f.length; i++) for (let j = i + 1; !h && j < t.f.length; j++)
      // (a+b)·(a+b) only folds back into (a+b)² when the goal is to factor; to simplify, it gets opened
      if (canMerge(t.f[i], t.f[j]) && (t.f[i].k !== 'p' || S.goal === 'factor')) h = { k: 'hMerge', p: { x: mx(fx(t.f[i])), y: mx(fx(t.f[j])) }, ids: [t.f[i].id, t.f[j].id] };
  });
  if (h) return h;
  const pick = t => t.f.find(f => f.k === 'v') || t.f[0];
  for (const ts of containers(S))
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++)
      if (tidy(ts[i]) && tidy(ts[j]) && sig(ts[i]) === sig(ts[j]))
        return { k: 'hLike', p: { x: mx(termHTML(ts[i])), y: mx(termHTML(ts[j])) }, ids: [pick(ts[i]).id, (ts[j].f.find(f => f.k === 'v' && f.b === pick(ts[i]).b) || pick(ts[j])).id] };
  if (S.goal === 'factor') { h = sumProductHint(S); if (h) return h; }
  if (S.goal !== 'factor' && !S.allowB) {
    eachFactor(S, L => { if (!h && L.f.k === 'p') h = { k: 'hOpen', p: { x: mx(termHTML(L.term)) }, ids: [L.f.id] }; });
    if (h) return h;
  }
  return { k: 'hDone', ids: [] };
}

/* ---- equations: the balance method ----
   S = { parts: [left, right], op: '=', goal: 'solve' }. Each side keeps every simplifying move.
   A term only crosses the = by doing the same thing to both sides (opBalance); tapping a piece on
   one side and then one on the other is refused (diffSides). */
const BOPS = { '+': '+', '-': '−', '·': '·', ':': ':' };
const letters = S => { const bs = new Set(); eachFactor(S, L => { if (L.f.k === 'v') bs.add(L.f.b); }); return [...bs]; };
const isZeroSide = side => side.length === 1 && side[0].f.length === 1 && side[0].f[0].k === 'n' && side[0].f[0].v === 0;
// v: a monomial Term (its sign counts). op: '+', '-', '·', ':'
function opBalance(S, op, v) {
  if (S.op !== '=' || !v || !v.f || !v.f.length) return null;
  const vNum = v.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);
  const shown = mx((v.neg ? '−' : '') + factorsHTML(v.f, true));
  if (v.f.some(f => f.k === 'p' || f.k === 'g')) return { no: 'balanceShape', ids: ['op'] };
  if (vNum === 0) return { no: op === ':' ? 'balanceDivZero' : op === '·' ? 'balanceMulZero' : 'balanceNothing', ids: ['op'] };
  const born = [];
  if (op === '+' || op === '-') {
    if (S.parts.some(P => !isOne(P.den))) return { no: 'balanceFrac', ids: ['op'] };
    for (const P of S.parts) {
      const t = cloneT(v); if (op === '-') t.neg = !t.neg;
      born.push(...t.f.map(f => f.id));
      if (isZeroSide(P.num)) P.num = [t]; else P.num.push(t);
    }
  } else {
    if (v.f.some(f => f.k === 'v')) return { no: 'balanceLetter', p: { v: shown }, ids: ['op'] };
    if (vNum === 1 && !v.neg) return { no: 'balanceOne', ids: ['op'] };
    for (const P of S.parts) {
      const side = op === '·' ? 'num' : 'den';
      const c = N(vNum); born.push(c.id);
      const ts = P[side];
      if (op === ':' && isOne(ts)) P[side] = [T([c], v.neg)];
      else if (ts.length === 1) { ts[0].f.unshift(c); if (v.neg) ts[0].neg = !ts[0].neg; }
      else P[side] = [T([c, Pr(ts)], v.neg)];   // a sum gets multiplied as a whole: 2(x + 1)
    }
  }
  const sides = S.parts.map(P => fracHTML(P));
  return { ok: 'balance', p: { op: BOPS[op], v: shown, ex: mx(sides.join(' = ')) }, born };
}
function opSwap(S) {
  if (S.op !== '=') return null;
  S.parts.reverse();
  return { ok: 'swapSides', p: { ex: mx(S.parts.map(P => fracHTML(P)).join(' = ')) } };
}
// dragging a piece across the = undoes what it does on its side, on both sides:
//   a term in a sum → take it away (3x + 5: drag 5 → − 5), the number in 3x → divide by 3,
//   what is below the bar → multiply by it, a lone −x → divide by −1
function dragBalance(S, id) {
  if (S.op !== '=') return null;
  for (const P of S.parts) for (const side of SIDES) for (const top of P[side]) {
    let L = null;
    walkTerms([top], { depth: 0 }, M => { if (!L && (M.kind === 't' ? M.term.id : M.f.id) === id) L = M; });
    if (!L) continue;
    const ts = P[side];
    if (side === 'den') return ts.length === 1 ? { op: '·', value: T(top.f.map(cloneF), top.neg) } : { no: 'dragDenSum' };
    const whole = { op: top.neg ? '+' : '-', value: T(top.f.map(cloneF)) };
    if (ts.length > 1 || L.kind === 't') return whole;
    // the only term on its side: a number in front divides, a lone minus divides by −1, anything else takes the term away
    if (L.depth === 0 && L.f.k === 'n' && top.f.length > 1) return { op: ':', value: T([N(L.f.v)], top.neg) };
    if (top.neg && !top.f.some(f => f.k === 'n')) return { op: ':', value: T([N(1)], true) };
    return whole;
  }
  return null;
}
function opDrag(S, id) {
  const d = dragBalance(S, id);
  if (!d) return null;
  if (d.no) return { no: d.no, ids: [id] };
  if ((d.op === '+' || d.op === '-') && d.value.f.some(f => f.k === 'p' || f.k === 'g')) return { no: 'dragBracket', ids: [id] };
  const r = opBalance(S, d.op, d.value);
  if (r && r.no) r.ids = [id, ...(r.ids || [])];
  return r;
}
// solved: one side is the letter on its own, the other side a clean value without it
function isSolved(S) {
  if (S.op !== '=' || S.parts.length !== 2) return false;
  return S.parts.some((P, i) => {
    const t = P.num[0];
    if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1 || t.f[0].k !== 'v' || t.f[0].e !== 1) return false;
    const other = S.parts[1 - i], b = t.f[0].b;
    let has = false; walkTerms([...other.num, ...other.den], { depth: 0 }, L => { if (L.kind === 'f' && L.f.k === 'v' && L.f.b === b) has = true; });
    return !has && isClean({ parts: [other], op: null, goal: 'simplify' });
  });
}
const sideView = P => ({ parts: [P], op: null, goal: 'simplify' });
function eqHint(S) {
  if (isSolved(S)) return { k: 'hDone', ids: [] };
  // first tidy each side with the usual moves
  for (const P of S.parts) { const h = hint(sideView(P)); if (h.k !== 'hDone') return h; }
  const [L, R] = S.parts, bs = letters(S);
  if (bs.length !== 1) return { k: 'hDone', ids: [] };
  const b = bs[0];
  const hasX = t => { let h = false; walkTerms([t], { depth: 0 }, M => { if (M.kind === 'f' && M.f.k === 'v' && M.f.b === b) h = true; }); return h; };
  const monoOf = t => T(t.f.map(cloneF));
  // the piece to drag: the term, or on a side of its own a non-number tile (dragging the 3 of 3x would divide)
  const take = (t, side, terms) => {
    const id = terms.length > 1 ? t.id : (t.f.find(f => f.k !== 'n') || t.f[0]).id;
    return { k: 'hBalanceTerm', p: { x: mx(sumHTML([t])), op: t.neg ? '+' : '−', v: mx(termHTML(t)), side }, ids: [id, 'op'], drag: id, balance: { op: t.neg ? '+' : '-', value: monoOf(t) } };
  };
  // a fraction: multiply both sides by what is below the bar
  for (const P of S.parts) if (!isOne(P.den)) {
    if (P.den.length !== 1 || P.den[0].f.some(f => f.k !== 'n')) return { k: 'hDone', ids: [] };
    const d = P.den[0];
    return { k: 'hBalanceMul', p: { v: mx(termHTML(d)) }, ids: [d.f[0].id, 'op'], drag: d.f[0].id, balance: { op: '·', value: T(d.f.map(cloneF), d.neg) } };
  }
  // letters to the left, numbers to the right
  if (!L.num.some(hasX) && R.num.some(hasX)) return { k: 'hSwap', p: { b: bx(b) }, ids: ['op'] };
  const xR = R.num.find(hasX);
  if (xR) return take(xR, 'right', R.num);
  const cL = L.num.find(t => !hasX(t));
  if (cL && !isZeroSide([cL])) return take(cL, 'left', L.num);
  // a·x = c: divide both sides by a
  if (L.num.length === 1) {
    const t = L.num[0], n = t.f.filter(f => f.k === 'n');
    const rest = t.f.filter(f => f.k !== 'n');
    if (rest.length === 1 && rest[0].k === 'v' && rest[0].e === 1 && (n.length || t.neg)) {
      const a = n.reduce((p, f) => p * f.v, 1);
      return { k: 'hBalanceDiv', p: { x: mx(sumHTML([t])), v: mx((t.neg ? '−' : '') + a) }, ids: [(n[0] || rest[0]).id, 'op'], drag: (n[0] || rest[0]).id, balance: { op: ':', value: T([N(a)], t.neg) } };
    }
  }
  return { k: 'hDone', ids: [] };
}

/* ---- levels ---- */
const LEVELS = [
  { s: () => ({ parts: [F([T([V('a'), V('a'), V('a')])])] }),
    en: 'Three <i>a</i>’s are lying around. Tap one <i>a</i>, then tap another <i>a</i> to stick them together. Keep going until the mess is gone.',
    nl: 'Er slingeren drie <i>a</i>’s rond. Tik op een <i>a</i> en dan op een andere <i>a</i> om ze samen te voegen. Ga door tot alles is opgeruimd.' },
  { s: () => ({ parts: [F([T([V('a', 2), V('a', 3)])])] }),
    en: '<i>a</i><sup>2</sup> is just <i>a</i> · <i>a</i>. Tap <i>a</i><sup>2</sup> twice to explode it and see for yourself. Then clean up.',
    nl: '<i>a</i><sup>2</sup> is gewoon <i>a</i> · <i>a</i>. Tik twee keer op <i>a</i><sup>2</sup> om hem te laten ontploffen. Ruim daarna alles op.' },
  { s: () => ({ parts: [F([T([G([V('a', 2)], 3)])])] }),
    en: 'A power of a power. Explode the bracket and see what happens to what’s inside. Tip: swipe across a row of matching tiles to group them in one go.',
    nl: 'Een macht van een macht. Laat het haakje ontploffen en kijk wat er met de inhoud gebeurt. Tip: veeg over een rij passende tegels om ze in één keer te groeperen.' },
  { s: () => ({ parts: [F([T([N(2), V('a'), N(3), V('a', 2)])])] }),
    en: 'Numbers combine too: tap 2, then tap 3.',
    nl: 'Getallen kun je ook samenvoegen: tik op 2 en dan op 3.' },
  { s: () => ({ parts: [F([T([V('a')]), T([V('a')]), T([N(3), V('a')])])] }),
    en: 'Now there are + signs. Tap an <i>a</i>, then another <i>a</i>. Watch what happens: is it the same as before?',
    nl: 'Nu staan er plustekens. Tik op een <i>a</i> en dan op een andere <i>a</i>. Let op wat er gebeurt: is het hetzelfde als eerst?' },
  { s: () => ({ parts: [F([T([N(4), V('a', 2)]), T([N(2), V('a', 3)]), T([V('a', 2)])])] }),
    en: 'Not every pair of terms can be added. Find out which ones belong together.',
    nl: 'Niet alle termen kun je optellen. Zoek uit welke bij elkaar horen.' },
  { s: () => ({ parts: [F([T([G([N(3), V('a')], 2)])])] }),
    en: 'Careful: everything inside the bracket gets squared, the 3 too.',
    nl: 'Let op: alles in het haakje wordt gekwadrateerd, ook de 3.' },
  { s: () => ({ parts: [F([T([V('a', 7)])], [T([V('a', 3)])])] }),
    en: 'A fraction! Exactly the same piece on top and below cancels out. <i>a</i><sup>7</sup> and <i>a</i><sup>3</sup> aren’t the same: explode <i>a</i><sup>7</sup>, regroup three <i>a</i>’s into <i>a</i><sup>3</sup>, and cancel that.',
    nl: 'Een breuk! Precies hetzelfde stuk boven en onder streep je tegen elkaar weg. <i>a</i><sup>7</sup> en <i>a</i><sup>3</sup> zijn niet hetzelfde: laat <i>a</i><sup>7</sup> ontploffen, maak van drie <i>a</i>’s weer <i>a</i><sup>3</sup>, en streep die weg.' },
  { s: () => ({ parts: [F([T([N(12), V('a', 5)])], [T([N(4), V('a', 2)])])] }),
    en: 'Numbers cancel too, but again only when they are exactly equal. Explode 12 and 4 to find the pieces they share.',
    nl: 'Getallen kun je ook wegstrepen, maar ook weer alleen als ze precies gelijk zijn. Laat 12 en 4 ontploffen om te vinden wat ze delen.' },
  { s: () => ({ parts: [F([T([N(6), V('a', 2), V('b'), N(2), V('a'), V('b', 3)])])] }),
    en: 'Two letters now. Only matching letters combine.',
    nl: 'Nu twee letters. Alleen dezelfde letters kun je samenvoegen.' },
  { s: () => ({ parts: [F([T([G([N(2), V('a'), V('b', 2)], 3)])], [T([N(4), V('a', 2), V('b')])])] }),
    en: 'Explode, unpack, combine, cancel. You know all the moves now.',
    nl: 'Ontploffen, uitpakken, samenvoegen, wegstrepen. Je kent nu alle zetten.' },
  { book: true, s: () => ({ parts: [F([T([N(3), G([V('a', 4)], 3)]), T([N(5), G([V('a', 2)], 6)], true)])] }),
    en: 'Two terms with brackets. Clean up each term first.',
    nl: 'Twee termen met haakjes. Ruim eerst elke term apart op.' },
  { book: true, s: () => ({ parts: [F([T([N(2), V('a'), N(5), G([V('a', 3)], 3)], true)])] }),
    en: 'One long term. The minus sign stays in front of it the whole time.',
    nl: 'Eén lange term. Het minteken blijft de hele tijd vooraan staan.' },
  { book: true, s: () => ({ parts: [F([T([N(8), V('x')])], [T([N(3), V('y')])]), F([T([N(3), V('x')])], [T([V('y')])])], op: ':' }),
    en: 'Dividing fractions. Tap the : to turn it into ·, then multiply the two fractions by hand: tap a piece in one fraction, then a piece in the same row of the other.',
    nl: 'Breuken delen. Tik op de : om er een · van te maken, en vermenigvuldig de breuken dan met de hand: tik op een stuk in de ene breuk en dan op een stuk in dezelfde rij van de andere.' },
  { book: true, s: () => ({ parts: [F([T([N(16), G([V('a', 3)], 4)]), T([G([N(3), V('a', 6)], 2)])], [T([N(5), V('a', 3)])])] }),
    en: 'The big one. Watch out: you may only cancel once the top is one single term.',
    nl: 'De grote. Let op: wegstrepen mag pas als de teller één term is.' },
  { s: () => ({ parts: [F([T([N(5), Pr([T([V('a')]), T([N(2)])])]), T([N(3), V('a')])])] }),
    en: 'Brackets with a sum inside. Tap the brackets twice to open them up.',
    nl: 'Haakjes met een som erin. Tik twee keer op de haakjes om ze weg te werken.' },
  { s: () => ({ parts: [F([T([Pr([T([V('x')]), T([N(3)], true)])], true), T([N(2), V('x')])])] }),
    en: 'A minus in front of brackets. It means −1 times everything inside. Open the brackets and watch the signs.',
    nl: 'Een min voor de haakjes. Dat betekent −1 keer alles erin. Werk de haakjes weg en let op de tekens.' },
  { s: () => ({ parts: [F([T([Pr([T([V('x')]), T([N(3)])]), Pr([T([V('x')]), T([N(2)])])])])] }),
    en: 'Two brackets next to each other. Tap the first one twice: each term in it multiplies the whole other bracket. Then open those too.',
    nl: 'Twee haakjes naast elkaar. Tik twee keer op de eerste: elke term erin gaat keer het hele andere haakje. Werk die daarna ook weg.' },
  { s: () => ({ parts: [F([T([Pr([T([V('a')]), T([V('b')])], 2)])])] }),
    en: 'Lots of people think (<i>a</i> + <i>b</i>)<sup>2</sup> = <i>a</i><sup>2</sup> + <i>b</i><sup>2</sup>. Explode the square and find out what it really is.',
    nl: 'Veel mensen denken dat (<i>a</i> + <i>b</i>)<sup>2</sup> = <i>a</i><sup>2</sup> + <i>b</i><sup>2</sup>. Laat het kwadraat ontploffen en ontdek wat het echt is.' },
  { goal: 'factor', s: () => ({ parts: [F([T([N(2), V('x')]), T([N(2), V('y')])])] }),
    en: 'New goal: put what the terms share <b>outside the brackets</b>. Both terms contain a 2. Tap one 2, then the other.',
    nl: 'Nieuw doel: breng wat de termen gemeen hebben <b>buiten haakjes</b>. Beide termen bevatten een 2. Tik op de ene 2 en dan op de andere.' },
  { goal: 'factor', s: () => ({ parts: [F([T([N(6), V('a')]), T([N(9), V('b')])])] }),
    en: '6 and 9 aren’t the same number, so neither can go in front as it is. Explode both to find the factor they share.',
    nl: '6 en 9 zijn niet hetzelfde getal, dus geen van beide kan zo voor de haakjes. Laat ze allebei ontploffen om te vinden welke factor ze delen.' },
  { goal: 'factor', s: () => ({ parts: [F([T([N(3), V('x', 2)]), T([V('x')])])] }),
    en: 'Put the <i>x</i> outside the brackets. Only exact matches can go out, so explode <i>x</i><sup>2</sup> first. Watch what stays behind.',
    nl: 'Breng de <i>x</i> buiten haakjes. Alleen precies gelijke stukken mogen eruit, dus laat <i>x</i><sup>2</sup> eerst ontploffen. Let op wat er overblijft.' },
  { goal: 'factor', s: () => ({ parts: [F([T([N(4), V('a', 2), V('b')]), T([N(6), V('a'), V('b', 2)])])] }),
    en: 'These terms share three things. Take them out one at a time. You can keep going inside the brackets.',
    nl: 'Deze termen hebben drie dingen gemeen. Haal ze er één voor één uit. Je kunt binnen de haakjes gewoon verder.' },
  { goal: 'factor', s: () => ({ parts: [F([T([V('a'), Pr([T([V('x')]), T([N(2)])])]), T([N(3), Pr([T([V('x')]), T([N(2)])])])])] }),
    en: 'A whole bracket can be a shared factor too. Both terms contain (<i>x</i> + 2): tap one bracket, then the other.',
    nl: 'Een heel haakje kan ook een gemeenschappelijke factor zijn. Beide termen bevatten (<i>x</i> + 2): tik op het ene haakje en dan op het andere.' },
  { goal: 'factor', s: () => ({ parts: [F([T([V('x', 2)]), T([N(5), V('x')]), T([N(6)])])] }),
    en: 'Nothing is in all three terms. Find two numbers that multiply to 6 and add up to 5. Tap 5<i>x</i>, press the button 5<i>x</i> = … + …, and choose two terms. Then take things outside brackets two terms at a time.',
    nl: 'Er zit niets in alle drie de termen. Zoek twee getallen die keer elkaar 6 zijn en opgeteld 5. Tik op 5<i>x</i>, druk op de knop 5<i>x</i> = … + … en kies twee termen. Breng daarna steeds twee termen buiten haakjes.' },
  { goal: 'factor', book: true, s: () => ({ parts: [F([T([V('x', 2)]), T([V('x')], true), T([N(12)], true)])] }),
    en: 'Now with minus signs: the product is −12, the sum is −1. One of the two numbers is negative.',
    nl: 'Nu met mintekens: het product is −12, de som is −1. Een van de twee getallen is negatief.' },
  { goal: 'solve', s: () => parseProblem('x+3=7').S,
    en: 'An equation is a balance: both sides weigh the same. Get <i>x</i> on its own. Tap the 3, then tap the = sign, and take 3 away from <b>both</b> sides.',
    nl: 'Een vergelijking is een weegschaal: beide kanten wegen even zwaar. Zorg dat <i>x</i> alleen staat. Tik op de 3, dan op het =-teken, en haal aan <b>beide</b> kanten 3 weg.' },
  { goal: 'solve', s: () => parseProblem('3x=12').S,
    en: '3<i>x</i> is three <i>x</i>’s. To get one <i>x</i>, divide both sides by 3: tap the 3, then the = sign.',
    nl: '3<i>x</i> is drie keer <i>x</i>. Om één <i>x</i> over te houden deel je beide kanten door 3: tik op de 3 en dan op het =-teken.' },
  { goal: 'solve', s: () => parseProblem('3x+5=20').S,
    en: 'Two steps. First take away what is added, then divide.',
    nl: 'Twee stappen. Haal eerst weg wat erbij staat, en deel daarna.' },
  { goal: 'solve', s: () => parseProblem('5x+3=2x+12').S,
    en: 'Letters on both sides. Take 2<i>x</i> away from both sides, so all the <i>x</i>’s end up on the left.',
    nl: 'Letters aan beide kanten. Haal aan beide kanten 2<i>x</i> weg, dan staan alle <i>x</i>’en links.' },
  { goal: 'solve', s: () => parseProblem('x/3=4').S,
    en: 'A fraction. <i>x</i> divided by 3 is 4, so multiply both sides by 3: tap the 3 below the bar, then the = sign.',
    nl: 'Een breuk. <i>x</i> gedeeld door 3 is 4, dus vermenigvuldig beide kanten met 3: tik op de 3 onder de streep en dan op het =-teken.' },
  { goal: 'solve', book: true, s: () => parseProblem('2(x+3)=4x-2').S,
    en: 'Brackets first, then balance. You know all the moves.',
    nl: 'Eerst de haakjes, dan de weegschaal. Je kent alle zetten.' },
  { goal: 'solve', book: true, s: () => parseProblem('4x-3=2x+6').S,
    en: 'Not every answer is a whole number.',
    nl: 'Niet elk antwoord is een heel getal.' },
];
function buildLevel(i) { const S = LEVELS[i].s(); S.op = S.op || null; S.goal = LEVELS[i].goal || 'simplify'; return S; }
/* ===== END CORE ===== */
