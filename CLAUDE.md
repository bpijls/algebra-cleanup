# Algebra Cleanup (Algebra Opruimen)

A tile game for secondary school students who are just starting algebra. Students currently learn the rules (multiply exponents, add exponents, cancel, factor) as recipes. This game makes them *see* what happens underneath: every expression is made of tiles that can be **exploded** into their parts and **regrouped**, and the rules come out of doing that.

Mobile first, works on desktop. English and Dutch (Dutch school notation: `:` for division, `·` for multiplication, "buiten haakjes brengen").

## The core design rule: no magic

Nothing may happen that the player can't see the reason for. Every simplification has to be earned by exploding and regrouping. This rule came from repeated playtesting feedback; do not reintroduce shortcuts.

Concretely:

- **Cancelling needs exactly equal pieces.** `x¹²` over `x³` does not cancel. The player explodes `x¹²`, regroups three x's into `x³`, and cancels `x³` against `x³`. Numbers likewise: `12/4` needs `2·2·3 / 2·2`, then the 2's cancel in pairs.
- **Factoring (putting outside brackets) needs exactly equal pieces.** `6a + 9b`: 6 and 9 are refused; explode to `2·3·a + 3·3·b`, then tap the two 3's. `a²` with `a` is refused; explode `a²` first. A whole bracket can be the shared piece: `a(x+2) + 3(x+2)` → `(x+2)(a+3)`.
- **Factoring takes only from the two tapped terms** (`2x + 2y + 2z` → `2(x + y) + 2z`; tap again to take the 2 out of the rest). The first term's sign comes out with it: `−3x + 6` → `−3(x − 2)` (message `factorNeg`).
- **A minus or a power in front of a bracket stays until the player opens it.** `−(x − 3)` is not unwrapped by `normalize`; tapping it twice gives `unwrapNeg`. `(a+b)²` explodes into `(a+b)·(a+b)` (like `G`), never straight to a sum.
- **No "write as ones" and no hidden 1.** Tapping a term twice just puts it down; a lone letter is an atom (`x` → `atom`). Both moves (`4x` → `x + x + x + x`, `x` → `1·x`) were removed at the user's request (Nov 2026) as clutter; the sum-product split below covers what they were used for. In factor levels the `… = … + …` button also appears when a *piece* of a tidy letter term is selected, because a lone `−x` is hard to hit as a term.
- **Sum-product (ontbinden):** `x² + 5x + 6` has nothing in all three terms. The player selects `5x`, presses the `5x = … + …` button and chooses `2x + 3x` with a slider (`showSplit`; the slider runs from −R to R with R = max(12, |coefficient| + 12) and skips 0 and the whole coefficient; `opSplitTwo`, any p with p + q = the coefficient, both ≠ 0). Then the pairs are factored (`x(x+2) + 3(x+2)`) and the shared bracket goes outside. Works for `ax² + bx + c` too when the split order leaves the same bracket twice.
- **Factoring is allowed in every mode**, because it is always valid algebra. In simplify levels, factoring two tidy unlike terms is allowed but flagged (`factorUseless`) and those pairs don't glow as suggestions.
- **Like terms add when you tap matching pieces across a + sign** (`a` then `a` gives `2a`), and the note contrasts `a + a = 2a` with `a · a = a²`. Unlike terms in simplify levels get the `notLike` explanation.
- **A swipe is accepted only as ONE valid move**: grouping matching pieces inside one term, or adding like terms by sweeping one matching piece per term. Anything else is refused as a whole with an explanation. (An earlier box-select did many operations at once and felt like magic.)
- **Dividing fractions**: the sign cycles fraction bar → `:` → `·` → fraction bar (each tap). `:`→`·` flips the second fraction. With `·`, the player multiplies **by hand**: tap a piece in one fraction, then a piece in the same row (top/bottom) of the other, and it moves across. Cross-cancelling between the fractions follows the equal-pieces rule. A fraction that becomes 1/1 stays on the board; the player taps its top 1 and bottom 1 to cancel it, and only then does it disappear (`pairCheck` type `ones`, message `cancelOnes`, hint `hCancelOnes`; only while the sign is `·`; a −1 passes its minus to the other fraction). There is no automatic join: the only join is the player tapping `·` once one fraction holds only a top and the other only a bottom, `(A/1)·(1/B)` or `(1/B)·(A/1)`, which becomes `A/B` (`joinable`, message `joined`, hint `hJoin`). Without that, the tap would flip `(1/B)·(A/1)` into the dead end `(1/B)/(1/A)`.
- **Move buttons show their result, not a verb.** "Explode" (into a product, `·`) and "split" (into a sum, `+`) both mean "break apart" in everyday language, so players couldn't tell them apart. The tool bar now labels each move with what it will do, computed by a dry run on a copy of the board (`previewOf` in ui.js): `12 = 2 · 2 · 3`, `x¹² = x · x · … · x`, `5(a + 2) = 5a + 5·2`, `a · a · a = a³`, and `5x = … + …` for the two-term sheet. A move that would be refused gets no button (the double tap still gives the explanation). Player-facing text uses "explode" for the product move; never "split".
- **Equations are solved with the balance method (weegschaalmethode).** A term never crosses the `=` by itself: tapping pieces or terms on opposite sides is refused (`diffSides`), so "move it across and flip the sign" is impossible. Tapping `=` toggles **balance mode** (`balancing` in ui.js): the top-level tiles wobble, and dragging one across the `=` does its inverse to both sides (`opDrag` → `dragBalance` → `opBalance`, all in core.js). A term in a sum → take it away (`3x + 5`: drag 5 → `− 5`); the number in a term alone on its side → divide by it (`3x`: drag 3 → `: 3`, sign included); anything below the bar → multiply by it; a lone `−x` → divide by −1; any other piece of a term alone → take the term away. `opBalance` only *writes* the operation on both sides (`3x + 5 − 5 = 20 − 5`, `3x/3 = 15/3`); the player then tidies each side with the usual moves. A successful drop ends balance mode; a refusal keeps it. Refused: `·`/`:` by a letter (`balanceLetter`, it could be 0), by 0, by 1, `+`/`−` while a side is a fraction (`balanceFrac`: multiply first), a term with brackets (`dragBracket`). In balance mode the tool bar shows "swap sides" (`opSwap`) and "type it", which opens the old typed sheet (`showBalance`) for anything a drag can't express. A press within 22px of a piece picks it up (`pieceNear`): the tiles wobble and fingers are wide. Keyboard: Enter on a tile in balance mode moves it across.
- **The player decides when it's done.** Nothing wins by itself: the win sheet used to pop up the moment `isClean` held, often before the player saw why. Now the player presses **Done?** (`btnDone`, top right) when they think nothing is left. If it is clean, the win sheet opens. If not, `whyNotDone(S)` (core.js) explains what is left without naming the move (`ny…` keys: like terms left, a term that can be shorter, brackets to open, top and bottom share a number or letter, still a sum, a bracket that still factors, the letter not alone…), and play goes on with no penalty. When clean, the hint says so (`hDone`) and makes Done? glow. Level 1's intro introduces the button.
- **Quadratic equations are solved with the same moves, plus two that branch.** There is no formula to fill in. **√ both sides** (`opRoot`, button `btnRoot`, label `x + 3 = ±√5`): a square alone on one side (`x²`, `(x+3)²`, `(2x+3)²`) and a value without the letter on the other gives two branches, `x + 3 = √5 ∨ x + 3 = −√5` (`rootBoth`; `= 0` gives one, `rootZero`). Refused: a coefficient before the square (`rootCoef`, divide first), no square (`rootNoSquare`), letters on the other side (`rootLetter`), a fraction (`rootFrac`), a negative value (`rootNeg`: no real solutions). **Product = 0** (`opZero`, `btnZero`): `3x(x−2)(x+5) = 0` → `x = 0 ∨ x − 2 = 0 ∨ x + 5 = 0`, a branch per factor with the letter (`zeroProduct`; refused for a sum, `zeroSum`, or one factor, `zeroOne`). Completing the square is ordinary balance: the hint says which number makes the square complete (`hComplete`, `+k²` on both sides); when `a ≠ 1` and b is odd it first multiplies by `4a` (`hMul4a`), which makes `(2ax + b)² = b² − 4ac`. The abc-formula is never shown up front: the win sheet of the last level reveals it (`abcReveal`, `abcHTML` in ui.js) as what the player just did.
- **A root is a tile.** `Rt(terms)` (kind `r`): its inside is a sum, like a bracket's. It is tidy when it holds one squarefree number above 1 (`rootClean`). Explode the number under it (`12` → `2·2·3`) and tap the two 2's: a pair comes out as one (`rootOut`, `√(2·2·3)` → `2√3`). Exploding the root itself is refused (`rootTap`). Roots are like terms or a shared factor only when their insides are equal (`√2` and `√8` are not, until `√8` is `2√2`). `normTerms` turns `√0` and `√1` into numbers.
- **Branches don't mix.** Tiles from different branches never combine (`diffBranch`); every move works on one branch (index `bi`).
- **The rest of a sum can be the bracket once** (`factorRest`): `x(x − 5) + x − 5` → `(x − 5)(x + 1)`, tapping the bracket and a loose term that belongs to it (`restOf`, hint `hFactorRest`). It is the step after `x² − 5x + x − 5` without the extra `1·(x − 5)`.
- **A bracket shared by several terms is shown as one block.** Picking a bracket that can go outside together with its twin in another term folds every copy into a dark block tile (`blockOf` in ui.js, `.tile.p.block`), so `x(x + 2) + 3(x + 2)` reads `x·[x+2] + 3·[x+2]`: visibly the familiar `2a + 2b = 2(a + b)` (note `pickedBlock`). The move's note (`factorBlock`) writes it with blocks first, then in full; `blockHTML(terms, key)` and factor kind `bk` render the block in notes. The move itself is the ordinary `opFactor`; the block is display only.
- **Refusals are teaching moments.** An illegal move never silently fails: the tiles shake and the note explains why (e.g. cancelling inside a sum → `cancelSum`).

