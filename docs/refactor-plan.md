# Algebra Cleanup: refactoring plan towards an extendible algebra system

## Context

The game grew one feature at a time: powers, then fractions, factoring, equations, roots and branches, and finally letters for numbers. Each feature was added where it fit at that moment.

The next goals are bigger: more algebra, goniometry (sin/cos), logarithms, and showing how identities are *built*. At that size, the current shape makes every new topic expensive.

This plan says what I would have designed differently, framed with SOLID. It then gives a step-by-step migration that keeps the game working and the test suite green at every step. **No behaviour changes**: the no-magic rules, the moves and the hints stay exactly as they are.

### What the code looks like now (measured)

- `src/core.js`: 91 KB, ~1450 lines.
  - It holds the model, normalisation, every move, every hint strategy, done-checks, HTML rendering (`stateHTML`, `fracHTML`, `sqHTML`, `mx(...)` 82×) and all 48 levels (16 KB).
  - Biggest functions: `genHint` 6 KB, `quadHint` 4.8 KB, `hint` 4 KB, `pairCheck` 4 KB, `opPair` 3.2 KB, `opBalance` 3.2 KB.
- **Node kinds are a closed set** (`n v g p r`), dispatched by hand:
  - `f.k === '…'` appears ~100× in core.js, plus ui.js, parse.js and practice.js;
  - so adding `sin`, `log` or `π` means editing every one of them.
- **`S.op` is overloaded**: it means `null | '/' | ':' | '·' | '='`.
  - Equations store their branches flat (`parts = [L1, R1, L2, R2…]`, `p >> 1`).
  - Code asks "is this an equation?" in ~26 places.
  - Conditions (`S.conds`) belong to the whole state, not to a branch.
- **Moves mutate `S` in place.** A refused move must not mutate, and only the fuzz judge enforces that. Previews (`previewOf`, `balPreview`) work by cloning the board and doing a dry run.
- **`pairCheck` is one decision tree.** It covers merge, cancel, addTerms, factor, factorRest, rootOut, ones, move and fizzle, so every new pair rule is another `if` in the middle of it.
- **Hints are three parallel monoliths** (`hint`/`factorHint`, `eqHint`/`quadHint`/`pairHint`, `genHint`). They repeat the same tactics (swap, tidy sides, product = 0, root…) with small differences.
- `ui.js` (55 KB) mixes rendering, gestures, animation, the balance panel, menus, practice, the own-problem sheet and win sheets.
- Everything is a global script, loaded into tests through a VM sandbox (`tests/load.js`).

## What I would have done differently (SOLID)

| Principle | Problem now | Design |
|---|---|---|
| **S**ingle responsibility | core.js is model + rules + strategy + HTML + content | Separate modules: `model/`, `rules/`, `tactics/`, `render/`, `content/` |
| **O**pen/closed | New node kinds and new moves mean editing switches and `pairCheck` | Registries: a **node-type registry** and a **rule registry**; a new topic *adds* files |
| **L**iskov | `S.op` makes one shape behave as 5 different things; `Pr`, `G` and `V` each carry their own exponent semantics | Explicit problem types (`Expression`, `FractionPair`, `Equation{branches}`) with one shared interface; every node type honours the same contract |
| **I**nterface segregation | UI, tests and hints all reach into raw `S.parts[…].num[…].f` | Narrow interfaces: `Selection` (what was tapped), `Intent` (what the player did), `MoveResult` |
| **D**ependency inversion | Moves build HTML (`mx(termHTML(…))`) in their messages; goals are hard-coded `if (S.goal === …)` | Moves return *structured* params (nodes, numbers); a renderer turns them into text. Goals are strategy objects the engine depends on |

### 1. Expression model: a node-type registry

Every node kind is one object that implements the same contract:

```js
NodeType = {
  kind, key(node), clone(node), eval(node, env), equals(a, b),
  isTidy(node), explode(node) -> Result,   // the kind's own "break apart" (12 → 2·2·3, x³ → x·x·x, log(ab) → log a + log b)
  children(node), render(node, ctx),        // render lives in render/, registered per kind
}
```

