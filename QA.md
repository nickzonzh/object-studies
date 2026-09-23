# F3A.1 material identity refinement — 23 September 2026

Material-only refinement of the existing Carved Oak. Product edits are limited to `oak.css`, `grain.svg` and `grain-vertical.svg`. The wrapper, nine-slice geometry, profile stop positions, width, mitre clips, recess, demo, responsive rules and pointer handler are unchanged. The F3A source material is preserved in `output/playwright/f3a1/baseline/` for comparison.

## Changes

- Lifted the timber body toward warm medium oak, with relatively more green/blue in the brown mixture to reduce its red/chocolate cast. Bright crests receive a smaller lift than the body, narrowing the polished-looking contrast. Profile colours at 91–100% and the rabbet remain unchanged.
- Broadened irregular grain movement slightly. Broad-face tapered bands are 25% wider, with a small contrast increase; broad-face pore strokes increase from 0.5 to 0.7 SVG units and opacity from 0.19 to 0.23. Pale rays shift toward a neutral golden tone. The deterministic arrangement remains non-tiled and knot-free, with construction-aligned grain.
- Reduced moving highlight peak alpha from 40/255 to 30/255 and the soft secondary alpha from 8/255 to 6/255. The existing light positions, masks, event handling and motion preferences remain unchanged. No new effects or geometry.

## Verification and comparison

Production build and strict TypeScript pass. `git diff --check` passes. Chrome at 1920, 1440, 768, 601, 375 and 320px: every frame's outer/opening dimensions, corner sizes, overflow states, board count and thickness exactly match F3A. No horizontal document overflow. Source comparison confirms the Oak wrapper is byte-identical and Oak CSS changes consist only of colour values and a comment. Pointer coordinates and stationary bounds match the prior results; leave/cancel reset correctly, touch/reduced-motion stay static, live content works, and no fresh-load browser errors or warnings were recorded.

The same top broad-face screenshot region has approximately 11.6% higher mean weighted sRGB luma than F3A. This supports the requested modest visual lift; it is not a whole-frame or perceptual lightness measurement.

Captured and inspected: portrait, square, landscape, corner/mitre, top-rail/broad-face grain, blank opening, mobile, responsive ratios and both pointer-light states. `output/playwright/f3a1/comparison.png` shows before/after portrait and enlarged top rail. `gallery.png`, `corner.png`, `grain.png`, `mobile.png`, `ratios-320.png`, `light-upper-left.png` and `light-lower-right.png` provide additional evidence. Capture/verification scripts, `results.txt` and `comparison.json` retain the checks.

## Evaluation

The material now reads more clearly as warm medium oak, with less chocolate/red richness and enough tonal space for a future darker walnut. No Walnut implementation exists to compare directly. Broader grain and visible pores reduce broad-face uniformity without creating a rustic texture. The sheen is calmer while convex edges still catch light. Geometry, mitres, proportions, artwork depth and restrained detailing are preserved in all three ratios and mobile. It remains clearly quieter than Baroque Gold.

Approved and locked by Nick on 23 September 2026: Carved Oak F3A.1 is the second real Korniza variant and the first locked timber variant. Preserve this material, profile and restrained detailing as its approved baseline. Remaining limitations: grain is authored/illustrative, the same field is reused across boards, and oak species cues remain subtle at mobile size. Firefox, Safari and physical-device performance are unverified. No Dark Walnut or heavier ornament work was started.

---

# F3A verification — 23 September 2026

Carved Oak is implemented as the first restrained timber-study candidate. Baroque Gold source is unchanged. The only generic component change is adding `carved-oak` to the variant type; geometry, content semantics, recess and wall shadows are unchanged. Oak owns a slimmer 23–44px profile and four full-length mitred material surfaces over the existing shell. Rounded edge, shallow channel, broad face, double inner reed and dark rabbet create the shaping. Non-tiled SVG grain layers provide irregular tapered bands, pores and pale ray hints. The material has no knots, raster textures, filters or heavy ornament.

## Verification

- Production build and strict TypeScript pass; `git diff --check` passes.
- Actual Chrome on Windows at 1920, 1440, 768, 601, 375 and 320 CSS pixels: no horizontal document overflow, square corners, correct 4:5 / 1:1 / 3:2 openings within subpixel rounding, and no Oak content overflow. Oak thickness is 44 / 43 / 23 / 23 / 23 / 23px respectively.
- Compared outer/opening dimensions, corner sizes and scroll states for every preserved prototype/gold specimen against recorded F2C results at the five shared viewport widths: zero differences. The existing live-content scroll behaviour remains unchanged.
- Pointer coordinates update the low-opacity satin field. Upper-left and lower-right states have identical frame bounds. Leave/cancel clear transient values; touch/reduced-motion updates are skipped. The live React content remains clickable. No fresh-load console warnings/errors or page errors.
- React checklist: stable decorative keys, unconditional hooks, cleanup of pending animation frame, no pointer state rerenders, no idle loop, hidden pointer-transparent decoration, native child semantics, no added runtime dependencies.
- Material overhead: five decorative DOM elements per frame and two shared SVG assets, approximately 4KB gzip each. No filters or continuous animations. This is a structural check, not a device performance benchmark.

