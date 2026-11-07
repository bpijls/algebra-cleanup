# Algebra Cleanup

A playful way for secondary school students to learn simplifying algebra. Every expression is made of tiles. Tap a tile twice to explode it into its parts (a⁵ becomes a · a · a · a · a, 12 becomes 2 · 2 · 3), then regroup, cancel and put things outside brackets until the expression is clean. The rules for powers aren't told, they're discovered.

It covers the klas 2–3 algebra chapters: powers, like terms, fractions, opening brackets (also with a minus in front), double brackets, special products like (a + b)², putting outside brackets, factorising x² + 5x + 6 with the sum-product method, and solving equations with the balance method: tap =, then drag a piece across it, and it is undone on both sides. Students can also type a problem from their own book or homework (Practice → Type your own problem) and play it.

English and Dutch. Works on phones and desktop.

## Run it

Open `index.html` in a browser, or run `npm start` and open the address it prints.

On the server: `cp .env.example .env && docker compose up -d` serves it at `APP_DOMAIN` (https://huiswerk.paws.home) through Caddy. It is a progressive web app: install it from the browser menu ("Add to Home Screen") and it works offline after the first visit.

## Develop

```
npm test        # every level, generated problem and textbook exercise is solvable, keeps its value, and the rules hold
npm run build   # make dist/algebra-cleanup.html, a single self-contained file
```

See `CLAUDE.md` for the design rules, architecture and how moves work.
