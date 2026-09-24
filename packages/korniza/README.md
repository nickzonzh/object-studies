# korniza

Six dimensional React frames for images, typography and arbitrary content. The mouldings are CSS cross-sections and SVG ornament — no raster frame assets, no canvas, no runtime dependency beyond React.

```sh
npm install korniza
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

The stylesheet is a single file and must be imported once, anywhere in your app. Requires React 19.

## The collection

| `variant` | Name | Character / use |
| --- | --- | --- |
| `baroque-gold` | Baroque Gold | Ornate antique gilt with a carved gadroon; paintings and expressive compositions |
| `champagne-rococo` | Champagne Rococo | Pale airy ornament; delicate artwork and typography |
| `carved-oak` | Carved Oak | Waxed oak carved in the Louis XIII manner: a leaf-and-flower torus, acanthus corners and centres, a leaf-tip sight edge; landscapes, still life and everyday content |
| `dark-walnut` | Dark Walnut | Rich formal timber with an antique-gold slip; traditional artwork and portraits |
| `ebonised-black` | Ebonised Black | Severe classical blackened timber with a fine gold lip |
| `modern-black` | Modern Black | Contemporary architectural minimalism; photography and graphics |

`frameVariants` exports the same list — identifier, display name and a one-line description — in canonical order.

## Props

| Prop | Default | Meaning |
| --- | --- | --- |
| `variant` | required | One of the six kebab-case identifiers above. An unknown value throws, naming the value and the valid set |
| `aspectRatio` | `"4 / 5"` | CSS aspect ratio of the **opening**, excluding the mouldings. `"auto"` lets normal-flow content set the height |
| `children` | none | Your unmodified React content |
| `mat` | `false` | A bevelled mat board between the moulding and the content. `true`, or `{ width, color }` with any CSS length/colour |
| `glazing` | `false` | A faint glass sheen in front of the opening, following the same light |
| `interactiveLight` | `true` | Pointer-driven material highlights on the mouldings |
| `className`, `style` | none | Applied to the outer wrapper, which is also the theming surface |
| `ref` | none | Forwarded to the outer wrapper `div` |
| Other div attributes/events | none | Forwarded to the wrapper; pointer handlers are composed with the internal lighting |

`FrameImage` accepts normal `img` props, requires `alt` in TypeScript, and fills the opening with `object-fit: cover`. Override with `style={{ objectFit: 'contain' }}` or `objectPosition` when cropping is inappropriate; use `alt=""` only for decorative images.

Exported types: `FrameProps`, `FrameVariant`, `FrameMat`.

### Mat and glazing

```tsx
<Frame variant="dark-walnut" aspectRatio="3 / 2" mat glazing>
  <FrameImage src="/painting.jpg" alt="Wheat field below cypresses" />
</Frame>

// A narrower, warmer board
<Frame variant="champagne-rococo" mat={{ width: '7%', color: '#f3ece0' }}>
  <YourCard />
</Frame>
```

The mat fills the opening and the artwork window is cut into it, so `aspectRatio` keeps describing the same rectangle whether or not a mat is present. The board width, its 45° bevel and the shadow the frame lip casts onto it all scale with the frame, like the mouldings. Both props are off by default.

## Per-variant imports

Each material has its own entry point, so a single-variant consumer bundles one frame instead of six:

```tsx
import { Frame, FrameImage } from 'korniza/carved-oak'
import 'korniza/style.css'
```

The subpath exports the same component under the name `Frame` with its `variant` fixed, plus `FrameImage`, `FrameProps` and `FrameMat`. Subpaths are `korniza/baroque-gold`, `korniza/champagne-rococo`, `korniza/carved-oak`, `korniza/dark-walnut`, `korniza/ebonised-black` and `korniza/modern-black`. The stylesheet is not split: `korniza/style.css` carries all six materials (125 kB raw, 37 kB gzipped, every inlined texture included).

## Theming

Every class the package ships is namespaced: the wrapper is `.korniza`, everything else is `korniza-*`. The wrapper is also where the documented custom properties are read, so `className` or `style` is enough to retune a frame.

| Property | Default | Effect |
| --- | --- | --- |
| `--korniza-frame-width` | per variant, `clamp(12px, 7.5–10.2cqw, 39–53px)` rounded to whole pixels | Moulding thickness; everything else is derived from it |
| `--korniza-mat-width` | `calc(var(--frame-width) * .66)` | Mat board width |
| `--korniza-mat-color` | `#ece7db` | Mat board colour |
| `--korniza-mat-bevel` | `max(2px, calc(var(--frame-width) * .085))` | Depth of the 45° bevel |
| `--korniza-opening-background` | `#ddd7c8` | Colour behind the content |
| `--korniza-shadow` | four-layer cast shadow | The whole `box-shadow` of the frame |
| `--korniza-light-x`, `--korniza-light-y` | `26%`, `16%` | Rest position of the key light |
| `--korniza-sheen-strength` | `1` | Multiplier on the travelling highlight (`0` disables it) |
| `--korniza-glazing-strength` | `1` | Multiplier on the glass sheen |

