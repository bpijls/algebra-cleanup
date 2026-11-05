# Algebra Cleanup (Algebra Opruimen)

A tile game for secondary school students who are just starting algebra. Students currently learn the rules (multiply exponents, add exponents, cancel, factor) as recipes. This game makes them *see* what happens underneath: every expression is made of tiles that can be **exploded** into their parts and **regrouped**, and the rules come out of doing that.

Mobile first, works on desktop. English and Dutch (Dutch school notation: `:` for division, `·` for multiplication, "buiten haakjes brengen").

## The core design rule: no magic

Nothing may happen that the player can't see the reason for. Every simplification has to be earned by exploding and regrouping. This rule came from repeated playtesting feedback; do not reintroduce shortcuts.

Concretely:

- **Cancelling needs exactly equal pieces.** `x¹²` over `x³` does not cancel. The player explodes `x¹²`, regroups three x's into `x³`, and cancels `x³` against `x³`. Numbers likewise: `12/4` needs `2·2·3 / 2·2`, then the 2's cancel in pairs.
- **Factoring (putting outside brackets) needs exactly equal pieces.** `6a + 9b`: 6 and 9 are refused; explode to `2·3·a + 3·3·b`, then tap the two 3's. `a²` with `a` is refused; explode `a²` first.
- **Factoring is allowed in every mode**, because it is always valid algebra. In simplify levels, factoring two tidy unlike terms is allowed but flagged (`factorUseless`) and those pairs don't glow as suggestions.
- **Like terms add when you tap matching pieces across a + sign** (`a` then `a` gives `2a`), and the note contrasts `a + a = 2a` with `a · a = a²`. Unlike terms in simplify levels get the `notLike` explanation.
- **A swipe is accepted only as ONE valid move**: grouping matching pieces inside one term, or adding like terms by sweeping one matching piece per term. Anything else is refused as a whole with an explanation. (An earlier box-select did many operations at once and felt like magic.)
- **Dividing fractions**: the sign cycles fraction bar → `:` → `·` → fraction bar (each tap). `:`→`·` flips the second fraction. With `·`, the player multiplies **by hand**: tap a piece in one fraction, then a piece in the same row (top/bottom) of the other, and it moves across. Cross-cancelling between the fractions follows the equal-pieces rule. A fraction that becomes 1/1 disappears. There is no automatic join.
- **Refusals are teaching moments.** An illegal move never silently fails: the tiles shake and the note explains why (e.g. cancelling inside a sum → `cancelSum`).

## Animation

Only the two bracket moves animate: putting outside brackets (the shared pieces fly along arcs to the front and merge, the rest slides into the brackets) and opening brackets (the outside factor sends a copy along an arc to each term, alternating above/below). A red motion path is drawn along each arc. All other moves just pop into place; the user found animating everything less clear. Cancelling keeps a short spin-away. Respect `prefers-reduced-motion`.

## Architecture

Plain browser scripts sharing globals, no framework, no build step needed to run.

| File | What it holds |
|---|---|
| `src/core.js` | The algebra model and every move. No DOM. |
| `src/practice.js` | Random problem generator (`GEN`, `makeProblem`) and `autoSolve`. |
| `src/i18n.js` | `I18N.en` / `I18N.nl`: all player-facing text. |
| `src/ui.js` | Rendering, tap/swipe input, animation, level and practice screens. |
| `src/styles.css` | All styling. Design tokens (light/dark) at the top. |
| `index.html` | Loads the above for local development. |
| `scripts/build.mjs` | Inlines everything into `dist/algebra-cleanup.html` (single file, claude.ai Artifact format). |
| `tests/` | `node:test` suite; `tests/load.js` loads core + practice into a VM sandbox. |

### Data model (`core.js`)

- State `S = { parts: [Fraction, ...], op: null | ':' | '·' | '/', goal: 'simplify' | 'factor', allowB? }`. Two parts only while dividing/multiplying fractions.
- `Fraction = { num: Term[], den: Term[] }` (each side is a sum of terms).
- `Term = { k:'t', f: Factor[], neg }`.
- Factors: `N(v)` number, `V(b, e)` letter with exponent, `G(f, e)` bracket around a *product* with exponent, `Pr(terms)` bracket around a *sum*. Every node has a unique `id`; tiles in the DOM carry it as `data-id`.
- `normalize(S)` cleans up after every move (drops `1`s and `x⁰`, unwraps one-term brackets, drops used-up fractions, collapses `(a/1)/(b/1)`).
- `isClean(S)` decides a win. `goal: 'factor'` levels use `isFactored`.

### Move contract

Every move function either:
- mutates `S` and returns `{ ok: messageKey, p: params, born: [ids], origins?: { newId: [sourceIds] }, arcs?: true }`, or
- leaves `S` untouched and returns `{ no: messageKey, p: params, ids: [idsToShake] }`, or
- returns `null` (not a meaningful pair; the UI just changes the selection).

`pairCheck(S, A, B)` decides what tapping A then B means (`merge`, `cancel`, `addTerms`, `factor`, `move`, `fizzle`, `none`). `hint(S)` returns the next suggested move; `autoSolve` follows hints, and the generator only accepts problems it can solve in ≤ 60 moves, that don't start clean and don't end as 0.

Message keys in `ok`/`no` map to `I18N` entries. **Every new key needs both an English and a Dutch string.** Params named `extra` are flattened into the template params.

## Content

- 20 levels in `LEVELS` (core.js): powers, like terms, fractions, two-letter terms, four textbook problems (marked `book: true`), opening brackets, and four "outside brackets" levels (`goal: 'factor'`).
- Practice mode: six topics (powers, like terms, fractions, opening brackets, outside brackets, textbook mix) × three difficulties.

## Commands

```
npm test        # run the test suite (node 18+)
npm run build   # write dist/algebra-cleanup.html
npm start       # serve the folder locally (or just open index.html)
```

Run `npm test` after any change to `core.js` or `practice.js`; the suite checks that every level and generated problem is still solvable and that the no-magic rules hold.

## Known limitations and ideas

- Letters only `a, b, x, y` have their own colours (others fall back to one colour).
- You can't combine a tile inside brackets with one outside; the player must open the brackets first (`bracketWall`).
- Swiping blocks page scrolling on the board (`touch-action: none`), which could matter for very long expressions.
- The swipe hit-testing and animations were never tested on a real device during the prototype; tune them there.
- Ideas raised: an exercise editor that turns typed textbook problems into levels; making `autoSolve` prefer the elegant regroup route (explode, regroup to the matching power, cancel) instead of exploding both sides.
