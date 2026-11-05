/* ===== CORE: algebra model and moves (no DOM) ===== */
let uid = 1;
const nid = () => uid++;
const N = v => ({ k: 'n', v, id: nid() });
const V = (b, e = 1) => ({ k: 'v', b, e, id: nid() });
const G = (f, e) => ({ k: 'g', f, e, id: nid() });          // bracket around a product, with exponent
const Pr = terms => ({ k: 'p', terms, e: 1, id: nid() });  // bracket around a sum
const T = (f, neg = false) => ({ k: 't', f, neg, id: nid() });
const F = (num, den) => ({ num, den: den || [T([N(1)])] });
const MAX_VAR = 16, MAX_GROUP = 8, MAX_SPLIT = 12;

const cloneF = f => f.k === 'n' ? N(f.v) : f.k === 'v' ? V(f.b, f.e) : f.k === 'g' ? G(f.f.map(cloneF), f.e) : Pr(f.terms.map(cloneT));
const cloneT = t => T(t.f.map(cloneF), t.neg);
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
function primeFactors(n) { const r = []; let d = 2; while (n > 1) { while (n % d === 0) { r.push(d); n /= d; } d++; } return r; }
const fkey = f => f.k === 'n' ? 'n' + f.v : f.k === 'v' ? f.b + '^' + f.e : f.k === 'g' ? '(' + f.f.map(fkey).join('*') + ')^' + f.e
  : '[' + f.terms.map(t => (t.neg ? '-' : '+') + t.f.map(fkey).sort().join('*')).join('') + ']';
