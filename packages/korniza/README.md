# KORNIZA

Six dimensional React frames for images, typography and arbitrary content. CSS mouldings and SVG ornament provide depth without raster frame assets. The v1 collection is visually locked; this repository contains the components and a restrained comparison demo.

## Collection

| `variant` | Name | Character / use |
| --- | --- | --- |
| `baroque-gold` | Baroque Gold | Ornate antique gilt; paintings and expressive compositions |
| `champagne-rococo` | Champagne Rococo | Pale airy ornament; delicate artwork and typography |
| `carved-oak` | Carved Oak | Warm restrained timber; photography and everyday content |
| `dark-walnut` | Dark Walnut | Rich formal timber; traditional artwork and portraits |
| `ebonised-black` | Ebonised Black | Severe classical blackened timber with a fine gold lip |
| `modern-black` | Modern Black | Contemporary architectural minimalism; photography and graphics |

## Run locally

Node 22.12+ and npm are required. React 19.2+ within major 19 is the supported peer range (verified here with React 19.3).

```sh
npm ci
npm run dev
npm run check     # TypeScript, demo build and library build
npm run preview  # serve the production demo
```

The demo opens at `http://127.0.0.1:5173`. Its anchor is **Six frames. One painting.** Content, opening ratio and pointer-light controls apply identical conditions to all six variants. Below it are a single photograph, a live React card and a typography study. The demo images are local; no external service is required at runtime.

## Use

The package is not published. To try it in another local project:

```sh
# In this repository; prepack builds the library and its declarations
npm pack --ignore-scripts=false
# In a React application
npm install /absolute/path/to/korniza-0.1.0.tgz
```

```tsx
import { Frame, FrameImage } from 'korniza'
import 'korniza/style.css'

export function Photograph() {
  return (
    <Frame variant="modern-black" aspectRatio="3 / 2" style={{ maxWidth: 520 }}>
      <FrameImage src="/photograph.jpg" alt="Morning light across a quiet courtyard" />
    </Frame>
  )
}
```

### Public API

| Prop | Default | Meaning |
| --- | --- | --- |
| `variant` | required | One of the six kebab-case identifiers above |
| `aspectRatio` | `"4 / 5"` | CSS aspect ratio of the **opening**, excluding rails; a positive number or ratio string |
| `children` | none | Your unmodified React content |
| `interactiveLight` | `true` | Enable restrained pointer-driven material highlights |
| `className`, `style` | none | Applied to the outer width/container wrapper |
| Other div attributes/events | none | Forwarded to the outer wrapper; handlers are composed with internal lighting |

`FrameImage` accepts normal image props and requires `alt` in TypeScript. It fills the opening using `object-fit: cover`; override `style={{ objectFit: 'contain' }}` or `objectPosition` when cropping is inappropriate. Use `alt=""` only for decorative images. The frame adds no image role or accessible label of its own: use meaningful child semantics and a surrounding `figure`/`figcaption` where appropriate.

Also exported: `FrameProps`, `FrameVariant`, and the readonly `frameVariants` metadata array in canonical collection order. The shell and variant-specific components are internal. There is no prototype variant in the public API. Earlier source-level `GalleryFrame` / variant imports and `ratio` are replaced by `Frame` and `aspectRatio`.

### Width, ratios and content

Frames fill their parent's available width. Use normal CSS, `className`, or `style` for a maximum width; no separate size prop is needed. A container wrapper makes rail thickness respond to the frame's own width, with whole-CSS-pixel rounding where supported and a maximum per material. Place it in a width-constrained block or grid. The supported practical minimum outer width is 220px; allow about 10px of space outside it for protruding ornament, and more for shadows.

Use `aspectRatio={1}`, `"4 / 5"`, or `"3 / 2"` for fixed openings. `aspectRatio="auto"` lets normal-flow content determine height; use this for longer cards rather than a fill-positioned `FrameImage`. Invalid, zero or negative ratios are outside the API contract.

