# F0 + F1 verification

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
