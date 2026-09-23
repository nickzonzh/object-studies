# Kimolia

A physical chalkboard for the web. Dark slate, aged oak, four pieces of chalk, and a proper wood-and-felt duster.

**K0–K6:** the physical object, textured chalk, felt duster and drawing utilities. Pick up chalk and draw; layering marks builds pigment. Sweep the duster across them to leave a faint ghost, then wipe again to clean further. Undo/redo includes erasing and Clear. Your drawing saves on this device, and Save PNG downloads the textured slate. A bounded replay cache accelerates recent history on busy boards.

![Kimolia chalk drawing](docs/images/k3-desktop.png)

## Run

Use Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the printed local URL at `/kimolia/`.

```sh
npm run lint
npm test
npm run build
npm run preview
```

`build` runs strict TypeScript checks and produces `dist/`. The only runtime dependencies are React 19 and React DOM. The lockfile records the exact versions.

## Object construction

- Four directional oak frame pieces with mitred joints, rounded outside edges, shallow bevels and a dark inner rabbet.
- A recessed slate surface with mineral variation, fine grain and restrained wiping residue. No specular sheen.
- A projecting timber ledge with a rear groove, rounded front lip, contact shadows and sparse chalk dust.
- Four matte, irregular chalk sticks; a timber duster handle over layered charcoal felt.
- A fixed above-left light source, with tighter tool shadows on contact.
- A 1040px maximum width and 1.6:1 desktop board; 4:3 below 520px. The tools remain separated at 320px.

The object is DOM/CSS, with a transparent Canvas layer for chalk. Five procedural SVG material assets are generated locally by `npm run materials` and committed. They use fixed seeds and contain no external resources. Two PNG companions of the slate textures support cross-browser export; see [the asset notes](src/assets/README.md). The 48px chalk brush is generated and tinted locally at startup. There are no stock textures, image-service assets, fonts, analytics or remote drawing APIs. The drawing stays in this browser's local storage.

`src/components/Chalkboard/` owns composition. `src/styles/` separates the page, slate, timber, chalk and felt materials. The material generator is in `scripts/generate-materials.mjs`.

## Tool interaction

Click or tap a physical tool to pick it up. Its place on the rail becomes empty. Drag chalk across the slate to draw, or use the duster to erase. Choose the same tool again, press Escape, or use **Put back** to return it. The duster leaves faint chalk residue; repeat the sweep or scrub back and forth for a cleaner result.

Keyboard: Tab to a tool and activate it with Enter or Space. Focus moves to the slate. Arrow keys move the tool; Shift takes larger steps; hold Space or Enter while moving to draw or erase. Escape returns the tool and focus to its rail button. With the board or its controls focused, Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. Clear removes all marks and can be undone.

Each tool has a named native button with `aria-pressed`, a visible keyboard focus ring and an independent minimum 44px target. Selection changes are announced. Touch tools activate on a completed tap rather than depending on the browser's later compatibility click; cancelled or dragged taps do not select a tool. Mouse and keyboard retain native click behaviour. Reduced motion and keyboard activation skip pickup travel. Touch gestures are captured only on the slate while a tool is selected; cancellation, resizing, scrolling and window focus loss cannot leave a tool stuck in contact.

`src/hooks/useToolInteraction.ts` owns selection and input lifecycles. `src/tools/toolMotion.ts` handles interruptible 160–220ms transform animations and lightweight pointer following without React renders per pointer event. Rotation pivots around the chalk tip or felt centre; contact snaps to the pointer. The duster has heavier hover inertia. Animation frames stop when settled, and all listeners/animations are cleaned up on unmount.

## Chalk rendering

`src/drawing/` owns the seeded brush, arc-length sampler, slate clipping and incremental renderer. Each stroke records colour, width, seed, input points/pressure and its original slate dimensions. The same sampler handles live input and replay; no frame-by-frame rerender or React pointer state is needed. Cached coloured brush stamps have pinholes, broken edges, slight rotation/opacity variation and sparse dust. Source-over compositing naturally builds coverage where strokes overlap.

