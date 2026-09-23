# KORNIZA

Frames for things worth looking at. A React component collection, with a small gallery demo.

This implementation covers **F0 through F4A**. The neutral prototype establishes scalable geometry; Baroque Gold is the first approved and locked fully ornamented variant (23 September 2026), with four consistent acanthus/scroll corners and restrained leaf shoots tapering into quiet rail centres.

## Develop

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

`npm run build` includes strict TypeScript checking. React and React DOM are the only runtime dependencies.

## Components

Import from `src/components`; the component imports its own scoped CSS. The gallery page styles are separate.

```tsx
import { GalleryFrame, GalleryArtwork } from './components'

<GalleryFrame variant="prototype" ratio="4 / 5">
  <GalleryArtwork src="/artwork.jpg" alt="Description of the artwork" />
</GalleryFrame>

<GalleryFrame ratio="3 / 2">
  <YourInteractiveComponent />
</GalleryFrame>
```

`ratio` describes the **content opening**, not the outer silhouette. It accepts CSS aspect ratios, including numeric values. Use positive, finite ratios. The wrapper accepts normal div attributes, `className` and `style`. Arbitrary children retain their own styling and semantics; consumers size their own content. Oversized content scrolls inside the opening rather than distorting the frame. Only the optional `GalleryArtwork` helper applies image fitting.

## Geometry and depth

An explicit 3 × 3 CSS grid holds eight decorative slices and a genuine DOM opening. Corner squares have the same dimensions as the rail thickness. Horizontal rails only extend horizontally; vertical rails only extend vertically. The two triangular faces of each corner share the exact gradient profile of their adjoining rails. Corner backgrounds overlap under the mitre to avoid transparent antialias gaps.

Thickness is clamped from 20–38px and rounded to whole CSS pixels in supporting browsers, with a clamp fallback. Override `--frame-width` in a consumer class if needed. The default is tuned for frame widths in this demo; exceptionally tiny hosts need a smaller custom thickness.

Shared profile stops form an outer lip, recessed sweep, front bead and dark rabbet. Darker right/bottom faces establish a static upper-left light. A pointer-transparent inset shadow overlaps the opening, while separate contact and ambient shadows mount the frame against the wall. There are no textures, filters, animation loops, tilt, glass, or child-style resets.

The frame structure is hidden from assistive technology. Child semantics, pointer events and keyboard focus remain native.

## Baroque Gold (F2C)

```tsx
import { BaroqueGold } from './variants/BaroqueGold/BaroqueGold'

<BaroqueGold ratio="4 / 5">
  <GalleryArtwork src="/artwork.jpg" alt="Description of the artwork" />
</BaroqueGold>
```

Use the `BaroqueGold` wrapper to load its scoped material CSS and pointer lighting. It accepts the same div/content props as `GalleryFrame`, with the variant fixed. Generic geometry and its 20–38px scaling remain unchanged; gold owns a 26–53px width token. Shared corner/rail profiles describe the outer lip, convex moulding, patinated channel, secondary roll, relief fillet, inner liner and dark rabbet.

A small local SVG supplies faint leaf variation without raster textures or filters. A masked highlight affects the raised outer moulding only. Pointer events schedule at most one pending animation frame, with no idle loop; leave/cancel restores above-left light. Touch and reduced-motion users receive static light. The frame and artwork never move. Caller pointer handlers are preserved.

F2C reuses the approved F2B.1 master in all four corners. `cornerGeometry.ts` remains the geometry authority: lobed diagonal acanthus, folded heel, unequal scrolls, tucked root leaves and local undercuts. `BaroqueCorner.tsx` defines the path groups once per frame and references them with SVG uses. Reflected instances counter-reflect body/fold gradients and relief offsets to keep the light above-left; far-side crest colours are warmer. The original top-left geometry, palette and relief offsets remain unchanged.