## Visual evidence

Captured and inspected in `output/playwright/f3a/`: `gallery.png`, `portrait.png`, `square.png`, `landscape.png`, `corner.png`, `grain.png`, `blank.png`, `mobile.png`, `light-upper-left.png`, `light-lower-right.png`, and responsive `ratios-*.png`. `capture.js`, `verify.js`, `results.txt`, `compare.cjs` and `comparison.json` retain the reproducible checks. `generate-grain.mjs` records the deterministic asset construction.

The initial grain was too faint. A stronger version was too evenly striped. The final tapered, irregular bands recover timber character without competing with the profile. Horizontal and vertical grain follows the four boards and changes direction at mitres; no open corner/rail seams were visible. The full blank opening still reads as a shaped timber object. Mobile retains a generous opening and quiet inner detailing. Light movement is intentionally subtle, with the artwork and dark channels stable.

## Evaluation and recommendation

- A true oak frame rather than a wooden UI border? Yes at the intended viewing size: moulding depth, grain direction, mitres and rabbet establish a constructed timber object. It remains an illustrative material, not a photoreal scan.
- Convincing without louder ornament? Yes. Broad timber faces and fine inner reeds are enough for F3A.
- Same family as Baroque Gold, clearly different? Yes. Shared recess/contact-light logic connects them; slimmer architectural shaping and satin timber distinguish Oak.
- Calm but special? Yes: the shaped edge and double reed give it furniture-like character without heroic corners.
- Second real variant? Recommended as the second variant and ready for F3A approval. Do not mark it user-locked until Nick approves.

Recommend locking this restrained F3A candidate rather than adding ornament. Remaining limitations: the same authored grain field is reused across boards (reversed on opposite sides), although it never tiles along a rail; very close inspection reveals regular moulding and stylised pores. Species-specific oak character is subtler on mobile. Firefox, Safari, physical mobile hardware and device performance remain unverified. These do not justify a heavy ornament pass. No F3B, publishing, push or deployment was performed.

---

# F2C verification — 23 September 2026

Completed four-corner Baroque Gold with whispering rails. The approved master paths, generic nine-slice shell, gold width/profile/material field, liner, recess, and pointer handler are unchanged. Mirrored corner instances reuse one path library per frame; counter-reflected gradients and offset relief preserve upper-left illumination. Corner undercuts remain stable. New low-relief leaf shoots sit beneath the corner tails, fade to open central zones, and inherit the gold palette. Fine rail contrast is reduced on mobile. The gold demo now stacks at 601–850px because the old three-column portrait was too small for the completed composition; F1 remains unchanged.

## Checks and evidence

- Production build, strict TypeScript and `git diff --check` pass.
- Chrome on Windows: 1920, 1440, 768, 375 and 320px, plus a 601px breakpoint check. No horizontal document overflow. Four ornaments per gold frame, none on F1. Corners remain square at 3.2 times thickness.
- Recorded comparison against approved F2B.1: outer/opening dimensions, generic corners and scroll states are unchanged outside the intentional tablet gold-demo layout adjustment. Gold thickness and ornament scaling remain unchanged there too.
- Actual screen transforms show all four corner contact shadows displaced approximately +1.092px horizontally and +1.820px vertically at 1440px, including reflected instances.
- Pointer upper-left / lower-right highlight opacity: 0.8008 / 0.212, unchanged amplitude; identical frame bounds. Leave/cancel clears variables. Touch skips updates. Reduced motion stays at 0.65. Live content remains interactive. IDs are unique. No console errors or warnings on fresh loads.
- One completed frame has 46 DOM path elements and 56 uses, with zero filters. The master geometry is stored once per frame. No idle animation loop or React pointer-state rerender was added. This is structural efficiency evidence, not a device performance benchmark.
- React checklist: stable keys, unconditional useId, decorative/pointer-transparent SVGs, no new effects, state or dependencies. Generic child semantics remain untouched.

Artifacts in `output/playwright/f2c/`: `portrait.png`, `square.png`, `landscape.png`, `gallery.png`; `corner-tl.png`, `corner-tr.png`, `corner-bl.png`, `corner-br.png`; `rail-transition.png`; `mobile.png`, `viewport-320.png`, `viewport-375.png`, `viewport-768.png`; `light-upper-left.png`, `light-lower-right.png`. These were visually inspected. The `all-ratios-*` element crops exclude tiny outside projections at their crop boundary and should not be treated as viewport clipping evidence. `capture.js`, `details.js`, `mobile.js`, result files, `compare.cjs` and `comparison.json` retain reproducible measurements.