## Animation

Only the two bracket moves animate: putting outside brackets (the shared pieces fly along arcs to the front and merge, the rest slides together, and only then does the new bracket close around it: `wrap` id from `opFactor`, class `wrapin`) and opening brackets (the outside factor sends a copy along an arc to each term, alternating above/below). A red motion path is drawn along each arc. All other moves just pop into place; the user found animating everything less clear. Cancelling keeps a short spin-away. Respect `prefers-reduced-motion`.

## Architecture

Plain browser scripts sharing globals, no framework, no build step needed to run.

| File | What it holds |
|---|---|
| `src/core.js` | The algebra model and every move. No DOM. |
| `src/practice.js` | Random problem generator (`GEN`, `makeProblem`), `autoSolveStep` and `autoSolve`. |
| `src/parse.js` | `parseProblem(text, goal)` turns typed textbook notation (`(x+3)(x-2)`, `12a^5/4a^2`, `12a⁵ : 4a²`, `(8x/3y):(3x/y)`, `−2(x+4)`, equations like `5x+3=2x+12`) into a state, or `{ err, at }` with an i18n key (`pParen`, `pFracSum`, …). `guessGoal` picks factor for a plain clean sum and solve for an equation. A sum next to `/` must be bracketed (`x/3 + 2` would read as `x/(3+2)`: `pFracSum`). An equation needs exactly one letter (`pEqLetters`, `pEqNoLetter`). |
| `src/i18n.js` | `I18N.en` / `I18N.nl`: all player-facing text. |
| `src/ui.js` | Rendering, tap/swipe/drag input, animation, the menu and floating bars, level and practice screens. |
| `src/styles.css` | All styling. Design tokens (light/dark) at the top. |
| `src/pwa.js` | Registers the service worker. Left out of the Artifact build. |
| `index.html` | Loads the above; also the page nginx serves. |
| `sw.js` | Service worker: precaches `SHELL`, network-first for own files, cache-first for Google Fonts. |
| `manifest.webmanifest` | PWA manifest (standalone, icons). |
| `icons/` | `icon.svg` is the source; the PNGs (192, 512, maskable 512, 180 apple-touch) are rendered from it. |
| `scripts/build.mjs` | Inlines everything into `dist/algebra-cleanup.html` (single file, claude.ai Artifact format), stripping the manifest, icon links and `pwa.js`. |
| `docker-compose.yml` | One `web` service (nginx) with Caddy labels for `APP_DOMAIN`. |
| `nginx/default.conf` | Static serving, no-cache, fallback to `index.html`. |
| `tests/` | `node:test` suite; `tests/load.js` loads core, practice, parse and i18n into a VM sandbox. |
| `tests/judge.js` | The outside judge: evaluates a state numerically at random letter values; `fuzz` plays random moves (every explode, pair, split, sign tap, and for equations every drag across the `=`, every balance move and swap, plus ones that must be refused) and fails if any move changes the value (for an equation `L = R`: if `L − R` changes by anything but one nonzero constant, so the solutions change; `equivalent`), a refused move mutates the state, or a message has no text. |
| `tests/done.test.js` | Done?: `whyNotDone` gives a reason with EN and NL text on every unfinished state along the hint path, and accepts every finished one; the block wording. |
| `tests/quadratic.test.js` | Root of both sides, product = 0, `rootOut`, `diffBranch`, `factorRest`; every quadratic level and practice problem solved by the hints with the same solutions (fuzzing from branched states); `4a` + completing the square lands on `(−b ± √D)/2a`. |
| `tests/corpus.test.js` | Textbook exercises per chapter (machten … ontbinden, vergelijkingen, kwadratische vergelijkingen), typed as a student would; each must parse, be solved by the hints to the textbook answer, and keep its value. Add new exercise types here first. |

