# Aspro

A tactile whiteboard for React. Physical markers and a felt eraser lie in an
aluminium tray; pick one up and it becomes the cursor, drawing pressure-aware
ink that pools where the nib rests and ghosts where the eraser has been.

```sh
npm install aspro
```

```tsx
import { Whiteboard } from 'aspro'
import 'aspro/style.css'

export function Board() {
  return <Whiteboard />
}
```

The stylesheet is a separate import so it can be bundled, ordered or overridden
like any other CSS. Every rule is scoped to the component's own classes.

MIT. React 19, no other runtime dependency beyond
[`object-studies-core`](../core).

## What you get

- A DOM/CSS whiteboard — anodised frame, moulded corner caps, a tray trough
  whose front lip stands in front of the tools lying in it.
- Four markers and an eraser that lift out of the tray, follow the pointer with
  their own weight, and go back when you put them down.
- Ink on a canvas of its own: nib pooling, fibre streaks, translucency that
  follows the pigment, and an eraser that leaves a faint ghost until a second
  pass lifts it.
- Undo, redo, clear, PNG export, optional autosave, mouse/pen/touch input.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `markers` | `readonly Marker[]` | four markers | Tray contents. `{ id, label, color, ink }` — `color` is the plastic, `ink` is what it draws with, `label` is the button's accessible name. |
| `defaultStrokes` | `readonly Stroke[]` | `[]` | Starting drawing for an uncontrolled board. |
| `strokes` | `readonly Stroke[]` | — | Drawing to display. Passing it makes the board controlled: it shows exactly what you pass, and a drawing you do not accept is not an undo step. |
| `onStrokesChange` | `(strokes: readonly Stroke[]) => void` | — | Called after every commit: a finished gesture, undo, redo, clear. |
| `persistence` | `false \| { key: string }` | `false` | Off by default; a component should not claim storage unasked. |
| `exportFileName` | `string` | `'aspro-board.png'` | |
| `showControls` | `boolean` | `true` | The built-in undo/redo/clear/save bar. |
| `labels` | `Partial<WhiteboardLabels>` | English | Every user-visible string, including the live-region announcements. |
| `brand` | `string` | `'ASPRO'` | Printed on the tools and the board. `''` for unbranded. |
| `className`, `style`, `ref` | | | Applied to the component root. |

```tsx
<Whiteboard
  markers={[{ id: 'ink', label: 'Blue marker', color: '#1f5f9c', ink: '#1768ad' }]}
  persistence={{ key: 'notes:board' }}
  labels={{ clear: 'Wipe', cleared: 'Board wiped.' }}
  brand=""
/>
```

### Ref handle

```tsx
const board = useRef<WhiteboardHandle>(null)

board.current?.undo()
board.current?.redo()
board.current?.clear()
board.current?.getStrokes()             // readonly Stroke[]
await board.current?.toBlob('image/png') // painted on the board colour
```

`Marker`, `Stroke`, `Point`, `StrokeTool`, `ToolId`, `WhiteboardProps`,
`WhiteboardHandle` and `WhiteboardLabels` are all exported.

## Sizing

The board, its tray and the tools are one object: everything inside scales from
its width, so there is only ever one number to control.

By default it fills the width it is given. To fit a height instead, give it
`--aspro-height` — the most vertical space the component may take, controls
included — and it caps its own width to match:

```css
.board {
  --aspro-height: min(100dvh - 12rem, 760px);
  --aspro-max-width: 1100px;
}
```

## Theming

Set any of these on the component (via `className` or `style`):

| Property | |
| --- | --- |
| `--aspro-frame-metal` | Base anodised aluminium |
| `--aspro-frame-highlight` | Lit top edge of the extrusion |
| `--aspro-frame-shadow` | Its shaded underside |
| `--aspro-frame-edge` | Deepest edge, used for the tray channel |
| `--aspro-cap-colour` | Moulded corner caps |
| `--aspro-board-paper` | Board surface, and the PNG export background |
| `--aspro-board-tint` | Cooler far corner of the surface |
| `--aspro-control-ink`, `--aspro-control-surface` | The controls bar |
| `--aspro-radius` | Frame radius |
| `--aspro-height`, `--aspro-max-width` | See sizing above |

