# F4A Dark Walnut — 23 September 2026

Approved and locked by Nick on 23 September 2026 as the third finished Korniza variant, including the final 5% grain-opacity refinement. Baroque Gold and Carved Oak remain locked and unchanged. The generic shell receives only the `dark-walnut` TypeScript union member; its geometry, content slot, depth CSS and shadows are unchanged.

## F4A grain refinement

At Nick's request, increased all Walnut grain/fibre/pore opacities by a relative 5% in both directional SVG assets. Pattern geometry, profile, palette, liner and lighting are unchanged. Production build passes; desktop (1440px) and mobile (390px) screenshots were captured and visually inspected. The result remains restrained, with a small increase in timber definition. Evidence: `output/playwright/f4a-grain-plus5-desktop.png` and `output/playwright/f4a-grain-plus5-mobile.png`.

## Material and profile

- 25–48px local width, deep rounded outer moulding, narrow shadow channel, broad walnut face, raised inner bolection, antique-gold slip and dark artwork rabbet.
- Warm reddish-brown body, visible light/dark plane separation and near-black cavities. Walnut grain is finer and less open than Oak, with gently flowing streaks, subtle warm fibres and small pores. No pale oak rays, raster textures, tiling or SVG filters. Two vector assets total about 26KB raw / 6.2KB gzip, with 108 paths each rendered as CSS images; only four board spans and their container are added to the DOM.
- Moving light is strongest on raised timber, weak on the broad face, faint on the slip and absent from the deep channels/rabbet. No transform, animation loop or React pointer-state updates.
- The gold slip was retained: its approximately 0.75–1.44px width clarifies the opening and adds the formal gallery character without competing with the walnut.
- The first visual review prompted one small increase in grain contrast; no geometry or ornament pass followed.

## Verification

Chrome on Windows, local Vite app:

- Strict TypeScript and production build pass; `git diff --check` passes.
- Measured 1920, 1440, 1024, 851, 850, 768, 600, 390, 375 and 320px viewports. No horizontal document overflow. All corner squares remain square; all three opening ratios remain within 0.00011 of 0.8, 1 and 1.5. Narrowest portrait opening is approximately 168px at the 320px viewport.
- Pointer coordinates change between opposite corners; bounding boxes remain identical. Leave clears inline light variables; pointercancel resets them. Touch and reduced-motion tests produce no inline light updates. Existing live-content button still increments its status.
- Desktop and mobile captures show continuous mitres, readable artwork and stable liner width. Blank-artwork capture retains convincing material/profile separation.
- Device-scale-factor 2 Chrome capture used for close-ups and equal-width three-material comparison. This is emulation, not physical high-DPI-device testing. Firefox/Safari remain unverified.
- Fresh browser console shows only the React development-tools informational notice, without warnings/errors. Editing the entrypoint during development triggered the existing duplicate-createRoot hot-reload warning; a separate fresh-page console/pageerror check returned an empty error list.

## Captured evidence

All paths are local under `output/playwright/` (ignored by Git):

- `f4a-study.png`: desktop three-proportion study.
- `f4a-portrait.png`, `f4a-square.png`, `f4a-landscape.png`: full individual specimens.
- `f4a-corner.png`, `f4a-grain.png`, `f4a-liner.png`: high-density detail crops.
- `f4a-mobile-390.png`, `f4a-mobile-320.png`: mobile viewports.
- `f4a-390-{portrait,square,landscape}.png`, `f4a-320-{portrait,square,landscape}.png`: individual mobile specimens.
- `f4a-pointer-left.png`, `f4a-pointer-right.png`: material-light states.
- `f4a-blank.png`: blank content opening.
- `f4a-comparison.png`: equal-width Gold / Oak / Walnut portraits, arranged temporarily in the browser for QA only; the actual demo retains its existing editorial layout.

## Evaluation and recommendation

Walnut reads as fine-grained, burnished dark timber, clearly richer/darker than Oak. Its drama comes from the outer roll, deep channel and polished inner moulding, not ornament. The thin liner improves the opening and gives the frame a formal gallery identity. It sits comfortably beside the warm Oak and ornate Gold as a distinct third personality.

Dark Walnut F4A is approved and locked. Preserve this material, profile, restrained polish and antique-gold liner as its finished baseline. Remaining limitations: subtle grain naturally becomes less legible at the smallest mobile scale; straight mouldings still read as carefully restored, rather than irregular hand-aged timber. Neither warrants heavier carving or an automatic follow-up pass. No F4B work or deployment performed. Nick authorized commit and push of this approved F4A baseline.

---

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

