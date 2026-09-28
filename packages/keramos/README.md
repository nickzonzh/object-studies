# keramos

Hand-painted Greek pottery for React. Glazed vessels and wall plates that turn
on a shelf, catch the light as the pointer moves, and can be dragged round to
see the back. Every seed paints a different piece, stroke by stroke, in the
Rhodian (Ikaros), black-figure or red-figure tradition.

κέραμος: Greek for potter's clay.

```sh
npm install keramos
```

```tsx
import { Vase } from 'keramos'
import 'keramos/style.css'

export function Piece() {
  return <Vase shape="rhodos" vaseStyle="ikaros" palette="cobalt-gold" seed={42} />
}
```

The stylesheet is a separate import so it can be bundled, ordered or overridden
like any other CSS. Every rule is scoped to `.keramos-vase`.

MIT. React 19 and a browser with WebGL2. No other runtime dependency beyond
[`object-studies-core`](../core).

## What you get

- Seven shapes: Rhodos bottle, baluster vase, oinochoe jug, tankard mug, wall
  plate, neck amphora and lekythos. `SHAPES` lists them with their labels.
- Three painting traditions and their palettes, listed in `STYLES`:
  Ikaros (cobalt and gold, Lindos, midnight, folk), black-figure and
  red-figure (Attic, Corinthian).
- A glaze that behaves like glaze: clear-coat reflections of a studio window,
  burnished gold, raised enamel, soft shadows and a contact shadow on the shelf.
- The pointer is a lamp. Drag or use the arrow keys to turn a piece.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `shape` | `ShapeId` | `'rhodos'` | |
| `vaseStyle` | `StyleId` | `'ikaros'` | `'ikaros'`, `'black-figure'` or `'red-figure'`. |
| `palette` | `string` | `'cobalt-gold'` | A palette id from `STYLES`. An id the style does not have falls back to its first palette. |
| `seed` | `number` | `7` | Each seed is a different piece. The same seed always paints the same piece, at any size. |
| `mode` | `'live' \| 'still'` | `'live'` | `live` renders continuously on its own GPU context: use it for the one piece people will study. `still` renders once and wakes only while hovered, focused or dragged. Every still piece on a page shares one GPU context. |
| `turntable` | `boolean` | `true` | Slow idle rotation. Still pieces only turn while engaged; plates stay put. |
| `angle` | `number` | `0` | Starting rotation in radians. At `0` a handle sits in profile on the left; at `Math.PI`, on the right. |
| `draggable` | `boolean` | `true` | Drag and arrow keys turn the piece. |
| `detail` | `number` | follows the displayed size | Texture detail, 1 being standard. Left out, it matches the size the piece is shown at, so small pieces paint faster and use less GPU memory. |
| `spin` | `number` | `1` | Turntable speed multiplier. |
| `maxFps` | `number` | `60` | Frame-rate cap while moving. |
| `label` | `string` | shape and style | Accessible name. The piece is announced as an image. |
| `className` | `string` | | Applied to the root. |
| `onReady` | `() => void` | | Called when a newly painted design is first on screen. |

A piece sizes itself to its container's width and keeps its own proportions.
To size one by height instead, give it `height` and `width: auto` in your CSS.

```tsx
<div className="shelf">
  {pieces.map((piece) => (
    <Vase key={piece.seed} mode="still" {...piece} />
  ))}
</div>
```

## How it works

- `src/lib/shapes.ts`: each vessel is a lathe profile plus decoration zones
  (foot, base, body, shoulder, neck, collar, rim) and optional handles.
- `src/lib/painter.ts`: paints onto the unrolled wall. Motifs are drawn at
  physical size and mapped through the local radius, so a flower on a narrow
  neck is the same size as one on the belly. Every mark also goes into a small
  fixed-size sketch, and painters look for bare glaze there rather than in the
  texture, which is why a seed paints the same design at any detail.
- `src/lib/ikaros.ts`, `folk.ts`, `greek.ts`: the painting traditions.
- `src/lib/shader.ts`: the vessel is sphere-traced in one fragment shader.
  The shader compiles off the main thread where the browser supports it
  (`KHR_parallel_shader_compile`); a piece appears once its first frame is drawn.

Painting takes roughly 0.1 to 1 second per piece, depending on its size, so
pieces paint one at a time as they approach the viewport. It runs in a Web
Worker on OffscreenCanvas, inlined in the package so no bundler setup is needed,
and the page stays responsive while it works. Where there is no Worker or
OffscreenCanvas, where a content security policy blocks `blob:` workers, or where
the worker cannot blur (Safari's OffscreenCanvas ignores `ctx.filter`) while the
page can, painting falls back to the main thread and logs a warning. If the
browser drops the GPU context, the pieces repaint when it comes back. Without
WebGL2 a piece shows a short message instead.

On the server a piece renders as a sized, labelled placeholder.

## Development

```sh
npm run dev -w keramos             # the showroom demo
npx vitest run packages/keramos    # profile, seed and SSR tests
npm run build -w keramos
```

The seed test paints pieces at two detail levels on a Node canvas and checks
that every placement decision matches. The look of the glaze and the brushwork
still needs a check in a real browser.