Ink colours are not CSS: they belong to the `markers` prop, because a stroke
keeps the colour it was drawn with.

The frame and tray are lit from the upper left. `--aspro-light-x` and
`--aspro-light-y` move the specular highlight with the pointer while it is over
the board; set them yourself to pin the light.

## Persistence

`persistence={{ key: 'aspro:whiteboard:v2' }}` restores the board on mount and
writes after every commit. Stored data is untrusted: a document that does not
decode cleanly is left where it is and the board starts empty rather than
half-restored, and a board too large for the store is reported rather than
silently dropped (the component announces it once in its live region).

If the key ends in `:v2`, a version 1 document under the matching `:v1` key is
imported once. Version 1 stored display pixels without recording the size it was
drawn at, so it is replayed on the original desktop-sized board: a drawing made
on a small viewport cannot have its scale reconstructed exactly. The old
document is never deleted.

## Server rendering

Nothing touches `window`, `document`, `localStorage` or `matchMedia` at module
scope or during render, so the component server-renders as it is — no
client-only wrapper, no dynamic import. Storage is read, the canvas is sized and
the tools are bound in effects. The build ships a `"use client"` banner for
React Server Component frameworks.

## Accessibility

- Every tool is a real `button` with `aria-pressed`, reachable and operable from
  the keyboard; choosing one with the keyboard lifts it out of the tray without
  the flight animation.
- Undo, redo, clear and a failed save are announced in a polite live region.
  Individual strokes are not: that would be noise.
- **Drawing itself requires a pointing device** — mouse, pen or touch. The
  canvas carries a description saying so, and there is no keyboard drawing mode.
  Applications that must be operable without a pointer should provide another
  way in and treat the board as an enhancement.
- Touch targets are at least 44×44 CSS pixels on coarse pointers: the tray
  slots reach into the space under the board rather than over the drawing
  surface.
- `prefers-reduced-motion: reduce` places the tools directly instead of flying
  them, and the rule is scoped to the component — it will not disable motion in
  the host application.

## Browser support

Evergreen browsers: Chrome/Edge 111+, Safari 16.4+, Firefox 113+. The materials
use container queries and `color-mix()`; input uses Pointer Events and the Web
Animations API.

## How it works

The physical board is regular DOM and CSS. The ink is an independent canvas.
That separation is deliberate: the object can evolve without touching the stroke
engine.

Drawing happens in a fixed 1140 × 707 board space, displayed at the same aspect
ratio at every size, so saved ink, pressure and eraser footprints scale together
and replay identically on any display.

- `src/lib/strokes.ts` — ink. Coverage for one stroke is built opaque in a
  scratch layer and composited once, so samples inside a stroke cannot stack
  into dark seams, while a *separate* stroke still builds density where it
  crosses. Texture is a function of board position, never of sampling: the
  density wash, fibre streaks and edge variation are identical whether a line
  arrived as two samples or two hundred. Committed ink lives in its own layer
  and appending a stroke paints only that stroke; a live stroke repaints only
  the box its newest samples touched, so a long scribble costs the same per
  frame as a short one. Device pixel ratio is capped at 2.
- `src/hooks/useBoard.ts` — interaction. Pointer capture, coalesced samples, one
  layout read per event, and the nib position and its fresh ink committed in the
  same animation frame.
- `src/lib/tools.ts` — the geometry both CSS and the motion layer use, published
  as custom properties so the nib cannot drift from the pointer.
- [`object-studies-core`](../core) — gesture history, validated persistence,
  tool motion and tap activation, shared with the other boards in the series.

## Development

```sh
npm install
npm run dev -w aspro          # demo at /
npx vitest run packages/aspro # pixel, persistence and SSR tests
npm run build -w aspro
```

Pixel tests cover stroke continuity, sampling independence, pooling,
translucency, rotated eraser coverage, ghosting, resize/DPR, cache invalidation
and that a stroke painted sample by sample is pixel-identical to its committed
replay. Real touch and stylus hardware still need a hands-on check.