## F5A — Champagne Rococo (23 September 2026)

**Status:** implemented, visually verified, recommended for lock. Not marked user-approved.

### Implementation and preservation

- New `ChampagneRococo` wrapper, scoped pale-gilt material, original shell/scroll/sprig SVG geometry and a faint vector leaf-variation asset.
- 21–39px moulding versus Baroque Gold's 26–53px. At 1440px, 39px versus 52px: 25% slimmer. A distinct shallow ogee and narrow flute replace the heavy Baroque cross-section.
- Scalloped shells and unequal open C-scrolls carry the corner emphasis. Slender sprigs taper along the rails; their centres remain undecorated. Carving uses local solid contact shadows and world-aligned gradient lighting, no filters.
- Champagne highlights retain warm gold mids and bronze cavities. Wear is sparse; there is no black dirt, distress pattern or mirror shine.
- Pointer infrastructure follows the established event-driven pattern, with narrower relief intensity changes; the object stays stationary.
- `src/variants/BaroqueGold`, `CarvedOak`, `DarkWalnut` and shared `gallery-frame.css` are unchanged. Shared component change is only the variant type union. Demo adds one scoped fifth study.

### Verification

- `npm run build`: passed (strict TypeScript + production Vite build).
- Live headed Chromium, Windows, local Vite server. No browser errors in the session log.
- Responsive geometry checked at 1920, 1440, 1024, 851, 850, 768, 601, 600, 390, 375 and 320px. All three opening ratios stay within .001 of their intended value, square corners remain square, ornament bounds stay in the viewport, and there is no page horizontal overflow.
- Visually inspected desktop gallery, portrait, square, landscape, corner, rail transition, 390px mobile viewport and all three 320px specimens. The art remains generously held and rail midsections stay quiet.
- Pointer upper-left/lower-right states differ while the frame bounding box remains identical. Leave, immediate cancellation of pending work, reduced-motion and synthetic touch checks all preserve/reset static lighting as expected.
- All document SVG IDs are unique across instances and all Rococo use references resolve.
- Existing interactive content still responds (`1 mark left here.`). Blank opening capture confirms the frame/recess can be viewed without artwork.
- Verification script reports zero failures in `output/playwright/f5a/results.txt`.

### Captures

Local captures are intentionally in the existing ignored `output/` QA directory.

- [Full study](output/playwright/f5a/gallery.png)
- [Portrait](output/playwright/f5a/portrait.png), [square](output/playwright/f5a/square.png), [landscape](output/playwright/f5a/landscape.png)
- [Corner](output/playwright/f5a/corner.png), [rail transition](output/playwright/f5a/rail-transition.png)
- [Mobile 390](output/playwright/f5a/mobile-390.png), [mobile 320](output/playwright/f5a/mobile-320.png)
- [320 portrait](output/playwright/f5a/320-portrait.png), [320 square](output/playwright/f5a/320-square.png), [320 landscape](output/playwright/f5a/320-landscape.png)
- [Upper-left light](output/playwright/f5a/light-upper-left.png), [lower-right light](output/playwright/f5a/light-lower-right.png)
- [Baroque comparison](output/playwright/f5a/baroque-comparison.png), [blank opening](output/playwright/f5a/blank.png)

### Final evaluation

- **Clearly distinct from Baroque Gold?** Yes: paler material, thinner moulding, smaller shell corners, open scrolls and greater exposed rail area.
- **More Rococo than Baroque?** Yes: scalloped fan shells, unequal soft scrolls and tapering sprigs replace the dense lobed acanthus masses.
- **Champagne rather than brassy?** Yes: ivory-gold catches and warm muted mids remain luminous, with enough bronze in the recesses to avoid looking chalky or silver.
- **Lighter and more graceful?** Yes: lower relief, less coverage and a calmer opening across all three ratios.
- **Elegant without being flimsy?** Yes: continuous layered moulding, a dark rabbet and seated ornament preserve structural depth.
- **Strong enough to lock?** Recommend lock as F5A. No additional refinement is needed for this scope.

Remaining limits: the deliberately clean gilt is more salon-kept than heavily antique; fine shell ribs merge gently at 320px, while the shell silhouette and scroll apertures survive. Corners reuse reflected geometry with unequal arms rather than four individually drawn ornaments. Verification covers Chromium/Windows and emulated small viewports/reduced motion, not physical mobile hardware or Safari/Firefox. No deployment is claimed.

## F6A — Ebonised Black (23 September 2026)

Status: implemented and visually reviewed; recommend lock, not yet user-approved.

### Implementation

