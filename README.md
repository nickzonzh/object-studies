# KORNIZA

Frames for things worth looking at. A React component collection, with a small gallery demo.

This implementation covers **F0, polished F1, F2A / F2A.1, and the F2B hero corner**. The neutral prototype establishes scalable geometry; Baroque Gold adds antique gilded moulding and one authored top-left acanthus/scroll relief. The other corners and full rail ornament remain unimplemented.

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

## Baroque Gold (F2A / F2B)

```tsx
import { BaroqueGold } from './variants/BaroqueGold/BaroqueGold'

<BaroqueGold ratio="4 / 5">
  <GalleryArtwork src="/artwork.jpg" alt="Description of the artwork" />
</BaroqueGold>
```

Use the `BaroqueGold` wrapper to load its scoped material CSS and pointer lighting. It accepts the same div/content props as `GalleryFrame`, with the variant fixed. Generic geometry and its 20–38px scaling remain unchanged; gold owns a 26–53px width token. Shared corner/rail profiles describe the outer lip, convex moulding, patinated channel, secondary roll, relief fillet, inner liner and dark rabbet.

A small local SVG supplies faint leaf variation without raster textures or filters. A masked highlight affects the raised outer moulding only. Pointer events schedule at most one pending animation frame, with no idle loop; leave/cancel restores above-left light. Touch and reduced-motion users receive static light. The frame and artwork never move. Caller pointer handlers are preserved.

F2B adds `BaroqueCorner.tsx`, with authored geometry in `cornerGeometry.ts` and material/relief layers in the component. The generic shell's optional `decoration` slot sits outside the content opening; it changes no grid tracks. `BaroqueGold` owns that slot. The square SVG scales at 3.2 times frame thickness (50 drawing units per thickness), independent of artwork ratio. Only the top-left receives a composition: a lobed diagonal acanthus, a folded heel, unequal scrolls and short rail tails. The hero refinement adds two tucked root leaves, broader fold planes and local undercuts, shortens the horizontal reach by 12.6% and the vertical reach by 5.7%, and warms the ornament's mid-golds. Solid offset copies supply contact relief; stable brown cuts separate folds; pale edge catches respond to the unchanged pointer handler. There are 41 unique authored paths, 47 path elements including definitions, four uses and two gradients per corner; no filters or external ornament assets.

## Delivery

The Build workflow runs `npm ci` and `npm run build` for pushes and pull requests. The manually dispatched Pages workflow builds and deploys `dist`; set repository Pages source to GitHub Actions. Relative asset paths support the `/korniza/` project URL and custom domains.

The original `KORNIZA_SPEC.md` describes the broader roadmap. It does not imply later milestones are implemented. The demo landscape is an original lightweight SVG, not an external image dependency.

See [QA.md](QA.md) for verification and limits.
