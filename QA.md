# F0 + F1 verification

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