- New EbonisedBlack wrapper and scoped material/profile CSS; four original full-board SVG veneers preserve construction-aware horizontal/vertical grain and mitred joins.
- Firmer outer quarter-round, deep narrow quirk, descending bevel, broad blackened face and small inner bead differentiate the profile from Walnut's rounded torus/bolection.
- Near-black body with restrained charcoal and warm raised planes. Grain is quieter than Walnut, with fine tapered fibres and broad low-contrast drift. No filters, raster images or new dependencies.
- Muted antique-gold inner lip occupies 89–93% of the rail cross-section, around 1px mobile / 1.84px desktop, followed by a dark rabbet. The lip separates art from timber without becoming a gilded frame.
- Pointer highlights touch only raised mouldings and liner, with lower opacity than Walnut. No transform, tilt, scale or autonomous motion.
- Shared nine-slice CSS, content slot, opening shadow and locked variant sources are unchanged. Additive variant typing and study 06 demo integration preserve the concurrent Champagne Rococo work. Modern Black changes appeared concurrently; they were not authored as part of F6A.

### Verification

- Strict TypeScript and production build pass.
- Live headed Chromium on Windows: opening ratios, square corners, four veneers and absence of horizontal overflow verified at 1920, 1440, 1024, 851, 850, 768, 601, 600, 390, 375 and 320px.
- Pointer states differ without changing bounds; leave/cancel clears overrides, touch and reduced motion retain static light. Existing live content remains interactive. Zero failures in output/playwright/f6a/results.txt.
- Visually inspected desktop three-ratio gallery, individual 320px specimens, 390px mobile, corner, rail, grain, inner lip and both pointer states, with Walnut comparison.
- An HMR duplicate-createRoot warning appeared during concurrent demo edits; final fresh load reports zero console/page errors in output/playwright/f6a/fresh-load.txt. Coverage is Chromium and emulated viewports, not physical mobile or Safari/Firefox.

### Captures

All artifacts are local under output/playwright/f6a/ (ignored QA output): gallery.png; portrait.png; square.png; landscape.png; corner.png; rail-transition.png; corner-2x.png; grain-2x.png; inner-lip-2x.png; mobile-390.png; mobile-320.png; 320-portrait.png; 320-square.png; 320-landscape.png; light-upper-left.png; light-lower-right.png; walnut-comparison.png. The 2x images use temporary browser zoom with the original specimen width retained. Capture and verification scripts accompany the evidence.

### Evaluation

- Ebonised timber: yes; blackened body retains quiet longitudinal wood cues and selective warm burnish.
- Distinct from Dark Walnut: yes; much lower chroma/value, firmer outer profile, broader quieter face and smaller inner bead.
- Gold lip: helps; muted narrow separation gives the artwork breathing room.
- Classical rather than modern: yes; quarter-round, quirk, bevel and bead establish traditional moulding without ornament.
- Elegant severity rather than dullness: yes; small raised catches and stable deep cuts maintain hierarchy.
- Finished variant: recommend lock at F6A. No required refinement pass.

Remaining weak points: grain is intentionally close-view material evidence and becomes very faint at the smallest sizes. Long rails are regular and look carefully finished rather than hand-aged. Pointer changes are deliberately modest. A physical dim/low-contrast display check would help establish how much fine grain survives beyond this browser evidence.

## F7A — Modern Black (23 September 2026)

**Status:** implemented and verified; recommend lock as the final planned variant. No subsequent variant started.

### Implementation

- Separate ModernBlack wrapper and scoped material CSS; two tiny vector surface assets. No runtime dependencies, filters, ornament, gold or animation loop.
- 22–41px profile, 40px at the 1440px demo viewport: narrow outer cut, broad flat satin face (71% of the profile), hard inner step, narrow reveal and black rabbet.
- Four full-board veneers terminate at precise mitres, using the shared nine-slice profiles beneath them to prevent transparent seams. Corners remain square.
- Pointer light follows the existing handler/cancellation architecture, with a very low-energy response on only the outer bevel and inner step. No tilt, lift or transform response.
- Contact and ambient shadow hierarchy preserved with scoped, tighter values. The existing opening overlay receives a calmer scoped occlusion shadow; content geometry is unchanged.
- Additive seventh demo study with the same artwork and three proportions. Existing uncommitted Rococo and concurrently arriving Ebonised Black work preserved. Shared gallery-frame.css is unchanged; the shared component only gains a variant type member.

### Verification