```tsx
<Frame variant="carved-oak" style={{ '--korniza-frame-width': '28px' } as CSSProperties} />
```

## Width, ratios and content

Frames fill their parent's width; constrain them with ordinary CSS. The wrapper is a size container, so moulding thickness responds to the frame's own width rather than the viewport. The supported practical minimum outer width is 220px; allow about 10px outside it for protruding ornament and more for the cast shadow.

Content sits in the recessed opening with `overflow: auto`, so oversized custom content scrolls instead of pushing the mouldings apart. Children are never cloned or restyled: give a card its own padding, colours and sizing. Decorative layers ignore pointer events, so focus, selection, scrolling and media controls all keep working.

**Containing-block caveat.** `.korniza` declares `container-type: inline-size`, which implies `contain: layout style inline-size`. The wrapper therefore becomes the containing block for `position: fixed` and `position: absolute` descendants and establishes a new stacking context. Content inside a frame that relies on `position: fixed` — a modal, a dropdown, a tooltip rendered in place — is positioned relative to the frame and clipped by the opening. Render those into a portal outside the frame. There is no opt-out that preserves container-relative moulding scale.

## Light, motion and accessibility

The key light sits above and to the left; cast shadows fall down and slightly right. Pointer motion moves the highlight along the mouldings and shifts the shading opposite it — it never moves the frame or touches the artwork. One `getBoundingClientRect` and one style write per animation frame, no React state, no idle animation loop.

The baseline is restored when the pointer leaves or cancels, when the window loses focus, when `interactiveLight` becomes `false`, and when the reduced-motion or pointer-capability preference changes. Touch and coarse-only pointers keep the static rest light. `prefers-reduced-motion: reduce` pins the light position. A consumer handler may call `preventDefault()` to suppress a single update.

Every decorative layer is `aria-hidden` and `pointer-events: none`, and the frame claims no role or label of its own — describe your own content, and wrap it in `figure`/`figcaption` where that is meaningful. No keyboard interaction is needed for the light.

## Server rendering

No `window`, `document`, `localStorage`, `matchMedia` or `devicePixelRatio` is touched at module scope or during render; the media queries live in an effect. `renderToString` is covered by the test suite for all six variants, including the mat and glazing layers. The ESM entry carries a `"use client"` banner for React Server Component hosts.

## Browser support

Modern evergreen browsers. The frames need CSS container queries, `mask-composite`, `aspect-ratio` and `clip-path`. Whole-pixel rail rounding uses `round()` behind an `@supports` query and is simply skipped where it is unavailable. This is not a legacy-browser compatibility library.

## Development

From the monorepo root: `npm install`, then

```sh
npm run dev -w korniza          # demo at http://127.0.0.1:5173
npm run typecheck -w korniza
npx vitest run packages/korniza
npm run build -w korniza        # dist/: ESM entries, declarations, one style.css
npm run check:package -w korniza
```

Two generators back the assets, and neither runs during a build:

```sh
node scripts/generate-grain.mjs      # timber grain SVG textures
node scripts/build-demo-images.mjs   # demo painting derivatives from the Met API
```

`src/` is the library, `demo/` is the (unpublished) comparison demo, `test/` holds the vitest suite. `docs/spec.md` is the original design brief and `docs/qa.md` the manual acceptance record from the pre-package phase; both are kept as history, and paths inside them predate this layout.

## Demo asset credits

- Vincent van Gogh, *Wheat Field with Cypresses* (1889), [The Metropolitan Museum of Art, 1993.132](https://www.metmuseum.org/art/collection/search/436535). Open Access, CC0.
- *The Blue Marble* (1972), Apollo 17 crew / [NASA](https://www.nasa.gov/image-article/apollo-17-blue-marble/). Photographic fixture only; no endorsement implied.
- `still-land.svg`: original graphic study included with the project.

MIT © Nick