- Generalise `Rt` into **`Fn(name, args)`**, with √ as its first instance. Then `sin`, `cos`, `log_b` and `ln` are new registrations and need no new branches.
- Make the power a **`Pow(base, exp)`** wrapper instead of the `e` field on `V`, `G` and `Pr`. That leaves room for symbolic exponents later (`a^x`, needed for logs).
- Keep the pedagogical skeleton (a sum of terms, each term a product of factors) exactly as it is, because the tiles depend on it.
- Introduce a **number domain** (`Num`: an integer now, later a rational and exact constants such as π and e). It would take over `gcd`, `primeFactors` and the `tooBig` guard.

Identities then come from the node types themselves. "Explode" is what a node *is made of*, and regrouping is how the player rebuilds it. That is the no-magic rule, and it now applies to new topics automatically.

### 2. Moves as rules (a rule engine)

```js
Rule = {
  id, gesture: 'pair' | 'tap' | 'sweep' | 'drag',
  match(problem, selection) -> Plan | Refusal | null,   // pure, no mutation
  apply(problem, plan) -> { next, ok, params, born, origins, anim },
}
```

- `pairCheck` + `opPair` become a dispatcher over the registered rules, ordered by priority. Each current branch becomes its own rule: merge, cancel, addTerms, factor, factorRest, rootOut, cancelOnes, crossMove…
- The balance family (`opBalance`, `opRoot`, `opZero`, `opSwap`, `dragBalance`) becomes rules on the `drag` gesture.
- **Pure moves.** `apply` returns a new state, using structural sharing or clone-then-mutate inside the rule. Consequences:
  - a refusal can't mutate anything;
  - undo is a history list;
  - previews and the balance panel's dry run need no special code.
- The judge's `candidates` (`tests/judge.js`) can enumerate the registry, so a new rule is fuzzed automatically.

### 3. Problem types instead of an overloaded `S.op`

- `Expression { frac }`
- `FractionPair { left, right, sign }` (the `/ : ·` cycle)
- `Equation { branches: [{ L, R, conds }], unknown }`

Each type implements `sides()`, `locate(id)`, `isDone(goal)` and `views()`.

- Branches become real objects, not `p >> 1` arithmetic.
- Conditions move into the branch they belong to.
- `eqView`, `pairOf` and `branchCount` disappear.

### 4. Goals and hints as strategies built from small tactics

```js
Goal = { id, isDone(problem), whyNotDone(problem), tactics: [Tactic] }
Tactic = (problem, ctx) -> Hint | null     // Hint = { k, params, ids, move }
```

- The 15 KB of hint code splits into ~25 named tactics:
  - `swapSides`, `tidyEachSide`, `productZero`, `rootLoneSquare`, `mergeEqualBrackets`, `factorOutUnknown`, `completeSquare`, `mul4a`, `sharedBracket`, `explodeForCommon`, `sumProduct`, …
- Goals compose them: `simplify`, `factor`, `solveLinear`, `solveQuadratic` and `solveGeneric` become arrays of tactics.
- `genHint` versus `quadHint` turns into a different tactic order, not a copy.
- Each hint carries the **move it stands for**, so `autoSolveStep` plays `hint.move` through the same rule engine. The special cases in practice.js go away.
- `whyNotDone` becomes a list of small "unfinished" checks per goal (the `ny…` keys).

### 5. Rendering and input separated from the model

- `render/text.js` would take over `stateHTML`, `termHTML`, `fracHTML` and `sqHTML`, so core contains no HTML at all.
- `render/tiles.js` would take over `tileEl`, `sideEl`, `powEl` and `render`, plus a renderer per node kind.
- `render/layout.js` would take over `fitBoard`, `fitHeight` and `hudFit`.
- `input/gestures.js` turns taps, sweeps and drags into `Intent`s.
- `controller.js` turns an `Intent` into the rule engine, the history, the animation and the note.
- `views/` holds menu, levels, practice, own problem, balance panel and win sheets.
- Message params are data (nodes and numbers), not pre-rendered HTML. i18n templates receive rendered fragments from the renderer.

### 6. Content as data, modules native