### Data model (`core.js`)

- State `S = { parts: [Fraction, ...], op: null | ':' | '·' | '/' | '=', goal: 'simplify' | 'factor' | 'solve', allowB? }`. Two parts only while dividing/multiplying fractions, or for an equation (`op: '='`, left and right). An equation that has branched (`x = 3 ∨ x = −3`) keeps them flat: `parts = [L1, R1, L2, R2, …]`; `branchCount`, `pairOf(S, bi)`, `eqView(S, bi)` (a view that shares tiles), and `stateHTML` joins them with `orWord()` (`or` / `∨`). `isClean` for `goal: 'solve'` is `isSolved`: in every branch one side is the letter alone, the other a clean value without it (`x = 9/2`, `x = 2√3`, `x = (√17 − 3)/4` count). `normalize` moves a minus from below a bar to the top (`6/−2` → `−6/2`) and drops `+ 0` terms.
- `Fraction = { num: Term[], den: Term[] }` (each side is a sum of terms).
- `Term = { k:'t', f: Factor[], neg }`.
- Factors: `N(v)` number, `V(b, e)` letter with exponent, `G(f, e)` bracket around a *product* with exponent, `Pr(terms, e)` bracket around a *sum* with exponent. Every node has a unique `id`; tiles in the DOM carry it as `data-id`. `sumKey(terms)` compares sums regardless of term and factor order.
- `normalize(S)` cleans up after every move (drops `1`s and `x⁰`/`(…)⁰`, unwraps one-term brackets (a one-term `Pr` with a power becomes a `G`), unwraps a bare `+(…)` term but never `−(…)` or `(…)²`, collapses `(a/1)/(b/1)`). A bracket that is the whole top or bottom of a fraction stays a bracket, so `(x+2)/((x+2)(x+3))` can cancel it as one piece; `isClean` reads such a side as its sum (`unbare`).
- `isClean(S)` decides whether Done? wins. `goal: 'factor'` levels use `isFactored`: one term, a tidy rest, any number of *different* brackets (`(x+2)(x+2)` must be merged to `(x+2)²`), each with no common factor and not a trinomial that `quadSplit` can still split.

