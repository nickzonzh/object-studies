# F0 + F1 verification

## F2B single hero corner — 23 September 2026

Implemented one top-left ornament per Baroque Gold specimen, with no ornament on the other corners. The existing demo, moulding profiles, antique material field, width tokens, inner liner, recess and shadows are unchanged. The generic component gains only an optional decorative overlay slot outside its semantic content opening; the nine-slice grid and CSS are untouched.

Structure: `cornerGeometry.ts` holds four closed masses, eleven fold planes, six groove paths and six highlight paths. `BaroqueCorner.tsx` adds the sparse bole path and builds the gold material, directional offset contact relief, stable cuts and reactive edge catches. `baroque.css` positions an absolute square at 3.2 times frame thickness. `BaroqueGold.tsx` extends its existing single pending animation-frame callback with two relief-light variables, resetting both on leave/cancel. No state updates, independent motion, filters or new dependencies.

Complexity: 28 unique authored paths; 32 DOM path elements (four body paths occur both in definitions and the material group), four `<use>` instances and two linear gradients per SVG. Approximately 42 painted path instances after reuse. Unique per-component SVG IDs verified across all specimens. This is a modest starting cost for later duplication; four-corner and full-rail runtime performance has not been measured.

Verification:

- Production build and strict TypeScript pass; `git diff --check` passes.
- Chrome at 1920, 1440, 768, 375 and 320 CSS pixels: all seven frames' outer sizes, opening sizes, corner sizes and scroll states exactly match the recorded F2A.1 measurements. `output/playwright/f2b/compare.cjs` compares the actual recorded results.
- All gold frames have exactly one SVG; prototype frames have none. SVG width equals height at every ratio and viewport, and is 3.2 times thickness within pixel rounding. No horizontal document overflow; mobile protrusions remain visible.
- Real mouse movement changes upper-left edge opacity from 0.8008 to 0.212 and the return-edge opacity from 0.0896 to 0.384. Frame bounds remain identical. Brown cavities do not receive the moving light layers. Leave/cancel clear the variables; touch skips updates; reduced motion keeps static 0.65 highlight opacity.
- The live child button still updates its status. SVGs are decorative, unfocusable and pointer-transparent. Browser console contains only the React development-tools information message, no errors or warnings.

Screenshots captured and visually inspected in `output/playwright/f2b/`: `gallery.png` (all ratios), `portrait.png`, `square.png`, `landscape.png`, `corner.png`, `light-upper-left.png`, `light-lower-right.png`, and `viewport-320.png`, `viewport-375.png`, `viewport-768.png`. `capture.js` and `results.txt` preserve the reproducible browser checks. The raw scale field in results is null because the computed custom property retains `round()` syntax; `compare.cjs` computes the verified scale using the actual corner width instead.

Visual assessment before F2C:

- **Complex enough?** Yes for a hero-corner proof: diagonal lobed leaf, central spine, curled heel and unequal volutes establish an architectural/botanical composition. A rosette would add density without a clear structural purpose.
- **Too busy?** No as one corner. At tablet size fine grooves become quiet, but the silhouette and scrolls survive. Four corners plus elaborate rails could become busy, particularly in the narrow portrait specimen.
- **Deep enough?** Yes at normal size: warm grooves, rolled shoulders, bright fold crests and localized contact shadows distinguish planes. The underside of the curled heel is the deepest accent.
- **Gold at ornament scale?** Consistent with the moulding palette. Broad surfaces remain smoother and more regular than real hand-carved gilding; bole is deliberately barely visible. Pointer response is subtle and concentrated on edges, not a full normal-mapped relighting model.
- **Physical connection?** The leaf overlaps the outer profile, the heel crosses the inner edge slightly, and tapered roots settle onto the rail crown. No rectangular bounds or uniform shadow halo. Root-to-rail junctions are still the simplest part of the carving and could gain richer occlusion in a later refinement.
- **Rail direction?** Both tails suggest a sensible continuation. Their long, tapered forms should lead into sparse repeating accents, not another continuous dense leaf cluster.
- **Safe to duplicate visually?** Plausible, with controlled rail density, but not proven until F2C. The top tail already occupies nearly half the narrow portrait rail. Opposite tails will need deliberate spacing in that later milestone.