Pointer input consumes coalesced events where available and interpolates every segment. Mouse/touch pressure is a steady 0.5; pen pressure changes density more than width. A tap produces a dot. Captured movement outside the slate splits/clips strokes rather than scribbling along the border. Resize redraws at the new resolution (DPR capped at 3); returning to the same dimensions reproduces the same stroke coverage. Drawings scale with both dimensions of the slate, so changing between landscape and mobile proportions also changes their proportions.

Stroke records drive undo/redo and autosave. Undo groups a continuous gesture, including any clipped pieces after leaving and re-entering the slate. New marks discard the redo branch. Clear retains the previous drawing until its undo history is released.

`replayCache.ts` holds up to four raster prefixes, with a 32 MiB RGBA pixel budget, to avoid replaying the entire drawing for recent Undo/Redo. It preserves periodic checkpoints and reuses a recent-state buffer. Matching requires the same stroke objects in the same order, so Clear and new branches cannot pick up unrelated pixels. A resize or unmount releases the cache. The main canvas and duster scratch surfaces are additional to this cache budget. Initial load, resize and history older than the retained checkpoints still replay stroke records.

## Felt erasing

`drawingSurface.ts` records chalk and duster strokes in order. The duster's rounded rectangular mask matches the physical tool's size, with soft edges and seeded felt fibres. Each sweep removes at most 82% of existing pigment through `destination-out`. Two reusable scratch canvases hold the pre-pass board and coverage mask; only the changed rectangle is composited on each input update. This prevents overlapping stamps from accidentally scrubbing a mark to zero in a single sweep.

A meaningful direction reversal starts a fresh cleaning pass, so scrubbing works without repeatedly lifting the pointer. Stationary contact does not keep erasing. The same pass detection and seeded mask run during chronological replay; fresh chalk placed after a wipe remains fresh. Wiping blank slate adds no dirt or stroke records. Clear always removes all ghosting.

## Keeping a drawing

The utility strip contains **Undo · Redo · Clear · Save PNG**. All targets are at least 44px. Like tool pickup, utility taps activate on completed touch release and suppress a later compatibility click, which can otherwise be missed after a captured drawing gesture.

Completed chalk/duster records autosave after a 250ms pause to `kimolia:board:v1`. Leaving the page or hiding it flushes pending work. Refresh restores the visible drawing, including duster ghosting; selection, cursor positions, animation and the session's undo/redo stack are not stored. Saving is local to this browser and origin, without account sync. A malformed save is left untouched until a new edit; blocked storage, quota failures and oversized drawings are reported below the board while drawing and PNG export remain available. Restore/save validation caps documents at 2 million characters, 4,000 stroke fragments and 40,000 points.

Save PNG captures the slate at its current canvas resolution (device pixel ratio capped at 3). It composites an opaque slate tone, mineral/noise texture, chalk and wipe residue into `kimolia-board.png`, excluding the timber, tools and page. Export snapshots the marks before loading textures, so a later edit does not alter the requested image. The texture PNGs are loaded from this app only when export is requested. The export redraws the slate's material treatment; it is not a DOM screenshot of the frame's inset lighting.

## CI and Pages

CI runs install, lint, tests, strict typecheck and production build on main pushes and pull requests. The Pages workflow independently repeats those checks before deploying.

The repository is public and Pages uses **GitHub Actions** as its source. Main pushes automatically build and deploy the app; the workflow can also be run manually. No repository variable is required.

The site URL is [nickzonzh.github.io/kimolia](https://nickzonzh.github.io/kimolia/). The Vite base is `/kimolia/`, following the [Vite Pages deployment guide](https://vite.dev/guide/static-deploy#github-pages).

## Visual verification

See [the K1 review](docs/K1-review.md) for materials, [the K2 review](docs/K2-review.md) for tool interaction, [the K3 review](docs/K3-review.md) for chalk, [the K4 review](docs/K4-review.md) for erasing, [the K5 review](docs/K5-review.md) for history, autosave and export, and [the K6 review](docs/K6-review.md) for replay performance.