### Move contract

Every move function either:
- mutates `S` and returns `{ ok: messageKey, p: params, born: [ids], origins?: { newId: [sourceIds] }, arcs?: true }`, or
- leaves `S` untouched and returns `{ no: messageKey, p: params, ids: [idsToShake] }`, or
- returns `null` (not a meaningful pair; the UI just changes the selection).

`pairCheck(S, A, B)` decides what tapping A then B means (`merge`, `cancel`, `addTerms`, `factor`, `move`, `fizzle`, `none`). `hint(S)` returns the next suggested move; `autoSolve` follows hints, and the generator only accepts problems it can solve in ≤ 60 moves, that don't start clean and don't end as 0.

Factor-goal hints (`factorHint`, `sumProductHint`) work on a *focus*: the terms without a bracket once some term has one (`x(x+2) + 3x + 6` → work on `3x + 6`), or the first pair of a four-term sum. In order: a bracket shared by two terms; a piece exactly in every focus term; explode a number or power that hides a shared factor (`hExplodeFor`, `hExplodeVar`); merges; like terms; then the sum-product split (`hSumProduct`, carries `split`). In simplify levels the merge hint never folds `(a+b)(a+b)` back into a square.

Equation hints (`eqHint`): first tidy each side with the ordinary hints (`hint(sideView(P))`), then: a fraction → multiply both sides by its bottom (`hBalanceMul`); letters only on the right → swap (`hSwap`); a letter term on the right or a number on the left → take it away from both sides (`hBalanceTerm`); `a·x = c` → divide by `a` (`hBalanceDiv`). Balance hints carry `drag` (the piece to drag; for a term alone on its side a non-number tile, since dragging its number would divide) and `balance: { op, value }`; `autoSolveStep` plays `opDrag(S, h.drag)`, and a corpus test checks that the drag does exactly what `balance` says.

