# KORNIZA

Frames for things worth looking at. A React component collection, with a small gallery demo.

This implementation covers **F0 + F1 only**. The prototype establishes scalable geometry and physical depth; decorative materials and F2 are intentionally absent.

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

The frame structure is hidden from assistive technology. Child semantics, pointer events and keyboard focus remain native. There is no motion, including with reduced-motion preferences.

## Delivery

The Build workflow runs `npm ci` and `npm run build` for pushes and pull requests. The manually dispatched Pages workflow builds and deploys `dist`; set repository Pages source to GitHub Actions. Relative asset paths support the `/korniza/` project URL and custom domains.

The original `KORNIZA_SPEC.md` describes the broader roadmap. It does not imply later milestones are implemented. The demo landscape is an original lightweight SVG, not an external image dependency.

See [QA.md](QA.md) for verification and limits.
