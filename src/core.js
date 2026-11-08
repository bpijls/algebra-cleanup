/* ===== CORE: algebra model and moves (no DOM) ===== */
let uid = 1;
const nid = () => uid++;
const N = v => ({ k: 'n', v, id: nid() });
const V = (b, e = 1) => ({ k: 'v', b, e, id: nid() });
const G = (f, e) => ({ k: 'g', f, e, id: nid() });          // bracket around a product, with exponent
const Pr = (terms, e = 1) => ({ k: 'p', terms, e, id: nid() });  // bracket around a sum, with exponent
const Rt = terms => ({ k: 'r', terms, e: 1, id: nid() });      // square root of a sum (of one term, mostly)
const T = (f, neg = false) => ({ k: 't', f, neg, id: nid() });
const F = (num, den) => ({ num, den: den || [T([N(1)])] });
const MAX_VAR = 16, MAX_GROUP = 8;

const cloneF = f => f.k === 'n' ? N(f.v) : f.k === 'v' ? V(f.b, f.e) : f.k === 'g' ? G(f.f.map(cloneF), f.e) : f.k === 'r' ? Rt(f.terms.map(cloneT)) : Pr(f.terms.map(cloneT), f.e);
const cloneT = t => T(t.f.map(cloneF), t.neg);
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
function primeFactors(n) { const r = []; let d = 2; while (n > 1) { while (n % d === 0) { r.push(d); n /= d; } d++; } return r; }
const fkey = f => f.k === 'n' ? 'n' + f.v : f.k === 'v' ? f.b + '^' + f.e : f.k === 'g' ? '(' + f.f.map(fkey).join('*') + ')^' + f.e
  : f.k === 'r' ? '√' + sumKey(f.terms) : sumKey(f.terms) + '^' + f.e;
// a sum, independent of the order of its terms and of the factors inside each term
const sumKey = terms => '[' + terms.map(t => (t.neg ? '-' : '+') + t.f.map(fkey).sort().join('*')).sort().join('') + ']';
const innerKey = g => g.f.map(fkey).join('*');
function canMerge(x, y) {
  if (x.k !== y.k) return false;
  if (x.k === 'n') return true;
  if (x.k === 'v') return x.b === y.b;
  if (x.k === 'p') return sumKey(x.terms) === sumKey(y.terms);
  if (x.k === 'r') return x.terms.length === 1 && y.terms.length === 1;   // √2 · √3 = √(2·3)
  return innerKey(x) === innerKey(y);
}
function mergeF(x, y) {
  if (x.k === 'n') return N(x.v * y.v);
  if (x.k === 'v') return V(x.b, x.e + y.e);
  if (x.k === 'p') return Pr(x.terms.map(cloneT), x.e + y.e);
  if (x.k === 'r') return Rt([T([...x.terms[0].f, ...y.terms[0].f].map(cloneF), x.terms[0].neg !== y.terms[0].neg)]);
  return G(x.f.map(cloneF), x.e + y.e);
}
const varPart = t => t.f.filter(f => f.k === 'v');
const sig = t => t.f.filter(f => f.k === 'v' || f.k === 'p' || f.k === 'r').map(f => f.k === 'v' ? f.b + f.e : fkey(f)).sort().join('.');
// a root is tidy when it holds one whole number with no pair left inside: √5, √12 is not (12 = 2·2·3)
const rootClean = f => f.terms.length === 1 && !f.terms[0].neg && f.terms[0].f.length === 1 && f.terms[0].f[0].k === 'n'
  && f.terms[0].f[0].v > 1 && !squareFactor(f.terms[0].f[0].v);
function squareFactor(n) { for (let d = 2; d * d <= n; d++) if (n % (d * d) === 0) return d; return 0; }
const coefAbs = t => { const n = t.f.find(f => f.k === 'n'); return n ? n.v : 1; };
const coef = t => coefAbs(t) * (t.neg ? -1 : 1);
const isOne = den => den.length === 1 && !den[0].neg && den[0].f.length === 1 && den[0].f[0].k === 'n' && den[0].f[0].v === 1;
const SIDES = ['num', 'den'];