- `content/levels.js` holds the levels as typed strings, built through `parseProblem` (most levels already have a textbook form), plus texts.
- `content/topics/*.js` holds one generator per practice topic (the `GEN` keys).
- Native **ES modules** (`<script type="module">`): still no build step to run the game.
  - Tests import the modules directly, and `tests/load.js` (the VM sandbox) goes.
  - The Artifact single-file build bundles with `esbuild` as a devDependency (`npx`).
- i18n is split per area (`i18n/en/moves.js`, `…/hints.js`, `…/ui.js`), and the uniqueness test still applies.

## Migration: in steps, each one green

The outside judge stays the arbiter at every step: `npm test`, which runs the fuzz judge, the corpus and generic/quadratic tests. Before any refactor I'd add a **characterisation net**.

0. **Golden traces.** A test records, for every level, every corpus exercise and a fixed-seed set of practice problems, the hint path as a list of `strip(stateHTML)` lines plus move keys, into `tests/golden/*.json`. Every later step must reproduce it byte for byte. The practice generator gets a seedable RNG so this works.
1. **ES modules.**
   - Split files mechanically along the existing seams: `model`, `normalize`, `moves`, `hints`, `render/text`, `content/levels`.
   - Update `index.html`, `sw.js` `SHELL` + `VERSION`, the compose mounts and `scripts/build.mjs`.
   - Tests import directly.
   - No logic change; the goldens must match.
2. **Rendering out of core.**
   - Move the HTML functions to `render/text.js`.
   - Moves return structured params; i18n formatting happens in one `say(result)`.
3. **Node-type registry.**
   - Introduce `NodeType` for `n v g p r`.
   - Replace the `f.k === …` switches one function at a time (`fkey`, `cloneF`, `evalF`, `canMerge`, `explode`, render…).
   - Then fold `Rt` into `Fn('sqrt')`.
   - `Pow` extraction is its own sub-step.
4. **Problem types.**
   - `Equation{branches}` replaces flat parts, and `conds` go per branch.
   - Keep a temporary adapter (`toLegacy`/`fromLegacy`) so steps 5–6 can move piece by piece.
5. **Rule engine.**
   - Each `pairCheck` branch and each `op*` becomes a `Rule`, and the moves become pure.
   - Undo becomes a history list.
   - `candidates` in the judge comes from the registry.
6. **Tactics and goals.**
   - Cut `hint`, `eqHint`, `quadHint` and `genHint` into tactics and compose the goals.
   - `autoSolveStep` plays `hint.move`.
7. **UI split.** Do `controller`, `input`, `views` and `render/tiles` last, because UI is verified by running the app.
8. **Proof of extensibility (acceptance test).**
   - Add a small `log` topic: `Fn('log', base)` with `explode(log(a·b)) = log a + log b` and `explode(log(aⁿ)) = n·log a`.
   - Add the like-terms rule for logs, one level and a practice generator.
   - **Pass:** no existing rule, tactic or node-type file changes. Only new files are added, plus registrations, i18n strings, the level list and the build/mount lists. The fuzz judge accepts it: `eval` for `Fn('log')` is enough for the judge to check values.

## Critical files

- `src/core.js` is split into `src/model/*`, `src/rules/*`, `src/tactics/*`, `src/goals/*`, `src/render/text.js` and `src/content/levels.js`.
- `src/ui.js` is split into `src/render/tiles.js`, `src/render/layout.js`, `src/input/*`, `src/controller.js` and `src/views/*`.
- `src/practice.js` becomes `src/content/topics/*` plus a small `practice.js` (`makeProblem`, `autoSolve`).
- `src/parse.js` stays. It produces nodes through the registry (`Fn` names for `sqrt`, later `sin`/`log`).
- `tests/load.js` goes. `tests/judge.js` gets its candidates from the rule registry and `eval` from the node types.
- `index.html`, `sw.js`, `docker-compose.yml` (mounts) and `scripts/build.mjs` change for the module layout.
- `CLAUDE.md` gets its Architecture, Move contract and hint sections rewritten in the same pass as each step.

## Verification

- After every step:
  - `npm test` is all green, with the fuzz judge, corpus, generic, quadratic and done tests unchanged;
  - the golden hint traces match byte for byte;
  - `npm run build` still produces a working `dist/algebra-cleanup.html`.
