# Algebra Cleanup → a skill tree of mathematics

## Context

The game has outgrown its shape:
- 51 levels sit in one line, from powers through quadratics and letters for numbers to logs.
- Practice has 13 topic chips.
- Both dialogs no longer fit on a phone.

The goal is to cover much more mathematics: goniometry, then differential and integral calculus and differential equations. Everything must keep following the same rules as now (see "The rules that carry over" below).

The linear level list becomes a **skill tree** that branches into fields. Some skills are blocking for others.

Decisions made with the user:
- **Soft lock.** A locked skill shows what it needs first. You can still open it after a warning, so a class that is already at a topic isn't stuck.
- **Branches to plan:** pure math (goniometry, calculus, differential equations), the **algebra gaps**, **applied formulas** and **Boolean logic**.
- **Build order:** the tree first, then the algebra gaps.

The rules that carry over:
- no magic;
- explode and regroup;
- only exactly equal pieces cancel or factor;
- the balance method for equations;
- conditions are written down;
- the player decides when it's done.

## 1. The fields, and what "explode and regroup" means in each

| Field | Explode (what a piece is made of) | Regroup / balance | New kinds and moves | Needs |
|---|---|---|---|---|
| **Square roots** | `√12 → √(2·2·3)` (exists: `rootOut`); `√a·√b` merge | `1/√2`: multiply top and bottom by `√2` | **expand a fraction** (`· k/k`, the player picks k) | powers |
| **Algebraic fractions** | `a/b + c/d`: expand each to the same bottom | equal bottoms → one bar (`joinSum`) | `Fr` as a *factor* (a term can hold a fraction), expand, join | factoring, linear equations |
| **Exponents** (negative, fractional) | `a³/a⁵ → 1/(a·a)` written as `a⁻²`; `√a = a^½` | as now | `Pow`/`Num` (rational exponents) | power fractions, roots |
| **Exponential equations** | `8 → 2·2·2 → 2³` | log of both sides (balance), `log(aˣ)` rule (earned, §3) | balance op `log`; log quotient rule | logs, exponents |
| **Complex numbers** | `i²` → `i·i` → `−1` (a definition level); `√(−4) → √(−1)·√4 → 2i` | `D < 0` quadratics now solve | `i` kind; `S.algebra = 'complex'` lifts `rootNeg` | quadratics, roots |
| **Goniometry** | `tan a → sin a / cos a`; `sin(a + b) →` sum formula (the explode of a sum inside, like log's product); `sin 2a`: split `2a = a + a`, then explode | `sin²a + cos²a = 1` as a pair rule (equal angles, equal coefficients); `sin x = ½` → two branches `+ k·360°` with the condition "k is whole" | `sin`, `cos`, `tan`, `π` (exact constant); exact values come from a unit-circle picture level | roots, algebraic fractions, double brackets |
| **Derivatives** | `D(sum)` → a sum of `D`s; `D(x·x·x)` → `1·x·x + x·1·x + x·x·1` → `3x²` (the product rule *is* the explode); `D(x) = 1`, `D(number or parameter) = 0`; `D(sin x) = cos x` (definition level with a slope picture); chain rule `D(f(u)) = f′(u)·D(u)` | tidy as usual | operator kind `D` with its variable; judge: central difference | exponents, brackets, (goniometry, logs for those rules) |
| **Integrals** | — | `D(F) = 3x²`: the player writes the right side as `D(guess)`, picking the guess with a slider like sum-product; the game explodes `D(guess)` openly to check it. Then **undo D on both sides**, which writes `+ C`. Definite integrals: `[F]ₐᵇ` | balance op `undoD`, "write as derivative" sheet; judge: numeric integration | derivatives |
| **Differential equations** | — | `y′ = k·y`: divide by `y` (condition `y ≠ 0`), write `y′/y` as `D(ln y)` (guess and check), undo D, take e to the power of both sides, rename `e^C = A` | `y` as an unknown function, balance op `exp` | integrals, exponential equations |
| **Boolean logic** (own root) | `¬(a·b) → ¬a + ¬b` (De Morgan as an explode) | `a·a = a`, `a + a = a`, `a + ¬a = 1`, `a·0 = 0`; factoring as in algebra, plus `a + bc = (a + b)(a + c)` | `S.algebra = 'bool'`, kinds `¬`, `0/1`; gates as an optional tile skin; judge: truth table | none |
| **Applied formulas** (leaves) | same moves, story levels and generated values | — | content only | see the tree |

Applied leaves:
- physics formulas (`v = u + at`, Ohm, `pV = nRT`, the lens formula `1/f = 1/v + 1/b`);
- growth and decay (interest, half-life: solve for t);
- kinematics (velocity as a derivative);
- marginal cost and revenue;
- cooling and RC circuits (differential equations).

## 2. The tree

```
ALGEBRA
powers ─┬─ like terms ─ brackets ─┬─ double brackets ─┐
        │                        ├─ factoring ───────┴─ sum-product ─┐
        │                        └─ linear eq ─┬─ formulas ──────────┼─ generic quadratic
        ├─ power fractions ─ textbook mix    │                     │
        ├─ square roots ─────────────────────┴──── quadratic eq ───┘─ complex numbers
        ├─ exponents (← power fractions, roots) ─ logs ─ exponential eq
        └─ algebraic fractions (← factoring, power fractions, linear eq)
GONIOMETRY      trig basics (← roots, alg. fractions) ─ identities (← double brackets) ─ trig equations (← quadratic eq)
CALCULUS        derivatives (← exponents, brackets) ─ derivative rules (← trig basics, logs) ─ integrals ─ differential eq (← exponential eq)
LOGIC           logic basics ─ simplifying ─ De Morgan ─ circuits
APPLIED leaves  physics formulas (← formulas, alg. fractions) · growth & decay (← exponential eq) · kinematics, marginal (← derivatives) · cooling/RC (← differential eq)
```

The current 51 levels map onto the first 13 algebra skills:

| Skill | Levels |
|---|---|
| powers | 1–4, 7, 8 |
| like terms | 5, 6 |
| power fractions | 9–11, 14 |
| textbook mix | 12, 13, 15 |
| brackets | 16, 17 |
| double brackets | 18, 19 |
| factoring | 20–24 |
| sum-product | 25, 26 |
| linear equations | 27–33 |
| quadratic equations | 34–41 |
| formulas | 42–44 |
| generic quadratic | 45–48 |
| logs | 49–51 |

**Square roots** gets new levels; the `√` kind and `rootOut` already exist.

## 3. A new mechanism: earned shortcuts

Calculus done by exploding becomes tedious: `D(x⁷)` takes seven pieces. The game needs a way to speed up without breaking the no-magic rule:
- once a player has finished a skill, the shortcut for that skill unlocks as a move in later skills (shown as "you did this in *Derivatives of powers*");
- for example `D(xⁿ) → n·xⁿ⁻¹`, and `log(aˣ) → x·log a`.

How it works:
- `defineShortcut(moveId, { skill })`. Moves and hints check `S.earned` (filled from progress).
- Practice inside the skill itself never has its own shortcut.

This keeps the rule "nothing happens that the player can't see the reason for": they *have* seen it.

## 4. Data and engine

**Content registry** (leaf module `src/content/skills.js`):
- `defineSkill(id, { field, requires: [ids], title: {en, nl}, blurb: {en, nl}, glyph, levels: [levelIds], gen })`.
- `defineLevel(id, {...})`. Levels get stable string ids such as `powers.3`.
- `LEVELS` stays as a derived list in topological order, so `alg.loadLevel(i)` and the tests keep working.
- Topic folders (`src/topics/<field>/`) register their own skills and levels, like `src/topics/log` does now. The existing levels move into `src/topics/algebra/levels/*.js` per skill.

**Progress and migration:**
- `store.won = { levelId: bestMoves }`.
- A one-time migration reads the old `best` (index → moves) and `level` keys through a frozen `LEGACY_ORDER` of the 51 ids.

**Unlock rule (soft):**
- A skill is *open* when every skill it requires is *complete* (all levels won).
- Otherwise it is *locked*: you can still play it after the warning "you'll need X and Y first".

**Engine prerequisites**, each its own step. Most are the items deferred in `docs/refactor-plan.md`:

1. **`Fr` as a factor kind.** Fractions inside sums. This is the biggest model change: `fracOf`, `normalize`, render and tiles all change.
2. **`Num` + `Pow`.** Rational numbers and rational or negative exponents. The `tooBig` guard moves into `Num`.
3. **A function-kind factory** (`defineFunction(name, { eval, tidyIn, explode })`), distilled from `log` and `√`, so that `sin`, `cos`, `tan`, `ln` and `exp` are a few lines each.
4. **Rule sets per algebra.** `S.algebra` is `'real'`, `'complex'` or `'bool'`. Pair rules, `tidy` and `eval` ask it.
5. **Operator kinds with a variable** (`D`, later `∫`).
   - `eval(node, env, ev)` gets the evaluator, so the judge can differentiate numerically.
   - The judge is the outside check for every calculus move.
6. **Earned shortcuts** (§3).

## 5. Screens (mobile first)

**The map** (`src/ui/map.js`, a full-screen view instead of the level sheet):

*Layout*
- Tiers by longest prerequisite path, top to bottom, scrolling vertically. Within a tier, order nodes by field lane and then by the position of their parents (one barycentre sweep).
- Phone upright: at most 3 nodes per row, and a crowded tier wraps. Landscape and desktop: wider rows.
- Edges are SVG curves; an unmet edge is dashed.
- Field chips at the top (Algebra · Goniometry · Calculus · Logic · Applied) collapse or expand lanes, so the map stays readable on a phone.

*Nodes*
- Each node is a tile in the game's style, about 84 px, showing a glyph (`a²`, `√`, `sin`, `d/dx`, `∫`, `∧`), a short title and a progress ring.
- Locked nodes are muted, with a lock.
- The suggested next node glows.
- A skill that just opened animates in after a "skill complete" win sheet.

*Accessibility*
- The same nodes are in DOM order as a list (field → skill), so screen readers and keyboards don't need the drawing.

**The skill card** (a bottom sheet, opened by tapping a node):
- title and one sentence on what you'll learn;
- what it needs, with the soft-lock note;
- its levels as numbered chips with ✓;
- **Play** (the next unwon level);
- **Practice** with the three difficulties as a segmented control.

**Practice, redesigned:**
- The menu's "Practice" opens the map in *pick mode*. Tapping nodes toggles them (a check badge appears).
- A floating bottom bar shows "3 skills · difficulty ▢▢▢ · Start".
- The 13-chip list goes. Generators belong to skills (`gen`), and "mixed" is simply several picked skills.
- "Type your own problem" becomes its own menu item.

**In the game:**
- The level line reads "Powers · 3/6" instead of "Level 3".
- A win goes to the skill's next level. The last level shows "skill complete" with the skills that just opened, and the way back to the map.

## 6. Phases (each phase leaves `npm test` green and is its own commit)

1. **Tree with the existing 51 levels.**
   - Skills registry, level ids and progress migration.
   - Map, skill card, practice pick mode, level line.
   - Goldens rekeyed by level id; the only diff is the key rename, which gets reviewed.
2. **Algebra gaps**, in this order:
   - square roots (new levels, the expand-a-fraction move);
   - `Fr` + algebraic fractions;
   - `Num`/`Pow` + exponents;
   - log quotient and exponential equations (with the first earned shortcut, `log(aˣ)`);
   - complex numbers.
3. **Applied leaves** on the algebra: physics formulas, growth and decay.
4. **Boolean logic** (`S.algebra = 'bool'`, truth-table judge).
5. **Goniometry** (function factory, `π`, the identities, trig equations with `k`).
6. **Derivatives**, plus the kinematics and marginal leaves (operator kind, numeric-derivative judge, power-rule shortcut).
7. **Integrals.**
8. **Differential equations**, plus the cooling and RC leaves.

Every field comes with:
- a `src/topics/<field>/` folder;
- skills and levels;
- a practice generator;
- a textbook corpus chapter in `tests/corpus-data.js` (exercises typed as a student would);
- `eval` for the judge;
- golden traces.

`CLAUDE.md` and `docs/` are updated in the same commit as each phase.

## Critical files

- **New:**
  - `src/content/skills.js` (registry);
  - `src/topics/algebra/levels/*.js`;
  - `src/ui/map.js` (map, skill card, pick mode);
  - `tests/tree.test.js`.
- **Changed:**
  - `src/content/levels.js` (becomes the derived list);
  - `src/ui/sheets.js` (`showLevels` → map; `win` → next in skill, skill complete);
  - `src/ui/practice.js` (pick mode replaces `TOPICS` chips);
  - `src/ui/state.js` (progress, migration);
  - `src/ui/controller.js` (`loadLevel` by id, level line);
  - `src/ui/menu.js`;
  - `src/i18n.js` (skill titles and blurbs, en + nl);
  - `src/styles.css`;
  - `tests/golden.test.js` (keyed by id);
  - `sw.js` SHELL.
- **Reused as they are:**
  - `GEN` generators (`src/practice.js`, `src/topics/log/rules.js`) as each skill's `gen`;
  - `openSheet`/`closeSheet`;
  - `store`;
  - `defineTile`/`defineKind`/`defineExplode`/`definePairRule`/`addTactic`, for each new field.

## Verification

- **`npm test`.** All existing suites (judge fuzzing, corpus, golden) stay green. New `tests/tree.test.js`:
  - the prerequisites form a DAG and every `requires` exists;
  - each level belongs to exactly one skill, and every skill is reachable;
  - each skill's generator yields problems `autoSolve` finishes;
  - migrating an old `best`/`level` store gives the same won levels.
- **Playwright** (scratchpad) at 390×844, 667×375 and 1280×800:
  - the map has no overlapping nodes and no horizontal page scroll;
  - every node is reachable by scrolling;
  - the skill card fits on screen;
  - play a skill to completion → "skill complete" → the next skill shows as open;
  - pick two skills in practice → problems come from both;
  - all 51 levels still win when played from the map.
- **For each new field:** its corpus chapter is solved by the hints to the textbook answers, and the judge (numeric, truth table or derivative) finds no move that changes the value.