`BaroqueRails.tsx` adds two reusable shallow leaf-shoot paths. Fixed-size shoots emerge beneath each scroll tip, fade along each half-rail and leave the centre quiet. They do not stretch or tile with the artwork ratio. Corner layering sits above the rail shoots, which occupy the convex moulding and leave channels and liner clear. Mobile lowers rail contrast slightly without replacing the ornament. The completed ornament totals 46 DOM paths and 56 uses per frame, with no filters, new animation loops, assets or runtime dependencies. SVG IDs remain unique across multiple instances.

The F1 comparison remains in the demo. Gold specimens stack between 601 and 850px as well as on mobile, giving the complete carving room without changing component width tokens or geometry. QA and screenshots are recorded in `QA.md`.

## Carved Oak (F3A.1)

```tsx
import { CarvedOak } from './variants/CarvedOak/CarvedOak'

<CarvedOak ratio="4 / 5">
  <GalleryArtwork src="/artwork.jpg" alt="Description of the artwork" />
</CarvedOak>
```

The first timber-study candidate uses a separate 23–44px moulding: eased outer edge, shallow channel, broad sloping oak face, double inner reed and dark rabbet. The generic grid and content slot are unchanged. Four pointer-transparent material surfaces span complete boards with clipped mitres, maintaining grain continuity across the underlying corner/rail slices. Two small non-tiled SVG assets supply tapered grain bands, pores and scattered pale rays; gradients provide the shaped timber body and static above-left shading. There are no raster textures or SVG filters.

The wrapper follows the existing event-driven pointer-light architecture, with softer masked highlights on the outer edge and inner reed. It preserves caller handlers, cancels pending work on unmount/leave/cancel, and skips touch and reduced-motion interaction. There is no idle loop or pointer-triggered React state update. The restrained demo includes all three proportions, stacking at tablet/mobile sizes. This is F3A only: no heavy ornament or F3B work. F3A.1 lifts the timber toward golden-neutral medium oak, opens the broad-face grain and pores slightly, and softens the satin sheen while preserving all geometry and pointer behaviour. Approved and locked by Nick on 23 September 2026: Carved Oak F3A.1 is the second real Korniza variant and the first locked timber variant.

## Dark Walnut (F4A)

```tsx
import { DarkWalnut } from './variants/DarkWalnut/DarkWalnut'

<DarkWalnut ratio="4 / 5">
  <GalleryArtwork src="/artwork.jpg" alt="Description of the artwork" />
</DarkWalnut>
```

A distinct 25–48px walnut profile: rounded outer moulding, deep narrow channel, broad warm-brown face, polished inner bolection, very thin antique-gold slip and near-black rabbet. Fine flowing grain and small pores use two non-tiled vector assets, with no raster textures, filters, botanical decoration or runtime dependencies. Full-board surfaces retain directional grain through slice boundaries and terminate at mitres. The slip occupies approximately 3% of the moulding width (0.75–1.44 CSS pixels), subordinate to the timber.

The existing event-driven pointer-light pattern is retained locally: broad faces respond weakly, raised mouldings catch warmer polish, and the liner receives a faint glint. Recesses and artwork remain static. Touch/reduced-motion use fixed light; leave/cancel and unmount clean up pending work. The shared shell, artwork recess and wall shadows are unchanged, as are the locked Oak and Gold variants. Only the shared TypeScript variant union is extended.

The fourth demo study includes portrait, square and landscape using the same artwork for comparison. Approved and locked by Nick on 23 September 2026: Dark Walnut F4A is the third finished Korniza variant. The approved baseline includes the final 5% grain-opacity lift; preserve its material, profile, polish and thin antique-gold liner. No heavier ornament milestone has begun.

## Delivery

The Build workflow runs `npm ci` and `npm run build` for pushes and pull requests. The manually dispatched Pages workflow builds and deploys `dist`; set repository Pages source to GitHub Actions. Relative asset paths support the `/korniza/` project URL and custom domains.

The original `KORNIZA_SPEC.md` describes the broader roadmap. It does not imply later milestones are implemented. The demo landscape is an original lightweight SVG, not an external image dependency.

See [QA.md](QA.md) for verification and limits.