- After steps 1, 5 and 7, do a browser playthrough (Playwright from the scratchpad, as before) of levels 1, 27–33, 34–41 and 42–48 in portrait and landscape, including the balance panel, dragging the ² and undo.
- Step 8 is the extensibility measurement: count the existing files touched (`git diff --stat`) against the pass criterion above.

## Outcome (branch `refactor`, Nov 2026)

Every step kept `npm test` green, with the golden hint traces and messages byte-for-byte unchanged. Step 8 added three levels and changed nothing else in the goldens. All 48 original levels were played through in the browser after the steps that touched the UI.

| Step | Done | Where it differs from the plan |
|---|---|---|
| 0 | Golden traces (`tests/golden/traces.json`), and from step 2 on also every hint, Done? reason and move message along them (`messages.json`). Practice problems use a seeded `Math.random`. | — |
| 1 | ES modules; `core.js` split along its sections, with imports generated from a free-variable analysis. esbuild bundles the Artifact build. | — |
| 2 | `render/text.js`. Conditions are stored as terms plus a relation, so the state holds no HTML and `core/model.js` doesn't import the renderer. `t()` moved to i18n. | Message params are still HTML fragments, built by calling `render/text.js` from the moves and hints. Structured params would have touched ~130 call sites for little gain, now that per-kind rendering is a registry. |
| 3 | `core/kinds/`: one file per kind, `defineKind`, and the generic operations dispatch through it. `defineHTML` per kind in the renderer. The judge evaluates unknown kinds through the registry. | `Pow` (exponents as a wrapper) and a `Num` domain were not done. Both touch nearly every move, and nothing needs symbolic exponents yet. `Rt` stays its own kind; it is the pattern for function kinds (`log` followed it). |
| 4 | `core/problem.js` answers every question about a problem's shape; nothing else reads the flat branch layout. | The flat `S.parts` storage stays (it serialises well, and the UI indexes it). Conditions stay per state, not per branch. |
| 5 | `core/rules/`: pair rules per scope give verdicts, actions carry them out, explode is one handler per kind, and `play()` runs a move on a copy. Every move is registered by gesture, and the judge fuzzes the registry (it now covers sweeps and gather too). | — |
| 6 | `core/goals/`: goals are tactic lists, the solve goal uses branch strategies (generic, quadratic, linear), and the hint→move mapping is a registered table. | `quadHint` and `genHint` are still one function each inside their strategies. Cutting them into tactics would mean untangling their shared locals; that is the next refactor if a new equation type needs to reuse parts of them. |
| 7 | `src/ui/` (14 modules). The UI state is one shared `ui` object, rewritten scope-aware. `src/ui.js` is the entry. | — |
| 8 | Logarithms as `src/topics/log/` (kind, product rule with `a > 0` conditions, tactic, tile, practice generator, 3 levels). | See below. |

### Step 8: did adding a topic touch only new files and registrations?

No, not entirely, and the misses are the useful result.

- **New files (the topic):** `src/topics/log/{kind,rules,tile}.js`, plus `src/topics/index.js` and `src/topics/tiles.js`.
- **Registrations, as expected:** the level list, i18n strings, the practice topic list, two imports in `src/ui.js`, `tests/load.js`, the SW shell. The goldens only gained three levels.
- **Seams found before writing the topic (step 8a):**
  - `tidy`/`sig` assumed the five built-in kinds; they now ask the kind's `tidyIn` and `symbolic`;
  - the UI had no tile registry (`defineTile`);
  - goals couldn't take a tactic from outside (`addTactic`).
- **Assumptions found while adding it (step 8b), each now fixed generically:**
  - the hint-move table kept its catch-all first, so later moves were never reached (a bug in step 6);
  - the like-terms hint and message picked or named letters only (`2 log a + log a`, and `2√3 + √3` too);
  - `condHTML` had no `> 0`;
  - the judge assumed every expression is defined everywhere. It now skips sample points where a written condition fails, and has two sample points with all letters positive;
  - CSS for the tile.

The next topic (e.g. sin/cos) should need none of these again. It will need its own explode rules (identities as what a piece is made of) and possibly a parser hook for typing `log`/`sin`, which the parser doesn't have yet.