const innerKey = g => g.f.map(fkey).join('*');
function canMerge(x, y) {
  if (x.k !== y.k || x.k === 'p') return false;
  if (x.k === 'n') return true;
  if (x.k === 'v') return x.b === y.b;
  return innerKey(x) === innerKey(y);
}
function mergeF(x, y) {
  if (x.k === 'n') return N(x.v * y.v);
  if (x.k === 'v') return V(x.b, x.e + y.e);
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
    if (f.k === 'p') { if (!allowB || !sumClean(f.terms)) return false; p++; }
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
  t.f = t.f.filter(f => !((f.k === 'v' || f.k === 'g') && f.e === 0));
  if (t.f.length > 1) t.f = t.f.filter(f => !(f.k === 'n' && f.v === 1));
  if (!t.f.length) t.f = [N(1)];
  return t;
}
function normTerms(terms) {
  for (const t of terms) {
    const nf = [];
    for (const f of t.f) {
      if (f.k === 'p') {
        normTerms(f.terms);
        if (f.terms.length === 1) { const it = f.terms[0]; if (it.neg) t.neg = !t.neg; nf.push(...it.f); continue; }
      }
      nf.push(f);
    }
    t.f = nf;
    cleanTerm(t);
  }
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i];
    if (t.f.length === 1 && t.f[0].k === 'p') {
      const inner = t.f[0].terms;
      if (t.neg) inner.forEach(it => { it.neg = !it.neg; });
      terms.splice(i, 1, ...inner); i += inner.length - 1;
    }
  }
}
const isUnit = side => side.length === 1 && side[0].f.length === 1 && side[0].f[0].k === 'n' && side[0].f[0].v === 1;
function negate(side) {
  if (side.length === 1) side[0].neg = !side[0].neg;
  else side.forEach(t => { t.neg = !t.neg; });
}
function normalize(S) {
  for (const P of S.parts) for (const side of SIDES) {
    normTerms(P[side]);
    if (!P[side].length) P[side] = [T([N(side === 'num' ? 0 : 1)])];
  }
  // a fraction that is used up (±1 over ±1) disappears; its sign goes to the other one
  for (let i = 0; S.parts.length > 1 && i < S.parts.length; i++) {
    const P = S.parts[i];
    if (isUnit(P.num) && isUnit(P.den)) {
      const other = S.parts[1 - i];
      if (P.num[0].neg !== P.den[0].neg) negate(other.num);
      S.parts.splice(i, 1); i--;
    }
  }
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
  if (ps.length !== 1 || !tidy(t, true)) return false;
  const inner = ps[0].terms;
  let g = 0; inner.forEach(it => { g = gcd(g, coefAbs(it)); });
  if (g > 1) return false;
  return !varPart(inner[0]).some(v => inner.every(it => varPart(it).some(w => w.b === v.b)));
}
function isClean(S) {
  if (S.goal === 'factor') return isFactored(S);
  if (S.parts.length > 1) return false;
  const P = S.parts[0];
  for (const side of SIDES) {
    const ts = P[side];
    if (!ts.every(t => tidy(t, !!S.allowB))) return false;
    const sigs = ts.map(sig);
    if (new Set(sigs).size !== sigs.length) return false;
  }
  if (isOne(P.den)) return true;
  const all = [...P.num, ...P.den];
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
  if (f.k === 'p') return `(${sumHTML(f.terms)})`;
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
  if (f.k === 'p') {   // open the brackets: multiply everything outside with every term inside
    const before = mx(termHTML(L.term));
    const others = L.term.f.filter(g => g !== f);
    const origins = {};
    const nts = f.terms.map(it => {
      const copies = others.map(o => { const k = cloneF(o); origins[k.id] = [o.id]; return k; });
      return T([...copies, ...it.f], L.term.neg !== it.neg);   // inner pieces keep their identity and slide
    });
    L.terms.splice(L.t, 1, ...nts);
    return { ok: others.length ? 'distribute' : 'unwrapSum', p: { x: before, ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins, arcs: true };
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
  if (x.k === 'n' && y.k === 'n') {
    if (x.v === y.v) return x.v === 1 ? { type: 'none' } : { type: 'cancel' };
    if (gcd(x.v, y.v) === 1) return { type: 'fizzle', msg: 'cancelCoprime', p: { a: x.v, b: y.v } };
    return { type: 'fizzle', msg: 'cancelUnequalNum', p: { a: x.v, b: y.v } };
  }
  return null;
}
function pairCheck(S, A, B) {
  const x = A.f, y = B.f;
  if (A.p !== B.p) {
    if (S.op !== '·') return { type: 'fizzle', msg: 'diffFrac' };
    if (A.side === B.side) return { type: 'move' };
    const PA = S.parts[A.p], PB = S.parts[B.p];
    const single = PA[A.side].length === 1 && PB[B.side].length === 1 && !A.depth && !B.depth;
    if (single) { const cr = cancelCheck(x, y); if (cr && cr.type !== 'none') return cr; }
    return { type: 'fizzle', msg: 'crossSide' };
  }
  if (A.terms === B.terms) {
    if (A.term === B.term) return canMerge(x, y) ? { type: 'merge' } : { type: 'none' };
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
  const sameVar = x.k === 'v' && y.k === 'v' && x.b === y.b;
  const nums = x.k === 'n' && y.k === 'n';
  const grp = (x.k === 'g' && (y.k === 'g' || (y.k === 'v' && groupHasBase(x, y.b)) || y.k === 'n'))
    || (y.k === 'g' && ((x.k === 'v' && groupHasBase(y, x.b)) || x.k === 'n'));
  if (!sameVar && !nums && !grp) return { type: 'none' };
  if (P.num.length > 1 || P.den.length > 1) return { type: 'fizzle', msg: 'cancelSum' };
  if (grp) return { type: 'fizzle', msg: 'cancelGroup' };
  return cancelCheck(x, y);
}

function opFactor(S, A, B) {
  const x = A.f, y = B.f, terms = A.terms;
  let c, has, reduce;
  const tapped = new Map([[A.term, x], [B.term, y]]);
  if (x.k === 'n') {
    const g = x.v;
    c = N(g);
    var pickIn = t => tapped.get(t) || t.f.find(f => f.k === 'n' && f.v === g);
    has = t => !!pickIn(t);
  } else {
    const m = x.e, b = x.b;   // exact matches only: x and y have the same exponent
    c = V(b, m);
    pickIn = t => tapped.get(t) || t.f.find(f => f.k === 'v' && f.b === b && f.e === m);
    has = t => !!pickIn(t);
  }
  const set = terms.filter(has);
  const picked = set.map(t => pickIn(t));
  const inner = set.map((t, i) => { t.f.splice(t.f.indexOf(picked[i]), 1); return cleanTerm(t); });
  const ex = mx(set.map((t, i) => (i === 0 ? (t.neg ? '−' : '') : (t.neg ? ' − ' : ' + ')) + fx(c) + '·' + termHTML(inner[i])).join(''));
  const nt = T([c, Pr(inner)]);
  const at = terms.indexOf(set[0]);
  set.forEach(t => terms.splice(terms.indexOf(t), 1));
  terms.splice(at, 0, nt);
  const leftOne = inner.some(t => t.f.length === 1 && t.f[0].k === 'n' && t.f[0].v === 1);
  return { ok: leftOne ? 'factorOne' : 'factor', p: { c: mx(fx(c)), ex, r: mx(termHTML(nt)) }, born: [c.id], origins: { [c.id]: picked.map(f => f.id) }, arcs: true };
}

function opPair(S, aId, bId) {
  const A = locate(S, aId), B = locate(S, bId);
  const r = pairCheck(S, A, B);
  if (r.type === 'fizzle') return { no: r.msg, p: r.p || {}, ids: [aId, bId] };
  if (r.type === 'none') return null;
  if (r.type === 'move') return opMove(S, A, B);
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
  if (x.k === 'v') { x.e = 0; y.e = 0; } else { x.v = 1; y.v = 1; }
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
  if (A.p !== B.p) return { no: 'diffFrac', ids: [aId, bId] };
  if (A.terms !== B.terms) return { no: A.side !== B.side ? 'termSide' : 'bracketWall', ids: [aId, bId] };
  if (!tidy(A.term) || !tidy(B.term)) return { no: 'untidy', ids: [aId, bId] };
  if (sig(A.term) !== sig(B.term)) return { no: 'notLike', p: { v1: mx(termHTML(A.term)), v2: mx(termHTML(B.term)) }, ids: [aId, bId] };
  const vp = varPart(A.term);
  const r = addTermsIn(A.terms, [A.term, B.term].sort((a, b) => A.terms.indexOf(a) - A.terms.indexOf(b)));
  if (!r.nt) return { ok: 'likeZero', p: { ex: r.ex } };
  return { ok: 'likeAdd', p: { v: vp.length ? mx(factorsHTML(vp)) : '1', ex: r.ex, r: r.r }, born: r.born, origins: r.origins };
}

function opSplit(S, tid) {
  const L = locate(S, tid), t = L.term;
  const c = coefAbs(t), vp = varPart(t);
  if (!tidy(t) || !vp.length || c < 2 || c > MAX_SPLIT) return { no: 'splitNo', ids: [tid] };
  const origins = {};
  const nts = Array.from({ length: c }, () => T(vp.map(v => { const k = cloneF(v); origins[k.id] = [v.id]; return k; }), t.neg));
  L.terms.splice(L.t, 1, ...nts);
  return { ok: 'split', p: { x: mx(termHTML(t)), n: c, v: mx(factorsHTML(vp)), ex: mx(sumHTML(nts)) }, born: Object.keys(origins).map(Number), origins };
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
  if (S.parts.length < 2) return null;
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

function hint(S) {
  if (S.parts.length > 1) {
    if (S.op === '/') return { k: 'hBar', ids: ['op'] };
    if (S.op === ':') return { k: 'hDiv', ids: ['op'] };
    const [P1, P2] = S.parts;
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
    if (L.f.k === 'g') h = { k: 'hGroup', p: { x: mx(fx(L.f)) }, ids: [L.f.id] };
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
  if (S.goal === 'factor') {
    for (const ts of containers(S)) {
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        if (tidy(ts[i]) && tidy(ts[j]) && sig(ts[i]) === sig(ts[j])) continue;
        for (const a of ts[i].f) for (const b of ts[j].f) {
          if ((a.k === 'n' && b.k === 'n' && a.v === b.v && a.v > 1) || (a.k === 'v' && b.k === 'v' && a.b === b.b && a.e === b.e))
            return { k: 'hFactor', p: { x: mx(fx(a)), y: mx(fx(b)) }, ids: [a.id, b.id] };
        }
      }
    }
  }
  eachTerm(S, L => {
    const t = L.term;
    for (let i = 0; !h && i < t.f.length; i++) for (let j = i + 1; !h && j < t.f.length; j++)
      if (canMerge(t.f[i], t.f[j])) h = { k: 'hMerge', p: { x: mx(fx(t.f[i])), y: mx(fx(t.f[j])) }, ids: [t.f[i].id, t.f[j].id] };
  });
  if (h) return h;
  const pick = t => t.f.find(f => f.k === 'v') || t.f[0];
  for (const ts of containers(S))
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++)
      if (tidy(ts[i]) && tidy(ts[j]) && sig(ts[i]) === sig(ts[j]))
        return { k: 'hLike', p: { x: mx(termHTML(ts[i])), y: mx(termHTML(ts[j])) }, ids: [pick(ts[i]).id, pick(ts[j]).id] };
  if (S.goal === 'factor') {
    for (const ts of containers(S)) {
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const na = ts[i].f.find(f => f.k === 'n'), nb = ts[j].f.find(f => f.k === 'n');
        if (na && nb && na.v !== nb.v && gcd(na.v, nb.v) > 1) return { k: 'hExplodeNums', p: { x: na.v, y: nb.v }, ids: [na.id, nb.id] };
        for (const va of varPart(ts[i])) for (const vb of varPart(ts[j])) {
          if (va.b === vb.b && va.e !== vb.e) {
            const big = va.e > vb.e ? va : vb, small = big === va ? vb : va;
            return { k: 'hExplodeVar', p: { x: mx(fx(big)), y: mx(fx(small)), b: bx(big.b) }, ids: [big.id] };
          }
        }
      }
    }
  }
  if (S.goal !== 'factor' && !S.allowB) {
    eachFactor(S, L => { if (!h && L.f.k === 'p') h = { k: 'hOpen', p: { x: mx(termHTML(L.term)) }, ids: [L.f.id] }; });
    if (h) return h;
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
];
function buildLevel(i) { const S = LEVELS[i].s(); S.op = S.op || null; S.goal = LEVELS[i].goal || 'simplify'; return S; }
/* ===== END CORE ===== */
