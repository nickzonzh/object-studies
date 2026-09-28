# Object Studies

An open-source npm monorepo of React 19 components that behave like the physical objects they're named after. The packages are kimolia (chalkboard), melani (whiteboard), korniza (gallery frames), keramos (painted pottery) and kollaz (craft table). They share an engine, `object-studies-core`, which handles tool motion, gesture history, persistence, seeded randomness and cooperative scheduling. A demo site lives in `apps/site` and deploys to GitHub Pages.

The standalone `kimolia`, `korniza`, `Aspro`, `keramos` and `aspro-craft` repos are predecessors. New work happens here.

## Commands

```bash
npm run check          # lint, typecheck, test, build, package checks, consumer smoke test. Same as CI
npm run dev:site       # builds the packages, then runs the demo site
npm run dev --workspace kimolia    # one package's own demo page
npm test               # vitest
npm run changeset      # describe a user-facing change before merge
```

Run `npm run check` before saying you're done. `smoke:consumer` packs the real tarballs, installs them in a temp folder, server-renders them and bundles them. It's the closest thing to an end-to-end test, and it's the one that catches packaging mistakes.

## Layout

- `packages/<name>/src` is the library, `demo/` is its dev page and `test/` holds its tests. `packages/kimolia/tests/` (plural) is an unused leftover.
- Anything two packages both need belongs in `packages/core`. Reuse core's tool motion, persistence and history rather than writing a package-local copy.
- `dist/` folders are build output. Don't edit them.

## Rules

- Packages are ESM-only, target React 19, ship their own types and a combined stylesheet (korniza also ships one per variant), and must keep working with server-side rendering. The SSR tests guard this.
- Every user-facing change needs a changeset.
- Publishing to npm (`npm run release`, or the release workflow via trusted publishing) is public and permanent. Only Nick triggers it.
- Pushing to `main` redeploys the demo site. Push only when Nick asks.
- The gallery images in `apps/site/public/gallery` are pre-committed. `apps/site/scripts/build-gallery-images.mjs` calls the Met Museum API, so run it only when asked.
- Generated textures and assets have a documented generator. Regenerate them that way and never hand-edit them.
- `kimolia/src/hooks/useChalkboard.ts`, `melani/src/lib/strokes.ts` and `melani/src/hooks/useBoard.ts` are large and central. Read the whole file before editing it, and put new behaviour in a focused module where you can.
- The feel is the product. Check interaction changes in a real browser on the demo site and describe what you saw. Tests run in Node with no DOM, so they can't see feel.