- Strict TypeScript and Vite production build pass.
- Production preview tested in headed Chromium on Windows. No production page or console errors during load/material checks. An earlier development HMR createRoot warning occurred while files were changing; fresh production verification does not reproduce it.
- 1920, 1440, 1024, 851, 850, 768, 601, 600, 390, 375 and 320px viewports: no page horizontal overflow; all opening aspect ratios within .001; square corner geometry retained; four material boards per frame.
- Production SVG material assets and artwork load. Eight decorative slices remain intact; content opening receives pointer input through overlays.
- Upper-left and lower-right pointer states update light coordinates without moving frame bounds. Leave/cancel clear coordinates; reduced-motion and synthetic touch preserve static light.
- Existing live canvas remains interactive: `1 mark left here.`
- Visual inspection: desktop collection, square, hard corner, inner step, both light states, 390px viewport and all three 320px proportions. No open seams observed. Artwork remains clearly held behind the inner step.
- `output/playwright/f7a/results.txt`: zero failures. Production load evidence: `production-results.txt`. Scripts and screenshots remain in the ignored local QA directory.

### Captures

- [Full study](output/playwright/f7a/gallery.png)
- [Portrait](output/playwright/f7a/portrait.png), [square](output/playwright/f7a/square.png), [landscape](output/playwright/f7a/landscape.png)
- [Hard corner](output/playwright/f7a/corner.png), [inner step and recess](output/playwright/f7a/inner-step.png)
- [Mobile 390](output/playwright/f7a/mobile-390.png), [mobile 320](output/playwright/f7a/mobile-320.png)
- [320 portrait](output/playwright/f7a/320-portrait.png), [320 square](output/playwright/f7a/320-square.png), [320 landscape](output/playwright/f7a/320-landscape.png)
- [Upper-left light](output/playwright/f7a/light-upper-left.png), [lower-right light](output/playwright/f7a/light-lower-right.png)
- [Ebonised Black comparison](output/playwright/f7a/ebonised-comparison.png), [blank opening](output/playwright/f7a/blank.png)

### Final evaluation

- Contemporary rather than classical: yes. Broad planar faces and cut steps replace moulded rolls, reeds and decorative channels.
- Distinct from Ebonised Black: yes, verified against the rendered local variant. No gold lip, much less surface character, flatter profile and tighter shadows.
- Premium minimalism: yes. Controlled edge catches, precise mitres and disciplined proportions carry the material.
- Enough physical depth: yes. The dark reveal, rabbet and restrained contact shadow keep the picture visibly behind a substantial object.
- Calm without generic: yes. The thin bevel and stepped opening prevent a featureless border; no glossy face sheen or monitor-like rounded corners.
- Strong enough to lock: recommend lock. No further material refinement is necessary for F7A.

Remaining weak points: the grain is intentionally close to invisible at normal size, so the material reads primarily as satin-black finished timber rather than visibly grained wood. The equally lit upper-left mitre is quieter than the contrasting upper-right/lower-left joints; its outline remains hard. On low-brightness displays the broad black face may lose some nuance; physical display testing was not performed. Browser coverage is Chromium on Windows with emulated viewport/touch/reduced-motion checks, not physical mobile hardware, Safari or Firefox. No deployment is claimed.

## F5A.1 — Champagne Rococo ornament identity (23 September 2026)

**Status:** identity refinement complete; recommended for lock, pending Nick's visual approval.

### Change and scope

Only `src/variants/ChampagneRococo/RococoOrnament.tsx` changes in the runtime implementation for this pass. The former fan/paired-volute/leaf arrangement is replaced with a rounded scallop, pinched hinge, one open horizontal C-ribbon and a finer descending S-tendril. Two leaf tips are removed. The unequal arms repeat consistently in all four corners: internal asymmetry within a coherent frame. The body library falls from seven filled paths to five, including the shell; rail midsections receive no new ornament.

The palette and body gradient remain unchanged. Slightly stronger local contact opacity (.60 to .70), warm bronze flute grooves, pale narrow flute crests and a small hinge undercut improve relief separation without darkening the frame as a whole. The structure remains seated across the moulding, with above-left light retained through reflected gradients and offset geometry.

Hashes confirm Rococo CSS, wrapper and gilt asset, shared frame CSS and page CSS are byte-identical to the start of this pass. No changes were made here to the generic component or demo. Unrelated Ebonised Black / Modern Black work was already present in this shared workspace; concurrent changes to the generic variant union and demo were left intact and are not part of F5A.1.

### Verification and visual evaluation