Recommendation: ready to propose F2C after visual approval of this hero corner. Do not add more hero microdetail first. Carry the current silhouette and relief language forward, then assess four-corner density before designing full rails. No other corners or rail families were implemented here. Browser coverage is Chrome on Windows; Safari, Firefox and physical mobile devices remain unverified.

---

## F2A.1 material-ageing pass — 23 September 2026

This follow-up changes only `src/variants/BaroqueGold/baroque.css` and `leaf.svg` in product code. Frame widths, profile boundary percentages, mitres, generic shell, content slot, demo layout and pointer handlers remain unchanged.

Material changes: reduced the broad crown highlight and moving light intensity while retaining selected sharp edge catches; warmed and muted broad gold faces; deepened channel and fillet transitions in brown/bronze; quieted the inner liner. Replaced the repeating leaf image and faint hard-edged leaf patches with one stretched, nonrepeating field of soft asymmetric tonal variation. Sparse softened bole traces now sit on the convex crown, above the light layer so they are not painted over by a specular highlight. An initial elongated trace was softened after visual review because it resembled a scratch.

Before/after Chrome measurements are exactly equal across all seven demo frames at 1920, 1440, 768, 375 and 320px: outer sizes, fractional opening sizes, all four corner sizes, and scroll states. No horizontal page overflow. Image openings do not clip; the existing 320px live-content vertical scrolling is unchanged. Pointer light coordinates update and frame bounds remain stationary. Build passes; no browser errors in the captured fresh-load runs.

Evidence is in `output/playwright/f2a1/`: paired `before-` / `after-` screenshots for gallery, portrait, square, landscape, blank artwork, corner, rail, pointer state, and 320/375px mobile. `before-results.txt` and `after-results.txt` preserve measurements; `before.css` and `before-leaf.svg` preserve the exact material baseline.

Visual assessment: less lacquered/brass-like, still clearly gold. Brown channels give the raised profiles stronger separation; soft leaf tone variation interrupts the broad sheen without visible tiling or grain. Bole is now barely perceptible at normal size, with no obvious scratches, chips or dirt. Long rails remain geometrically regular, and the material cannot establish hand-carved character as strongly as actual carved forms would. Ageing remains deliberately restrained, particularly on mobile. No ornament was added; F2B remains out of scope. Browser coverage remains Chrome only.

---

## F1 polish + F2A follow-up — 23 September 2026

F1 shadow-only changes were captured and inspected before F2A implementation: `output/playwright/f1-polish-1440.png`, `f1-polish-375.png`, and `f1-polish-320.png`. Contact shadows now carry more weight; the broader ambient cast is reduced. The opening has restrained bottom/right occlusion, without a broad artwork vignette. The generic grid, width tokens, corner proportions, overlaps and mitres are unchanged.

F2A adds only Baroque Gold moulding/material. Its local width token is 26–53px. Convex gold, a warm dark channel, secondary roll, narrow relief fillet, quiet liner and dark rabbet share identical rail/corner cross-sections. Faint leaf variation and minute bole traces are confined to the raised outer profile. There are no botanical ornaments, scrolls, shells or rosettes.

Validation on the final implementation:

