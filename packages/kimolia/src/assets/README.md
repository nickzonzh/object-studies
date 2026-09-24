# Materials

There are no bitmap or SVG assets. Slate mottling, fine grain, chalk residue,
oak grain and rail dust are drawn once at runtime by `src/materials.ts` — a
seeded value-noise field and a few hundred canvas strokes — and handed to CSS as
`url(data:image/png…)` custom properties on the board and on the tool layer.
The same canvases back the PNG export.

Why it is done this way, and what must not regress:

- **Canvas taint.** Mobile WebKit verification caught a `SecurityError` when
  serialising a canvas that had drawn a filtered SVG, both as a data URL and as
  a same-origin file. Earlier versions shipped baked PNG companions of the SVG
  materials so the export stayed readable. Generated canvases are same-origin
  pixel data with no image source at all, so the export canvas can never be
  tainted — the workaround is now structural rather than a pair of extra files.
  Do not reintroduce an SVG (or any remote image) into the export path.
- **Determinism.** Every texture comes from `seededRandom` with a fixed seed, so
  two machines render the same board and a regenerated texture is byte-stable.
  Keep the seeds if you change the drawing code, or accept that the object's
  surface changes.
- **Weight.** The published package was 564 KB of inlined PNG and SVG. Drawing
  the materials instead costs about 40 KB of JavaScript and roughly 20 ms once
  per document, and the textures are cached for the lifetime of the page.
- **No network, no dependency.** Nothing here fetches or depends on an image
  service or a runtime rendering library.