/* A term is tidy when it reads as: one number, each letter once (and, if allowed, one clean bracket). */
function tidy(t, allowB) {
  let n = 0, p = 0, r = 0; const bs = new Set();
  for (const f of t.f) {
    if (f.k === 'g') return false;
    if (f.k === 'r') { if (!rootClean(f) || r++) return false; continue; }
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
      if (f.k === 'r') {
        normTerms(f.terms);
        const v = f.terms.length === 1 && !f.terms[0].neg && f.terms[0].f.length === 1 && f.terms[0].f[0].k === 'n' ? f.terms[0].f[0].v : -1;
        if (v === 0 || v === 1) { nf.push(N(v)); continue; }
      }
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
      if (f.k === 'p' || f.k === 'r') walkTerms(f.terms, { ...ctx, depth: ctx.depth + 1, in: f }, fn);
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
// √ over some HTML: the hook is drawn so it meets the bar at any height; the glyph stays as hidden text
const sqHTML = inner => `<span class="sq"><svg class="rs-svg" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0.5 64 L2.8 58 L5.4 100 L10 0"/></svg><span class="rs">√</span><span class="rad">${inner}</span></span>`;
function fx(f) {
  if (f.k === 'n') return `<span class="mn">${f.v}</span>`;
  if (f.k === 'v') return `<i class="mv">${f.b}</i>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  if (f.k === 'p') return `(${sumHTML(f.terms)})${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  if (f.k === 'r') return sqHTML(sumHTML(f.terms));
  if (f.k === 'bk') return `<span class="bk">${sumHTML(f.terms)}</span>${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
  return `(${factorsHTML(f.f)})${f.e > 1 ? `<sup>${f.e}</sup>` : ''}`;
}
const RANK = { n: 0, v: 1, r: 2, g: 2, p: 3, bk: 3 };
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
// "or" between the branches of an equation: x = 3 ∨ x = −3 (Dutch textbooks write ∨)
const orWord = () => (typeof I18N !== 'undefined' && typeof lang !== 'undefined' && I18N[lang] && I18N[lang].orWord) || '∨';
const branchCount = S => S.op === '=' ? S.parts.length >> 1 : 1;
const pairOf = (S, bi) => S.parts.slice(2 * bi, 2 * bi + 2);
const eqView = (S, bi) => ({ parts: pairOf(S, bi), op: '=', goal: 'solve' });   // shares the tiles with S
function stateHTML(S) {
  if (S.op === '=' && S.parts.length > 2)
    return Array.from({ length: branchCount(S) }, (_, b) => `<span class="branch">${stateHTML(eqView(S, b))}</span>`).join(` <span class="nop or">${orWord()}</span> `);
  if (S.parts.length > 1 && S.op === '/')
    return `<span class="nfrac big"><span class="nn">${fracHTML(S.parts[0])}</span><span class="nd">${fracHTML(S.parts[1])}</span></span>`;
  return S.parts.map(P => fracHTML(P, S.op === '·')).join(` <span class="nop">${S.op || ''}</span> `);
}
const mx = h => `<span class="mx">${h}</span>`;
const bx = b => mx(`<i class="mv">${b}</i>`);
/* a bracket that sits in several terms, written as one block: x(x + 2) + 3(x + 2) reads x·[x+2] + 3·[x+2],
   so putting it outside brackets looks like the familiar 2a + 2b = 2(a + b) */
const blockHTML = (terms, key) => sumHTML(terms.map(t => ({ ...t, f: t.f.map(f => f.k === 'p' && sumKey(f.terms) === key ? { k: 'bk', terms: f.terms, e: f.e } : f) })));

/* ---- moves ---- each returns {ok,p,born} after mutating, or {no,p,ids} without mutating ---- */
function opExplode(S, id) {
  const L = locate(S, id), f = L.f, arr = L.term.f;
  if (f.k === 'r') return { no: 'rootTap', ids: [id] };
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
// x(x − 5) + x − 5: the loose terms x − 5 together are the bracket (x − 5) once (or −1 times).
// Returns those terms when B's term is one of them, else null.
function restOf(A, B) {
  if (A.f.k !== 'p' || A.f.e !== 1 || A.depth || B.term === A.term || A.terms !== B.terms) return null;
  const k = A.f.terms.length, key = sumKey(A.f.terms);
  const neg = sumKey(A.f.terms.map(t => ({ ...t, neg: !t.neg })));
  const others = A.terms.filter(t => t !== A.term && t !== B.term);
  const pickK = (from, n, start = 0, acc = []) => {
    if (acc.length === n) return [acc];
    const out = [];
    for (let i = start; i < from.length; i++) out.push(...pickK(from, n, i + 1, [...acc, from[i]]));
    return out;
  };
  for (const more of pickK(others, k - 1)) {
    const set = [B.term, ...more], sk = sumKey(set);
    if (sk === key) return { set, sign: 1 };
    if (sk === neg) return { set, sign: -1 };
  }
  return null;
}
function pairCheck(S, A, B) {
  const x = A.f, y = B.f;
  if (A.p !== B.p) {
    if (S.op === '=') return { type: 'fizzle', msg: A.p >> 1 !== B.p >> 1 ? 'diffBranch' : 'diffSides' };   // no "move it across and flip the sign"
    if (S.op !== '·') return { type: 'fizzle', msg: 'diffFrac' };
    if (A.side === B.side) return { type: 'move' };
    const PA = S.parts[A.p], PB = S.parts[B.p];
    const single = PA[A.side].length === 1 && PB[B.side].length === 1 && !A.depth && !B.depth;
    if (single) { const cr = cancelCheck(x, y); if (cr && cr.type !== 'none') return cr; }
    return { type: 'fizzle', msg: 'crossSide' };
  }
  if (A.terms === B.terms && A.term !== B.term && (restOf(A, B) || restOf(B, A))) return { type: 'factorRest' };
  if (A.terms === B.terms) {
    // √(3·3·2): two equal numbers under a root come out as one, √(3·3) = 3
    if (A.term === B.term && A.in && A.in.k === 'r' && A.in.terms.length === 1 && x.k === 'n' && y.k === 'n') {
      if (x.v === y.v && x.v > 1) return { type: 'rootOut' };
      if (x.v !== y.v && x.v > 1 && y.v > 1) return { type: 'merge' };
    }
    if (A.term === B.term) return canMerge(x, y) ? { type: 'merge' } : { type: 'none' };
    if (x.k === 'p' && y.k === 'p' && canMerge(x, y)) {   // a(x+2) + 3(x+2): the same bracket in both terms
      if (x.e === y.e) return { type: 'factor', useless: false };
      const big = x.e > y.e ? x : y, small = big === x ? y : x;
      return { type: 'fizzle', msg: 'explodeFirstVar', p: { x: mx(fx(x)), y: mx(fx(y)), big: mx(fx(big)), small: mx(fx(small)) } };
    }
    if (x.k !== y.k || x.k === 'g' || x.k === 'p' || (x.k === 'v' && x.b !== y.b) || (x.k === 'r' && fkey(x) !== fkey(y))) return { type: 'none' };
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
  const ex = mx(sumHTML(set)), key = c.k === 'p' ? sumKey(c.terms) : null, bex = key && mx(blockHTML(set, key));
  const inner = set.map((t, i) => { t.f.splice(t.f.indexOf(picked[i]), 1); t.neg = t.neg !== lead; return cleanTerm(t); });
  const wrap = Pr(inner), nt = T([c, wrap], lead);
  const at = terms.indexOf(set[0]);
  set.forEach(t => terms.splice(terms.indexOf(t), 1));
  terms.splice(at, 0, nt);
  const leftOne = inner.some(t => t.f.length === 1 && t.f[0].k === 'n' && t.f[0].v === 1);
  const ok = lead ? 'factorNeg' : leftOne ? 'factorOne' : key ? 'factorBlock' : 'factor';
  return { ok, p: { c: mx(fx(c)), ex, r: mx(termHTML(nt)), bex, br: key && mx(blockHTML([nt], key)) }, born: [c.id], origins: { [c.id]: picked.map(f => f.id) }, arcs: true, wrap: wrap.id };
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
  if (r.type === 'factorRest') {
    const [P, Q] = restOf(A, B) ? [A, B] : [B, A], { set, sign } = restOf(P, Q), terms = P.terms;
    const ex = mx(sumHTML([P.term, ...set].sort((u, v) => terms.indexOf(u) - terms.indexOf(v))));
    const c = cloneF(P.f), lead = P.term.neg;
    const rest = cleanTerm(T(P.term.f.filter(f => f !== P.f), false));
    const wrap = Pr([rest, T([N(1)], (sign < 0) !== lead)]), nt = T([c, wrap], lead);
    const at = Math.min(terms.indexOf(P.term), ...set.map(t => terms.indexOf(t)));
    [P.term, ...set].forEach(t => terms.splice(terms.indexOf(t), 1));
    terms.splice(at, 0, nt);
    return { ok: 'factorRest', p: { b: mx(fx(P.f)), t: mx(sumHTML(set)), ex, r: mx(termHTML(nt)), one: sign < 0 ? '−1' : '1' }, born: [c.id], origins: { [c.id]: [P.f.id] }, arcs: true, wrap: wrap.id };
  }
  if (r.type === 'rootOut') {
    const out = locate(S, A.in.id), arr = A.term.f, shown = mx(fx(A.in));
    arr.splice(arr.indexOf(A.f), 1); arr.splice(arr.indexOf(B.f), 1);
    if (!arr.length) arr.push(N(1));
    const n = N(A.f.v);
    out.term.f.splice(out.i, 0, n);
    return { ok: 'rootOut', p: { x: shown, n: A.f.v, r: mx(fx(out.f)) }, born: [n.id], origins: { [n.id]: [A.f.id, B.f.id] } };
  }
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
  if (r.type === 'merge' && x.k === 'n' && x.v * y.v > 1e12) return { no: 'tooBig', ids: [aId, bId] };   // beyond exact arithmetic
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
      if (r.type === 'merge' || r.type === 'rootOut' || r.type === 'factorRest' || r.type === 'cancel' || r.type === 'move' || r.type === 'addTerms' || (r.type === 'factor' && !r.useless)) out.add(B.f.id);
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
    for (const t of ts) for (const f of t.f) {
      if (f.k !== 'p' || f.e !== 1) continue;
      const P = { f, term: t, terms: ts, depth: 0 };
      for (const u of ts) { const Q = { term: u, terms: ts }; const r = restOf(P, Q); if (r) return { k: 'hFactorRest', p: { b: mx(fx(f)), t: mx(sumHTML(r.set)) }, ids: [f.id, (u.f.find(g => g.k !== 'n') || u.f[0]).id] }; }
    }
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
    if (h || L.f.k !== 'r' || L.f.terms.length !== 1) return;
    const ns = L.f.terms[0].f.filter(f => f.k === 'n' && f.v > 1);
    for (let i = 0; !h && i < ns.length; i++) for (let j = i + 1; !h && j < ns.length; j++)
      if (ns[i].v === ns[j].v) h = { k: 'hRootPair', p: { x: mx(fx(L.f)), n: ns[i].v }, ids: [ns[i].id, ns[j].id] };
    const big = ns.find(f => squareFactor(f.v) && primeFactors(f.v).length > 1);
    if (!h && big) h = { k: 'hExplodeRoot', p: { x: mx(fx(L.f)), n: big.v }, ids: [big.id] };
    if (!h && ns.length > 1) h = { k: 'hMerge', p: { x: ns[0].v, y: ns[1].v }, ids: [ns[0].id, ns[1].id] };
  });
  if (h) return h;
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
function opBalance(S, op, v, bi = 0) {
  if (S.op !== '=' || !v || !v.f || !v.f.length || bi >= branchCount(S)) return null;
  const vNum = v.f.filter(f => f.k === 'n').reduce((a, f) => a * f.v, 1);
  const shown = mx((v.neg ? '−' : '') + factorsHTML(v.f, true));
  if (v.f.some(f => f.k === 'p' || f.k === 'g' || (f.k === 'r' && (op === '·' || op === ':')))) return { no: 'balanceShape', ids: ['op'] };
  const parts = pairOf(S, bi);
  if (vNum === 0) return { no: op === ':' ? 'balanceDivZero' : op === '·' ? 'balanceMulZero' : 'balanceNothing', ids: ['op'] };
  const born = [];
  if (op === '+' || op === '-') {
    if (parts.some(P => !isOne(P.den))) return { no: 'balanceFrac', ids: ['op'] };
    for (const P of parts) {
      const t = cloneT(v); if (op === '-') t.neg = !t.neg;
      born.push(...t.f.map(f => f.id));
      if (isZeroSide(P.num)) P.num = [t]; else P.num.push(t);
    }
  } else {
    if (v.f.some(f => f.k === 'v')) return { no: 'balanceLetter', p: { v: shown }, ids: ['op'] };
    if (vNum === 1 && !v.neg) return { no: 'balanceOne', ids: ['op'] };
    // numbers past exact arithmetic (only random play gets there)
    let big = 1; parts.forEach(P => walkTerms([...P.num, ...P.den], { depth: 0 }, M => { if (M.kind === 't') big = Math.max(big, numProd(M.term)); }));
    if (big * vNum > 1e12) return { no: 'tooBig', ids: ['op'] };
    for (const P of parts) {
      const side = op === '·' ? 'num' : 'den';
      const c = N(vNum); born.push(c.id);
      const ts = P[side];
      if (op === ':' && isOne(ts)) P[side] = [T([c], v.neg)];
      else if (ts.length === 1) { ts[0].f.unshift(c); if (v.neg) ts[0].neg = !ts[0].neg; }
      else P[side] = [T([c, Pr(ts)], v.neg)];   // a sum gets multiplied as a whole: 2(x + 1)
    }
  }
  const sides = parts.map(P => fracHTML(P));
  return { ok: 'balance', p: { op: BOPS[op], v: shown, ex: mx(sides.join(' = ')) }, born };
}
function opSwap(S, bi = 0) {
  if (S.op !== '=' || bi >= branchCount(S)) return null;
  const [a, b] = pairOf(S, bi);
  S.parts.splice(2 * bi, 2, b, a);
  return { ok: 'swapSides', p: { ex: mx(fracHTML(b) + ' = ' + fracHTML(a)) } };
}
// dragging a piece across the = undoes what it does on its side, on both sides:
//   a term in a sum → take it away (3x + 5: drag 5 → − 5), the number in 3x → divide by 3,
//   what is below the bar → multiply by it, a lone −x → divide by −1
// a square on its own side (x², (x + 3)², not 2x² or −x²): its ² is a tile of its own that can be dragged across
function loneSquare(P) {
  const t = P.num[0];
  if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1) return null;
  const f = t.f[0];
  return f.e === 2 && f.k !== 'n' && f.k !== 'r' ? f : null;
}
// the ² of a lone square has the id −(the square's id); dragging it takes the root of both sides,
// and dragging the 0 of '… = 0' onto a product splits it (a product is 0 when one of its factors is)
function dragBalance(S, id) {
  if (S.op !== '=') return null;
  if (id < 0) {
    const pi = S.parts.findIndex(P => loneSquare(P)?.id === -id);
    return pi < 0 ? null : { root: true, bi: pi >> 1 };
  }
  for (const [pi, P] of S.parts.entries()) for (const side of SIDES) for (const top of P[side]) {
    let L = null;
    walkTerms([top], { depth: 0 }, M => { if (!L && (M.kind === 't' ? M.term.id : M.f.id) === id) L = M; });
    if (!L) continue;
    const ts = P[side], bi = pi >> 1;
    if (side === 'num' && L.kind === 'f' && L.f.k === 'n' && L.f.v === 0 && isZeroSide(ts) && isOne(P.den)) return { zero: true, bi };
    if (side === 'den') return ts.length === 1 ? { op: '·', value: T(top.f.map(cloneF), top.neg), bi } : { no: 'dragDenSum' };
    const whole = { op: top.neg ? '+' : '-', value: T(top.f.map(cloneF)), bi };
    if (ts.length > 1 || L.kind === 't') return whole;
    // the only term on its side: a number in front divides, a lone minus divides by −1, anything else takes the term away
    if (L.depth === 0 && L.f.k === 'n' && top.f.length > 1) return { op: ':', value: T([N(L.f.v)], top.neg), bi };
    if (top.neg && !top.f.some(f => f.k === 'n')) return { op: ':', value: T([N(1)], true), bi };
    return whole;
  }
  return null;
}
function opDrag(S, id) {
  const d = dragBalance(S, id);
  if (!d) return null;
  if (d.no) return { no: d.no, ids: [id] };
  if (d.root || d.zero) {
    const r = d.root ? opRoot(S, d.bi) : opZero(S, d.bi);
    if (r && r.no) r.ids = [id];
    return r;
  }
  if ((d.op === '+' || d.op === '-') && d.value.f.some(f => f.k === 'p' || f.k === 'g')) return { no: 'dragBracket', ids: [id] };
  const r = opBalance(S, d.op, d.value, d.bi);
  if (r && r.no) r.ids = [id, ...(r.ids || [])];
  return r;
}
// solved: one side is the letter on its own, the other side a clean value without it
function isSolved(S) {
  if (S.op !== '=' || S.parts.length < 2 || S.parts.length % 2) return false;
  if (S.parts.length > 2) return Array.from({ length: branchCount(S) }, (_, b) => isSolved(eqView(S, b))).every(Boolean);
  return S.parts.some((P, i) => {
    const t = P.num[0];
    if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1 || t.f[0].k !== 'v' || t.f[0].e !== 1) return false;
    const other = S.parts[1 - i], b = t.f[0].b;
    let has = false; walkTerms([...other.num, ...other.den], { depth: 0 }, L => { if (L.kind === 'f' && L.f.k === 'v' && L.f.b === b) has = true; });
    return !has && isClean({ parts: [other], op: null, goal: 'simplify' });
  });
}
/* "Done?" pressed too early: say what is still left, without giving the move away */
function whyNotDone(S) {
  if (isClean(S)) return null;
  const th = t => mx(termHTML(t));
  if (S.goal === 'solve' && S.parts.length > 2) {
    for (let b = 0; b < branchCount(S); b++) { const w = whyNotDone(eqView(S, b)); if (w) return w; }
    return null;
  }
  if (S.goal === 'solve') {
    const has = P => { let h = false; walkTerms([...P.num, ...P.den], { depth: 0 }, L => { if (L.kind === 'f' && L.f.k === 'v') h = true; }); return h; };
    const [l, r] = S.parts.map(has);
    if (l && r) return { k: 'nyEqBoth' };
    const P = S.parts[l ? 0 : 1], t = P.num[0];
    if (P.num.length !== 1 || !isOne(P.den) || t.neg || t.f.length !== 1 || t.f[0].k !== 'v' || t.f[0].e !== 1) return { k: 'nyEqAlone' };
    return { k: 'nyEqTidy' };
  }
  if (S.parts.length > 1) return { k: 'nyTwoParts' };
  const P = S.parts[0];
  if (S.goal === 'factor') {
    if (P.num.length > 1) return { k: 'nyTerms', p: { n: P.num.length } };
    const t = P.num[0], ps = t.f.filter(f => f.k === 'p');
    if (!isOne(P.den) || !ps.length) return { k: 'nyNoBracket' };
    if (!tidy({ f: t.f.filter(f => f.k !== 'p') })) return { k: 'nyTidy', p: { t: th({ f: t.f.filter(f => f.k !== 'p') }) } };
    const seen = new Set();
    for (const f of ps) {
      const x = mx(fx(f)), inner = f.terms, k = sumKey(inner);
      if (seen.has(k)) return { k: 'nySame', p: { x } };
      seen.add(k);
      if (!sumClean(inner) || !inner.every(it => tidy(it))) return { k: 'nyInside', p: { x } };
      let g = 0; inner.forEach(it => { g = gcd(g, coefAbs(it)); });
      if (g > 1 || varPart(inner[0]).some(v => inner.every(it => varPart(it).some(w => w.b === v.b)))) return { k: 'nyShared', p: { x } };
      if (quadSplit(inner)) return { k: 'nySplits', p: { x } };
    }
    return { k: 'nyTidyAll' };
  }
  for (const side of SIDES) {
    const ts = unbare(P[side]);
    const bad = ts.find(t => !tidy(t, !!S.allowB));
    if (bad) return { k: !S.allowB && bad.f.some(f => f.k === 'p' || f.k === 'g') ? 'nyBracket' : 'nyTidy', p: { t: th(bad) } };
    const sigs = ts.map(sig), j = sigs.findIndex((s, i) => sigs.indexOf(s) !== i);
    if (j >= 0) return { k: 'nyLike', p: { a: th(ts[sigs.indexOf(sigs[j])]), b: th(ts[j]) } };
  }
  const all = [...unbare(P.num), ...unbare(P.den)];
  let g = 0; for (const t of all) g = gcd(g, coefAbs(t));
  if (g > 1) return { k: 'nyCancelNum' };
  const b = varPart(all[0]).map(f => f.b).find(b => all.every(t => varPart(t).some(f => f.b === b)));
  if (b) return { k: 'nyCancelVar', p: { b: bx(b) } };
  return { k: 'nyTidyAll' };
}
/* ---- quadratic equations: two moves that split an equation into branches ("or") ----
   Branch b is S.parts[2b] = S.parts[2b + 1]. Every other move works inside one branch. */
const hasLetter = side => { let h = false; walkTerms(side, { depth: 0 }, L => { if (L.kind === 'f' && L.f.k === 'v') h = true; }); return h; };
// the value of a side without letters (null when it has letters)
function constVal(P) {
  if (hasLetter(P.num) || hasLetter(P.den)) return null;
  return evalTerms(P.num, {}) / evalTerms(P.den, {});
}
function evalF(f, env) {
  if (f.k === 'n') return f.v;
  if (f.k === 'v') return Math.pow(env[f.b] ?? 0, f.e);
  if (f.k === 'g') return Math.pow(f.f.reduce((p, g) => p * evalF(g, env), 1), f.e);
  if (f.k === 'r') return Math.sqrt(evalTerms(f.terms, env));
  return Math.pow(evalTerms(f.terms, env), f.e);
}
const evalTerms = (ts, env) => ts.reduce((s, t) => s + (t.neg ? -1 : 1) * t.f.reduce((p, f) => p * evalF(f, env), 1), 0);
// L − R as a·x² + b·x + c, read off from its values at x = 0, 1, 2 (null when it isn't one)
function quadOf(S) {
  const b = letters(S)[0];
  if (!b) return null;
  const f = x => S.parts[0] && evalTerms(S.parts[0].num, { [b]: x }) / evalTerms(S.parts[0].den, { [b]: x }) - evalTerms(S.parts[1].num, { [b]: x }) / evalTerms(S.parts[1].den, { [b]: x });
  const [f0, f1, f2, f3] = [0, 1, 2, 3].map(f);
  const a = (f2 - 2 * f1 + f0) / 2, bb = f1 - f0 - a, c = f0;
  if (![f0, f1, f2, f3].every(isFinite) || Math.abs(a * 9 + bb * 3 + c - f3) > 1e-6 * Math.max(1, Math.abs(f3))) return null;
  return { a, b: bb, c, x: b };
}

// "take the root of both sides": the square on one side, a number ≥ 0 on the other → two branches
function opRoot(S, bi = 0) {
  if (S.op !== '=' || bi >= branchCount(S)) return null;
  const parts = pairOf(S, bi);
  const qi = parts.findIndex(P => hasLetter(P.num) || hasLetter(P.den));
  if (qi < 0) return null;
  const Q = parts[qi], O = parts[1 - qi], t = Q.num[0];
  const sq = Q.num.length === 1 && isOne(Q.den) && t.f.find(f => f.e === 2 && f.k !== 'n');
  if (!sq) return { no: 'rootNoSquare', ids: ['op'] };
  if (t.f.length > 1 || t.neg) return { no: 'rootCoef', p: { x: mx(sumHTML([t])), s: mx(fx(sq)) }, ids: [t.id] };
  if (hasLetter(O.num) || hasLetter(O.den)) return { no: 'rootLetter', ids: [sq.id] };
  if (!isOne(O.den)) return { no: 'rootFrac', ids: [sq.id] };
  const v = constVal(O);
  if (v < -1e-12) return { no: 'rootNeg', p: { s: mx(fx(sq)), v: mx(sumHTML(O.num)) }, ids: [sq.id] };
  const base = () => sq.k === 'v' ? V(sq.b, 1) : sq.k === 'g' ? G(sq.f.map(cloneF), 1) : Pr(sq.terms.map(cloneT), 1);
  const side = (neg) => F([T([Rt(O.num.map(cloneT))], neg)]);
  const branch = neg => { const pair = [F([T([base()])]), side(neg)]; return qi ? pair.reverse() : pair; };
  const add = Math.abs(v) < 1e-12 ? [...branch(false)] : [...branch(false), ...branch(true)];
  const before = mx(fracHTML(parts[0]) + ' = ' + fracHTML(parts[1]));
  S.parts.splice(2 * bi, 2, ...add);
  const ex = Array.from({ length: add.length / 2 }, (_, k) => fracHTML(add[2 * k]) + ' = ' + fracHTML(add[2 * k + 1])).join(` ${orWord()} `);
  return { ok: add.length > 2 ? 'rootBoth' : 'rootZero', p: { x: before, ex: mx(ex), s: mx(fx(sq)) }, born: add.flatMap(P => P.num.flatMap(t => t.f.map(f => f.id))) };
}
// a product that is 0: one of its factors is 0 → a branch for each factor with a letter in it
function opZero(S, bi = 0) {
  if (S.op !== '=' || bi >= branchCount(S)) return null;
  const parts = pairOf(S, bi);
  const zi = parts.findIndex(P => isZeroSide(P.num) && isOne(P.den));
  if (zi < 0) return null;
  const Q = parts[1 - zi], t = Q.num[0];
  if (Q.num.length !== 1 || !isOne(Q.den)) return { no: 'zeroSum', ids: ['op'] };
  const fs = t.f.filter(f => f.k !== 'n' && (f.k === 'v' || hasLetter(f.terms || [T(f.f || [])])));
  const seen = new Set(), bases = [];
  for (const f of fs) {
    const b = f.k === 'v' ? V(f.b, 1) : f.k === 'g' ? G(f.f.map(cloneF), 1) : Pr(f.terms.map(cloneT), 1);
    const k = fkey(b); if (!seen.has(k)) { seen.add(k); bases.push(b); }
  }
  if (bases.length < 2 && !fs.some(f => f.e > 1)) return { no: 'zeroOne', ids: ['op'] };
  const add = bases.flatMap(b => { const pair = [F([T([b])]), F([T([N(0)])])]; return zi === 0 ? pair.reverse() : pair; });
  const before = mx(sumHTML([t]) + ' = 0');
  S.parts.splice(2 * bi, 2, ...add);
  const ex = bases.map(b => (b.k === 'p' ? sumHTML(b.terms) : fx(b)) + ' = 0').join(` ${orWord()} `);
  return { ok: 'zeroProduct', p: { x: before, ex: mx(ex) }, born: add.flatMap(P => P.num.flatMap(t => t.f.map(f => f.id))) };
}
const sideView = P => ({ parts: [P], op: null, goal: 'simplify' });
// several branches: work on the first one that isn't solved yet (bi tells the move which branch)
function eqHint(S) {
  if (isSolved(S)) return { k: 'hDone', ids: [] };
  for (let b = 0; b < branchCount(S); b++) {
    const E = eqView(S, b);
    if (isSolved(E)) continue;
    const q = quadOf(E);
    const h = q && Math.abs(q.a) > 1e-9 ? quadHint(E, q) : pairHint(E);
    return { ...h, bi: b };
  }
  return { k: 'hDone', ids: [] };
}
const isSquareTerm = t => t.f.some(f => f.e === 2 && f.k !== 'n');
// ax² + bx + c = d. In order: the shapes that split into branches (a product = 0, a square = a number),
// a factoring under way, tidy up, then choose: sum-product when the numbers allow it, otherwise complete the square
// (with a·x² not a square, or b not even: first multiply both sides by 4a, the way to the abc-formula)
function quadHint(S, q) {
  const [L, R] = S.parts;
  if (!hasLetter(L.num) && !hasLetter(L.den)) return { k: 'hSwap', p: { b: bx(q.x) }, ids: ['op'] };
  const dry = fn => { const c = JSON.parse(JSON.stringify(S)); return fn(c); };
  const z = dry(c => opZero(c));
  if (z && z.ok) {
    const zid = S.parts.find(P => isZeroSide(P.num)).num[0].f[0].id;
    return { k: 'hZero', p: { x: z.p.x }, ids: [zid, 'op'], drag: zid };
  }
  if (!hasLetter(R.num)) {
    const t = L.num[0];
    // a square that is still written as a product of two equal brackets
    if (L.num.length === 1 && isOne(L.den)) {
      const ps = t.f.filter(f => f.k === 'p');
      if (ps.length === 2 && canMerge(ps[0], ps[1])) return { k: 'hMerge', p: { x: mx(fx(ps[0])), y: mx(fx(ps[1])) }, ids: [ps[0].id, ps[1].id] };
    }
    const r = dry(c => opRoot(c));
    if (r && (r.ok || r.no === 'rootNeg')) {
      const h = hint(sideView(R)); if (h.k !== 'hDone') return h;
      if (r.no) return { k: 'hNoReal', p: r.p, ids: [] };
      const pid = -loneSquare(S.parts.find(P => loneSquare(P) && (hasLetter(P.num)))).id;
      return { k: 'hRoot', p: { s: r.p.s }, ids: [pid, 'op'], drag: pid };
    }
    if (r && r.no === 'rootCoef') {   // 2x² = 18: the square on its own first
      const n = t.f.filter(f => f.k === 'n'), a = n.reduce((p, f) => p * f.v, 1);
      return { k: 'hBalanceDiv', p: { x: mx(sumHTML([t])), v: mx((t.neg ? '−' : '') + a) }, ids: [(n[0] || t.f[0]).id, 'op'], drag: (n[0] || t.f[0]).id, balance: { op: ':', value: T([N(a)], t.neg) } };
    }
  }
  const disc = q.b * q.b - 4 * q.a * q.c;
  // factoring under way: to reach a product = 0, or the square of a complete square
  const lq = quadOf({ parts: [L, F([T([N(0)])])], op: '=' });
  const lSquare = lq && Math.abs(lq.b * lq.b - 4 * lq.a * lq.c) < 1e-6 && Math.abs(lq.c) > 1e-9;
  const underWay = L.num.length >= 4 || L.num.some(t => t.f.some(f => f.k === 'p' && hasLetter(f.terms)));
  const noC = lq && Math.abs(lq.c) < 1e-9 && isZeroSide(R.num);   // a·x² + b·x = 0: x goes outside brackets
  if (!hasLetter(R.num) && (isZeroSide(R.num) || lSquare) && L.num.length > 1 && (underWay || noC)) {
    const h = hint({ parts: [L], op: null, goal: 'factor' });
    if (h.k !== 'hDone') return h;
  }
  for (const P of S.parts) { const h = hint(sideView(P)); if (h.k !== 'hDone') return h; }
  const b = q.x;
  const hasX = t => { let h = false; walkTerms([t], { depth: 0 }, M => { if (M.kind === 'f' && M.f.k === 'v' && M.f.b === b) h = true; }); return h; };
  const take = (t, side, terms) => {
    const id = terms.length > 1 ? t.id : (t.f.find(f => f.k !== 'n') || t.f[0]).id;
    return { k: 'hBalanceTerm', p: { x: mx(sumHTML([t])), op: t.neg ? '+' : '−', v: mx(termHTML(t)), side }, ids: [id, 'op'], drag: id, balance: { op: t.neg ? '+' : '-', value: T(t.f.map(cloneF)) } };
  };
  const xR = R.num.find(hasX);
  if (xR) return take(xR, 'right', R.num);
  const A = Math.round(lq.a), B = Math.round(lq.b), C = Math.round(lq.c), D = constVal(R);
  const cL = L.num.find(t => !hasX(t));
  if (!B) return cL ? take(cL, 'left', L.num) : { k: 'hDone', ids: [] };
  // a complete square on the left: write it as a square
  if (lSquare && L.num.length === 3) { const h = sumProductHint({ parts: [L] }); if (h) return h; }
  if (C === D) {   // a·x² + b·x = 0: everything to the left, then x goes outside brackets
    if (!isZeroSide(R.num)) return take(R.num[0], 'right', R.num);
    const h = hint({ parts: [L], op: null, goal: 'factor' }); if (h.k !== 'hDone') return h;
  }
  const split = Number.isInteger(D) && quadSplit([T([N(Math.abs(A)), V(b, 2)], A < 0), T([N(Math.abs(B)), V(b)], B < 0), T([N(Math.abs(C - D) || 1)], C - D < 0)].map(cleanTerm));
  if (split && Math.abs(disc) > 1e-9) {
    if (!isZeroSide(R.num)) return take(R.num[0], 'right', R.num);   // everything to the left: … = 0
    const h = sumProductHint({ parts: [L] }); if (h) return h;
  }
  if (disc < -1e-9) return { k: 'hNoRealD', ids: [] };
  if (cL) return take(cL, 'left', L.num);   // completing the square: the number goes to the right
  const s = Math.round(Math.sqrt(A));
  if (A > 0 && s * s === A && B % (2 * s) === 0) {
    const k = B / (2 * s);
    return { k: 'hComplete', p: { x: mx(sumHTML(L.num)), half: mx(termHTML(T([N(Math.abs(k))]))), sq: k * k, br: mx(`(${s > 1 ? s : ''}${b} ${k < 0 ? '−' : '+'} ${Math.abs(k)})²`) }, ids: ['op'], balance: { op: '+', value: T([N(k * k)]) } };
  }
  return { k: 'hMul4a', p: { a: A, v: 4 * A }, ids: ['op'], balance: { op: '·', value: T([N(Math.abs(4 * A))], A < 0) } };
}
function pairHint(S) {
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
    en: 'Three <i>a</i>’s are lying around. Tap one <i>a</i>, then tap another <i>a</i> to stick them together. Keep going until the mess is gone. Think it’s tidy? Press <b>Done?</b> at the top.',
    nl: 'Er slingeren drie <i>a</i>’s rond. Tik op een <i>a</i> en dan op een andere <i>a</i> om ze samen te voegen. Ga door tot alles is opgeruimd. Denk je dat het klaar is? Druk bovenaan op <b>Klaar?</b>' },
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
  // quadratic equations: from x² = 9 to finding the abc-formula yourself
  { goal: 'solve', s: () => parseProblem('x^2=9').S,
    en: 'A square! Which number times itself makes 9? Tap the =, then drag the little ² to the other side: the root of both sides. Careful: (−3) · (−3) is 9 too.',
    nl: 'Een kwadraat! Welk getal keer zichzelf is 9? Tik op het =-teken en sleep het kleine ² naar de andere kant: aan beide kanten de wortel. Let op: (−3) · (−3) is ook 9.' },
  { goal: 'solve', s: () => parseProblem('2x^2=24').S,
    en: 'Get <i>x</i><sup>2</sup> on its own first. After the root: is there a pair hiding in the number under the √?',
    nl: 'Zorg eerst dat <i>x</i><sup>2</sup> alleen staat. Na de wortel: zit er een paar verstopt in het getal onder de √?' },
  { goal: 'solve', s: () => parseProblem('(x+3)^2=5').S,
    en: 'The whole bracket is squared. Take the root of both sides, then solve each branch the way you already know.',
    nl: 'Het hele haakje staat in het kwadraat. Trek aan beide kanten de wortel en los daarna elke tak op zoals je al kunt.' },
  { goal: 'solve', s: () => parseProblem('(x-2)(x+5)=0').S,
    en: 'A product that is 0. When is a product 0? Only when one of its factors is 0. Tap the =, then drag the 0 onto the product.',
    nl: 'Een product dat 0 is. Wanneer is een product 0? Alleen als een van de factoren 0 is. Tik op het =-teken en sleep de 0 naar het product.' },
  { goal: 'solve', book: true, s: () => parseProblem('x^2+5x+6=0').S,
    en: 'Factorise the left side with the sum-product method, then use what you just found out.',
    nl: 'Ontbind de linkerkant met de som-productmethode en gebruik dan wat je net hebt ontdekt.' },
  { goal: 'solve', s: () => parseProblem('x^2+6x+4=0').S,
    en: 'No two whole numbers multiply to 4 and add up to 6. New plan: take the 4 to the other side and make the left a complete square. What is missing from <i>x</i><sup>2</sup> + 6<i>x</i> to make (<i>x</i> + 3)<sup>2</sup>?',
    nl: 'Geen twee hele getallen zijn keer elkaar 4 en samen 6. Nieuw plan: zet de 4 aan de andere kant en maak links een volledig kwadraat. Wat mist er aan <i>x</i><sup>2</sup> + 6<i>x</i> om (<i>x</i> + 3)<sup>2</sup> te worden?' },
  { goal: 'solve', s: () => parseProblem('x^2+3x+1=0').S,
    en: '3 is odd, so half of it is a fraction. A trick avoids that: multiply both sides by 4 first. Then 4<i>x</i><sup>2</sup> = (2<i>x</i>)<sup>2</sup> is a square, and 12<i>x</i> is even.',
    nl: '3 is oneven, dus de helft is een breuk. Met een truc kan het zonder: vermenigvuldig eerst beide kanten met 4. Dan is 4<i>x</i><sup>2</sup> = (2<i>x</i>)<sup>2</sup> een kwadraat en is 12<i>x</i> even.' },
  { goal: 'solve', book: true, abc: { a: 2, b: 3, c: -1 }, s: () => parseProblem('2x^2+3x-1=0').S,
    en: 'The last one. Now 2<i>x</i><sup>2</sup> is not a square. Multiply both sides by 4 · 2 = 8, complete the square, take the root. Then look closely at your answer.',
    nl: 'De laatste. Nu is 2<i>x</i><sup>2</sup> geen kwadraat. Vermenigvuldig beide kanten met 4 · 2 = 8, maak een volledig kwadraat en trek de wortel. Kijk daarna goed naar je antwoord.' },
];
function buildLevel(i) { const S = LEVELS[i].s(); S.op = S.op || null; S.goal = LEVELS[i].goal || 'simplify'; return S; }
/* ===== END CORE ===== */