- `npm run build` and `git diff --check` pass.
- Chrome at 1920, 1440, 768, 375 and 320 CSS pixels: no horizontal document overflow; every corner remains square; image openings retain 4:5, 1:1 and 3:2 ratios within subpixel rounding, with no image overflow.
- Generic thickness stays 38/37/20/20/20px respectively; Baroque thickness is 53/52/28/26/26px.
- Pointer position updates light coordinates; the frame bounding box is identical before/after. Pointer leave clears the coordinates. Reduced-motion emulation prevents updates. No idle animation loop is used.
- Live content button remains functional. At 320px its existing vertical overflow remains scrollable inside the opening, as in F1.
- No console or page errors on the final fresh-load QA run. A development hot-reload during editing emitted a duplicate-createRoot warning; it did not recur on fresh load.

Captured and visually inspected:

- `output/playwright/gold-1440.png` — three-proportion comparison.
- `output/playwright/gold-portrait.png`, `gold-square.png`, `gold-landscape.png` — individual specimens.
- `output/playwright/gold-corner.png` — mitre and layered moulding.
- `output/playwright/gold-blank.png` — material without artwork.
- `output/playwright/gold-pointer.png` — shifted highlight.
- `output/playwright/f2-mobile-320.png`, `f2-mobile-375.png` — full mobile pages.

Assessment: gold reads as substantial gilded moulding, with visible raised/recessed differentiation and restrained wear. No open rail/corner joins or harsh gradient discontinuities were found. The remaining material limitation is regularity: long profiles still look carefully restored rather than richly hand-aged; leaf and bole evidence is intentionally faint, especially at mobile scale. The narrow relief fillet is plain, not a beaded ornament system. Pointer response is confined to the primary convex moulding; channels and artwork remain static.

Recommendation: suitable for an approved F2B one-corner study, with high-point material response evaluated again on that geometry. No F2B work has been started. Firefox, Safari and physical high-DPI devices remain unverified.

---

The following records the original F0/F1 baseline, before this follow-up.

Verified in Chrome on Windows, 23 September 2026.

## Local checks

- `npm run build`: strict TypeScript and production Vite build pass.
- Runtime dependencies: React 19 and React DOM only; installation audit reports no vulnerabilities.
- Real browser checks at 1920, 1440, 768, 375 and 320 CSS pixels: no horizontal document overflow; four square corners per frame; 4:5, 1:1 and 3:2 content openings within browser subpixel rounding.
- Default thickness: 38px at 1920, 37px at 1440, 20px at tablet/mobile widths.
- Additional 16:9, 2:3 and numeric 2.35 opening ratios checked by changing the CSS aspect ratio in the browser.
- Pointer click and keyboard Enter both update the live React child. Its native button and live status remain present in the accessibility tree; decorative slices do not.
- Reduced-motion emulation preserves layout and interaction. No animations or frame transforms on interaction are implemented.
- No browser console errors or warnings observed.

## Visual inspection

Desktop: all three ratios display the same local artwork. Moulding cross-sections remain consistent; corners meet at mitres without stretched profiles. A dark inner rabbet and overlapping occlusion shadow place the artwork behind the front face. Separate contact and ambient shadows anchor the frame.

Tablet and narrow mobile: thickness remains modest, with vertically stacked studies on mobile. The 320px viewport keeps the live child usable; its opening can scroll if the child's intrinsic height requires it.

An initial fractional-pixel rail boundary was corrected with whole-pixel thickness and a one-pixel longitudinal overlap. Final landscape close-up shows continuous rail joins without open seams.

Local screenshot artifacts (intentionally not checked into source):

- `output/playwright/desktop.png`
- `output/playwright/mobile.png`
- `output/playwright/tablet.png`
- `output/playwright/landscape-detail.png`

## Boundaries and polish

No blocking F1 geometry issues found in Chrome. Firefox/Safari and high-DPI device checks remain useful follow-up coverage; they are not claimed as verified. Very small consumer containers may require a smaller `--frame-width`. Arbitrary children own their sizing and scroll behavior; the frame does not rewrite their CSS.

The prototype is deliberately plain. No F2 or decorative material work is included. Future polish can tune shadow softness after visual approval; there is no required F1 feature punch list.