Quadratic hints: `eqHint` gives each branch `quadHint` when `quadOf` finds an `x²` term, else `pairHint` (the linear route above). `quadHint`, in order: swap; product = 0 (`hZero`); merge equal brackets; a square alone → root (tidy the other side first; `hRoot`, or divide away a coefficient); factoring under way → the factor-goal hints on the left side; tidy; letters to the left; a perfect square → sum-product; factorable (`quadSplit`) → everything to the left, `= 0`, sum-product; `D < 0` → `hNoRealD` (no move); else constant to the right, then `hComplete` (+k²) or `hMul4a` (×4a). Hints carry `zero`, `root` or `balance` (with `bi`); `autoSolveStep` plays them. `hNoReal*` returns null (nothing to do).

Overflow: number merges above 1e12 and balance products above 1e12 are refused (`tooBig`), which keeps random play finite.

Message keys in `ok`/`no` map to `I18N` entries. **Every new key needs both an English and a Dutch string**, and a key may appear only once per language (`tests/i18n.test.js`; button labels use `…Btn` keys so they can't collide with move messages). Params named `extra` are flattened into the template params.

## Content

- 41 levels in `LEVELS` (core.js): powers, like terms, fractions, two-letter terms, four textbook problems (marked `book: true`), opening brackets, a minus before brackets, double brackets, `(a+b)²`, then seven "outside brackets" levels (`goal: 'factor'`) ending with a shared bracket and two sum-product trinomials. Then seven equation levels (`goal: 'solve'`): `x + 3 = 7`, `3x = 12`, `3x + 5 = 20`, `5x + 3 = 2x + 12`, `x/3 = 4`, `2(x + 3) = 4x − 2`, `4x − 3 = 2x + 6`. Then eight quadratic levels: `x² = 9`, `2x² = 24`, `(x + 3)² = 5`, `(x − 2)(x + 5) = 0`, `x² + 5x + 6 = 0` (book), `x² + 6x + 4 = 0` (complete the square), `x² + 3x + 1 = 0`, `2x² + 3x − 1 = 0` (book, ×4a, ends with the abc reveal: `abc: {a, b, c}` on the level).
- Practice mode: ten topics (powers, like terms, fractions, opening brackets, double brackets, special products, outside brackets, sum-product factorising, equations, quadratic equations, textbook mix) × three difficulties. `GEN.quadratic`: d1 `x² = c`, `(x + p)² = c`, a product = 0, `kx² = …`; d2 factorable or completing the square with even b; d3 odd b with gcd(a, b) = 1 and D > 0 not a square (the ×4a route).
- Your own problem: Practice → "Type your own problem" (`showOwn` in ui.js, `mode = 'custom'`). Live preview while typing, goal chips (simplify / factorise, guessed until the player picks), example chips. If `autoSolve` finds no route the problem still plays, with `ownUnsure` saying the hint won't help.

## Commands

```
npm test        # run the test suite (node 18+)
npm run build   # write dist/algebra-cleanup.html
npm start       # serve the folder locally (or just open index.html)
```

Run `npm test` after any change to `core.js`, `practice.js` or `parse.js`; the suite checks that every level, generated problem and corpus exercise is still solvable, that random play never changes an expression's value, and that the no-magic rules hold. A new move needs nothing extra to be judged: `fuzz` in `tests/judge.js` tries every move on every state it reaches (add new move functions to its `candidates`).

## Running the stack

Hosted at https://huiswerk.paws.home through Caddy Docker Proxy. The `web` service is plain `nginx:1.30-alpine` serving `index.html` and `src/` straight from the repo (read-only mounts, `Cache-Control: no-cache`), so edits are live on reload with no rebuild. `dist/` is not used here; it is only for the claude.ai Artifact build.

```
docker compose up -d        # start (needs the external `proxy` network)
docker compose logs -f web
docker compose down
```

**Screen layout.** The board fills the whole screen (`.board`, `position: absolute; inset: 0`). The level line, the Done? button and the formula float on top (`#hudTop`; the formula has its own full-width line), with a menu button that opens `#menu` (levels, practice, restart, language). The note and the one-row tool bar float at the bottom (`#hudBottom`). The bars let taps through to the board except on their own controls. `hudFit` sets the board's `--hud-top`/`--hud-bottom` padding so the tiles are centred in the free space. It reserves room for a two-line note only: a longer note floats over the board instead of moving the tiles, because tiles that jump whenever the message changes are hard to drag. On phones Undo, Hint and Skip are icons (their labels stay as hidden text). **Landscape phones** (`orientation: landscape` and height ≤ 500px) are short on height, so the level line, the formula (without its caption) and the buttons share one row and the note sits beside the tool bar instead of above it: the bars reserve about 137px instead of 241px on a 375px-tall screen. Notes must therefore not say "the button below".

**Board width.** `fitBoard` (ui.js) runs after every render. An equation is measured with nothing wrapping (`.expr.oneline`); if it fits at 72% zoom or more it stays on one line, like a balance, otherwise the `=` stays with the right-hand side (`.eqright`) so a line break only ever comes before the `=`. Branches are rows (`.expr.eqs` > `.eqrow[data-b]`, `.ortag` between); `fitBoard` tries them stacked and side by side (`.across`) and keeps the larger zoom, so two branches in landscape sit next to each other instead of under the note. Any line still wider than the board is zoomed down (not below 55%). Then `fitHeight` zooms down an expression taller than the space between the bars (same 55% floor), so a fraction in landscape shrinks instead of scrolling under the note; `hudFit` re-runs `fitBoard` when the bar heights change.

**Gotcha: single-file mounts.** `index.html`, `sw.js`, `manifest.webmanifest` and `nginx/default.conf` are bind-mounted as single files, which pin the file's inode. Anything that replaces the file instead of rewriting it (`sed -i`, many editors' atomic save, `git checkout`) leaves the container serving the old copy. After changing one of them, run `docker compose up -d --force-recreate` and check with `docker compose exec web grep … /usr/share/nginx/html/index.html`. `src/` and `icons/` are directory mounts and don't have this problem.