## Evaluation

The completed object reads as Baroque through the four lobed acanthus/scroll compositions. Corners remain decisively dominant. The shallow rail shoots continue their vocabulary and settle into generous unornamented centres. Overlapping folds, local contact shadows, roots lying on the convex crown and heels crossing the liner give the carving architectural attachment. The artwork remains the main uninterrupted area in each ratio. Tablet stacking restores adequate viewing scale.

Approved and locked by Nick on 23 September 2026: Baroque Gold F2C is the first locked Korniza variant. No further ornament density is recommended. Remaining limitations: broad SVG surfaces are smoother and more regular than hand-carved gilding; rail shoots become almost subliminal on mobile by design; edge-based pointer response is stylised rather than full physical relighting. Safari, Firefox, physical mobile devices and device performance are unverified. No other variants, deployment or publishing work was started.

---

# F0 + F1 verification

## F2B hero refinement — 23 September 2026

Baseline F2B was committed as `270ac8c` before this pass. Product changes are confined to `cornerGeometry.ts` and `BaroqueCorner.tsx`. No changes to the generic shell, moulding, CSS dimensions, material field, demo, pointer handler or ornament coordinate system. The top-left remains the only decorated corner on each gold specimen.

Refinement:

- Added two tucked leaf masses at the shared root, behind the original acanthus and folded heel. They bridge the scroll shoulders into a more compact carved core. Three local fold planes articulate these additions without adding another motif family.
- Broadened the spine and two acanthus lobes. Seven tapered brown undercut shapes create local overlap and recess depth beneath fold planes. Directional contact offset increases from `(0.9, 1.5)` to `(1.05, 1.75)` drawing units, a 16.7% increase; opacity and groove contrast are unchanged. The requested 15–20% perceived-depth increase is an artistic target, not an objectively measurable depth value for this SVG.
- Shortened the top reach from 143 to 125 drawing units measured from the corner origin (12.6%); shortened the downward reach from 140 to 132 (5.7%). Updated associated fold and edge paths, preserving tapered tips and the original scrolls. The square container and frame-thickness scaling are unchanged.
- Warmed and quieted selected ornament mid-golds and fold crests, retaining pale selected high points. Added two minute bole traces at new exposed folds. No distress texture or global contrast adjustment. Pointer-light opacity ranges and colors remain unchanged; undercut pockets remain static.

Validation: production build and TypeScript pass; `git diff --check` passes. Chrome at 1920, 1440, 768, 375 and 320 CSS pixels matches baseline F2B exactly for all seven frames' outer/opening/corner dimensions, scroll states and ornament container dimensions/positions. No horizontal document overflow. Each gold frame contains exactly one ornament; others contain none. SVG width equals height across every ratio; thickness multiplier remains 3.2 within pixel rounding. Unique SVG IDs, live child interaction, stationary pointer response, leave/cancel reset, touch exclusion and reduced-motion behavior all pass. No console errors or warnings; only React's development-tools information message.

Evidence: `output/playwright/f2b-refinement/` contains `before-corner.png`, `before-portrait.png`, refined `corner.png`, `portrait.png`, `square.png`, `landscape.png`, `gallery.png`, `viewport-320.png`, `viewport-375.png`, `viewport-768.png`, and both `light-upper-left.png` / `light-lower-right.png`. Close crops, three full frames, mobile/tablet and both lighting states were visually inspected. `capture.js`, `results.txt`, `compare.cjs` and `comparison.json` preserve the checks and baseline comparison.

Assessment: the shared root is denser, the primary leaf retains its hierarchy, and the deeper pockets separate overlapping folds rather than adding line noise. The warmer gold sits closer to the moulding beneath it. The shortened top sweep reads clearly and leaves more room for future rail work. At mobile scale, the added cuts merge into a quiet shadow mass while the acanthus/scroll silhouette survives; no protrusion clipping was observed. The root is now the darkest and most intricate area, so further layering would risk a knot of dark detail. The overall design remains recognizably the approved composition, with a more weighty Baroque root rather than an entirely new silhouette.

Current complexity: 41 unique authored paths, 47 DOM path elements including reusable definitions, four uses, two gradients, no filters; approximately 60 painted path instances after reuse. Four-corner cost and composition remain untested. Recommend approval of this refined hero before F2C, with restrained rail continuation and an early four-corner density check on the smallest portrait/tablet examples. Do not add more root microdetail. Browser evidence is Chrome on Windows, not Safari/Firefox or physical mobile hardware. No duplication or full rails were implemented.

---

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
