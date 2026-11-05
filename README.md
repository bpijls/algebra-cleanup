# Algebra Cleanup

A playful way for secondary school students to learn simplifying algebra. Every expression is made of tiles. Tap a tile twice to explode it into its parts (a⁵ becomes a · a · a · a · a, 12 becomes 2 · 2 · 3), then regroup, cancel and put things outside brackets until the expression is clean. The rules for powers aren't told, they're discovered.

English and Dutch. Works on phones and desktop.

## Run it

Open `index.html` in a browser, or run `npm start` and open the address it prints.

## Develop

```
npm test        # check that every level and generated problem is solvable and the rules hold
npm run build   # make dist/algebra-cleanup.html, a single self-contained file
```

See `CLAUDE.md` for the design rules, architecture and how moves work.