- Production build and strict TypeScript: passed.
- Reused the responsive/pointer QA harness after reloading the page. All checks passed: portrait/square/landscape ratios, square slice geometry, in-viewport ornament bounds and no horizontal overflow at 1920, 1440, 1024, 851, 850, 768, 601, 600, 390, 375 and 320px.
- Pointer states differ without changing the frame bounds. Leave/cancel, touch and reduced motion remain static/reset correctly. SVG IDs are unique and all references resolve. Existing live content still responds.
- Inspected full desktop gallery, a direct same-width Baroque/Rococo comparison, high-resolution corner detail, rail transition and all three 320px specimens.
- The shell now reads as a scallop with radiating flutes, rather than leaf foliage. One C-ribbon versus one S-tendril gives clearly different internal movement. The muscular paired volutes, leaf masses and dense undercuts of Baroque Gold are absent.
- Rails and artwork remain calm. Local groove separation is clearer, while the moulding retains exactly the pale-gilt material of F5A.
- Recommendation: ready to lock. Remaining limitation: the finest flutes soften at minimum mobile sizes; the scallop silhouette and unequal arms remain legible. The ornament is deliberately stylised, not a photorealistic carving. Four corners still reflect one disciplined asymmetric master. Validation covers Chromium/Windows and emulated sizes, not physical phones or other browser engines.

### Evidence

Captures and the repeatable QA scripts are in the ignored local `output/playwright/f5a1/` directory. Earlier F5A captures remain intact.

- [Direct Baroque comparison](output/playwright/f5a1/comparison.png)
- [Full study](output/playwright/f5a1/gallery.png)
- [Portrait](output/playwright/f5a1/portrait.png), [square](output/playwright/f5a1/square.png), [landscape](output/playwright/f5a1/landscape.png)
- [High-resolution corner](output/playwright/f5a1/corner-detail.png), [rail transition](output/playwright/f5a1/rail-transition.png)
- [Mobile viewport](output/playwright/f5a1/mobile-390.png)
- [320 portrait](output/playwright/f5a1/320-portrait.png), [320 square](output/playwright/f5a1/320-square.png), [320 landscape](output/playwright/f5a1/320-landscape.png)
- [Upper-left light](output/playwright/f5a1/light-upper-left.png), [lower-right light](output/playwright/f5a1/light-lower-right.png)
- [Previous corner](output/playwright/f5a1/before-corner.png), [previous portrait](output/playwright/f5a1/before-portrait.png)
- [Verification results](output/playwright/f5a1/results.txt), [preservation hashes](output/playwright/f5a1/preserved-hashes.json)


## Collection polish — 23 September 2026

User-requested material refinement over the existing uncommitted collection; no lock or release implied.

- Champagne Rococo: varied the existing tendril thickness, added two shallow fold/undercut treatments within the stems, warmed shell grooves and modestly deepened local gradient troughs. Pale highlights, shell silhouette, ornament count and rail material remain intact. The 5–10% contrast request is treated as an artistic target, not a measured perceptual claim.
- Ebonised Black: a masked copy of the existing fibres emerges faintly in moving light on the broad face. Reduced the gold lip's peak RGB values by approximately 5% and its moving glint alpha from 22 to 21/255.
- Modern Black: explicitly blackened ash in the demo, with sparse tapered fibres and a faint moving grain mask. Broad face, widths, hard corners, steps and shadows preserved.
- Dark Walnut: two low-opacity, broad chromatic grain fields in both directional assets give warmer/cooler variation on the widest face. Existing profile colours, brightness stops and lighting remain unchanged.
- Carved Oak and Baroque Gold are byte-identical to the pass baseline, as is shared frame CSS. Baroque retains its darker, deeper offset contact and undercut shadows; direct screenshots confirm stronger ornament weight than Champagne.

Verification: strict TypeScript and production build pass; git diff --check passes. Chromium desktop and emulated widths 1920, 1440, 1024, 850, 768, 600, 390 and 320: all 18 material specimens retain opening ratios and square corners, with no horizontal overflow. All six variants pass moving-light/stable-bounds, leave/cancel reset, touch and reduced-motion checks. SVG references resolve, IDs are unique, and live content remains interactive. Fresh page reports zero console/page errors. The first enlarged Ebonised grain check used an offscreen pointer coordinate; after scrolling the rail itself into view, both black variants' computed grain masks change with real pointer movement.

Visually inspected all six desktop portraits and 390px portraits, before/after enlarged Rococo detail, and enlarged black timber rails under moving light. Grain remains intentionally faint, especially on small or dim displays. No physical-display, Safari or Firefox verification.

Baseline source copies, preservation hashes, reproducible capture/verification scripts, screenshots and zero-failure results are in `output/playwright/polish/`. No commit, push or deployment performed.