### Progressive web app

Installable and playable offline once opened. `sw.js` is network-first for the game's own files (4 s timeout, then cache), so server edits still show up on the next load; it only falls back to the cache offline. When you add a file that `index.html` loads, add it to `SHELL` in `sw.js` and to the compose mounts, and bump `VERSION`; `tests/pwa.test.js` fails if `SHELL` misses something. nginx serves `manifest.webmanifest` as `application/manifest+json` (it is not in nginx's `mime.types`).

Service workers need a trusted HTTPS origin (or `localhost`). huiswerk.paws.home uses Caddy's local CA, so a phone must trust that CA, or the game still loads but won't install or work offline.

If you change `icons/icon.svg`, re-render the PNGs at the same sizes (headless Chromium with the Google Fonts loaded, so the `a²` uses STIX Two Text and Atkinson Hyperlegible).

Config is in `.env` (copy `.env.example`): `APP_DOMAIN`, `CADDY_NETWORK`, `HOST_PORT` (only for the commented-out `ports:` block).

## Known limitations and ideas

- Letters only `a, b, x, y` have their own colours (others fall back to one colour).
- You can't combine a tile inside brackets with one outside; the player must open the brackets first (`bracketWall`).
- Swiping blocks page scrolling on the board (`touch-action: none`), which could matter for very long expressions.
- The swipe hit-testing and animations were never tested on a real device during the prototype; tune them there.
- Not yet possible (the parser or the hints say so): equations with a fraction added to other terms (`x/3 + 2 = 5`), or with two letters; complex solutions (`D < 0` is explained, not solved); typed quadratics with `a ≠ 1` and even b, or a common factor, aren't always solved by the hints (`ownUnsure` covers them), and factoring a large square like `16x² + 12x + 12x + 9` takes one 2 at a time; `x² − 9` as `(x+3)(x−3)` (there is no middle term to split; it would need a "write 0 as 3x − 3x" move); fractions that need factoring before cancelling, like `(x²+5x+6)/(x+2)` (factoring is only hinted in factor goals); `ax² + bx + c` with a common factor *and* a ≠ 1 at once is untested.
- `(−2a)³` is shown as `−(2a)³` straight away, because a `G` can't hold a sign.
- Ideas raised: making `autoSolve` prefer the elegant regroup route (explode, regroup to the matching power, cancel) instead of exploding both sides; factoring a number fully in one go (`4x + 12` now goes `2(2(x+3))` → `4(x+3)`).