Content is contained in the recessed opening with `overflow: auto`: oversized custom content can scroll instead of pushing the rails apart. Children are not cloned or assigned styles. Give a custom card its own padding, colors and sizing. The decorative layers ignore pointer events. Focus, selection, scrolling and media controls remain available. For simple art cards use `minHeight: '100%'`; for full-bleed video use absolute positioning and `objectFit` inside the fixed opening.

```tsx
<Frame variant="carved-oak" aspectRatio={1} interactiveLight={false}>
  <div style={{ minHeight: '100%', padding: 24, background: '#e9ddc9', boxSizing: 'border-box' }}>
    <h2>A small idea</h2>
    <p>Any semantic HTML or React component can live here.</p>
    <button onClick={() => alert('Still your interface')}>Open the note</button>
  </div>
</Frame>
```

```tsx
// Compare the same content in every material.
import { Frame, FrameImage, frameVariants } from 'korniza'

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 40 }}>
  {frameVariants.map(({ variant, name }) => (
    <figure key={variant} style={{ margin: 0 }}>
      <Frame variant={variant} aspectRatio="4 / 5">
        <FrameImage src="/artwork.jpg" alt="Describe the artwork here" />
      </Frame>
      <figcaption>{name}</figcaption>
    </figure>
  ))}
</div>
```

### Light and accessibility

The idle world light comes from above-left. Pointer motion only changes material highlights, never the artwork or frame position. Gold keeps a richer response than timber. Updates are batched into animation frames with no React state updates or idle animation loop. Leaving/cancelling a pointer, disabling the prop, changing reduced-motion preference and losing window focus restore the baseline. Touch and coarse-only pointers use static lighting. User handlers can call `preventDefault()` to suppress a light update.

No keyboard interaction is needed for the decorative light. Supply accessible labels for your own content and controls. Long content remains scrollable; choose an automatic-height opening when that provides a better reading experience. See [QA.md](QA.md) for tested conditions and limitations.

## Architecture and packaging

- `src/index.ts`: intentional public exports.
- `src/Frame.tsx` and `src/variants.ts`: six-variant dispatch and canonical metadata.
- `src/components/GalleryFrame.tsx`: width container, eight frame slices and one content opening.
- `src/components/usePointerLight.ts`: shared event-driven lighting and cleanup.
- `src/variants/`: isolated material profiles, lightweight composition and locked SVG geometry.
- `src/main.tsx`, `src/style.css`: demo only, excluded from the package.
- `vite.lib.config.ts`, `tsconfig.lib.json`: ESM, declarations, external React, standalone CSS.

`npm run build` produces the demo in `dist/`; `npm run build:lib` produces the library in `dist-lib/`. Import the stylesheet once. Material SVG textures are embedded in the library CSS, so consumers need no asset-copy step. The package ships no demo photographs, React runtime or global page reset. The ESM entry includes a client boundary for React server-component hosts; normal server rendering is also supported. Multiple frames use unique SVG IDs.

Modern browsers with CSS container queries, masks and aspect ratio are required. The unrounded rail declaration is a fallback for browsers lacking CSS `round()`. This is not a legacy-browser compatibility library.

`private: true` and `UNLICENSED` intentionally remain until the owner selects a license and approves publication. Packing and installing locally are supported. Before a public release, select the license, confirm package-name availability and version, and complete the remaining browser/device checks in QA.md. Nothing is published by the build commands.

## Demo asset credits

- Vincent van Gogh, *Wheat Field with Cypresses* (1889), [The Metropolitan Museum of Art, 1993.132](https://www.metmuseum.org/art/collection/search/436535), public-domain collection image.
- *The Blue Marble* (1972), Apollo 17 crew / [NASA](https://www.nasa.gov/image-article/apollo-17-blue-marble/). Used as a photographic content fixture; no NASA endorsement implied.
- `still-land.svg`: original graphic study included with the project.

The historic design brief remains in `KORNIZA_SPEC.md`; the current API and scope are documented here.
