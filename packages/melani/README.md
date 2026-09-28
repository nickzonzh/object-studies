# melani

A tactile whiteboard for React. Physical markers and a felt eraser lie in an
aluminium tray; pick one up and it becomes the cursor, drawing pressure-aware
ink that pools where the nib rests and ghosts where the eraser has been.

μελάνι — Greek for ink.

```sh
npm install melani
```

```tsx
import { Whiteboard } from 'melani'
import 'melani/style.css'

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
| `defaultStrokes` | `readonly Stroke[]` | `[]` | Starting drawing for an uncontrolled board. A saved drawing, when there is one, takes its place. |
| `strokes` | `readonly Stroke[]` | — | Drawing to display. Passing it makes the board controlled: it shows exactly what you pass, and a change you do not accept is not an undo step. Strokes are compared by identity, so keep the ones the board hands you (a copied array is fine). |
| `onStrokesChange` | `(strokes: readonly Stroke[]) => void` | — | Called after every commit: a finished gesture, undo, redo, clear. |
| `persistence` | `false \| { key: string }` | `false` | Off by default; a component should not claim storage unasked. |
| `exportFileName` | `string` | `'melani-board.png'` | |
| `showControls` | `boolean` | `true` | The built-in undo/redo/clear/save bar. |
| `labels` | `Partial<WhiteboardLabels>` | `defaultLabels` | Every user-visible string, including the live-region announcements. |
| `brand` | `string` | `'MELANI'` | Printed on the tools and the board. `''` for unbranded. |
| `portalContainer` | `HTMLElement \| null` | `document.body` | Where the tools in the air are rendered. See below. |
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
board.current?.getStrokes()             // readonly Stroke[], a copy
await board.current?.toBlob('image/png') // painted on the board colour
```

`Marker`, `Stroke`, `Point`, `StrokeTool`, `WhiteboardProps`,
`WhiteboardHandle` and `WhiteboardLabels` are exported as types, alongside
`defaultLabels`, `defaultMarkers`, `BOARD_WIDTH`, `BOARD_HEIGHT` and
`decodeStrokes`.

### Drawings from elsewhere

`strokes` and `defaultStrokes` are checked when they arrive: a malformed stroke
throws an error that names the prop and the stroke, before it can reach the
renderer. To check a drawing from your own server or a file before it gets that
far, pass it through `decodeStrokes(value)`. It returns a clean copy, or throws
for anything malformed or beyond what the board can store (4000 strokes, 40,000
points).

### Tools in the air

A tool that has been picked up follows the pointer in viewport coordinates, so
it is portalled out of the component into its own element at the end of
`document.body`. That keeps it under the pointer inside a transformed, filtered
or clipping ancestor such as an animated dialog. If the board sits in something
that renders above the page, such as a `<dialog>` opened with `showModal()`,
pass that element as `portalContainer`: the tools are rendered in an element of
their own inside it, and it is not otherwise touched. The portal is created
after mount, so the server render has no tools in the air.

## Sizing

The board, its tray and the tools are one object: everything inside scales from
its width, so there is only ever one number to control.

By default it fills the width it is given. To fit a height instead, give it
`--melani-height` — the most vertical space the component may take, controls
included — and it caps its own width to match:

```css
.board {
  --melani-height: min(100dvh - 12rem, 760px);
  --melani-max-width: 1100px;
}
```

## Theming

Set any of these on the component (via `className` or `style`):

| Property | |
| --- | --- |
| `--melani-frame-metal` | Base anodised aluminium |
| `--melani-frame-highlight` | Lit top edge of the extrusion |
| `--melani-frame-shadow` | Its shaded underside |
| `--melani-frame-edge` | Deepest edge, used for the tray channel |
| `--melani-cap-colour` | Moulded corner caps |
| `--melani-board-paper` | Board surface, and the PNG export background |
| `--melani-board-tint` | Cooler far corner of the surface |
| `--melani-control-ink`, `--melani-control-surface` | The controls bar |
| `--melani-radius` | Frame radius |
| `--melani-height`, `--melani-max-width` | See sizing above |

Ink colours are not CSS: they belong to the `markers` prop, because a stroke
keeps the colour it was drawn with.

The frame and tray are lit from the upper left. `--melani-light-x` and
`--melani-light-y` move the specular highlight with the pointer while it is over
the board; set them yourself to pin the light.

## Persistence

`persistence={{ key: 'notes:board' }}` keeps the board in `localStorage` under
that key. It is restored on mount, and saved after every commit.

One key is one drawing. A board that exists under the key is restored as it
was, including an empty one: a board cleared before a reload stays clear, and
`defaultStrokes` only applies when nothing is saved. Changing the key switches
the board to that key's drawing, or to `defaultStrokes` if it has none, and
starts a fresh undo history. Other tabs showing the same key follow the latest
save, with a fresh undo history and a call to `onStrokesChange`. A tab in the
middle of a mark finishes it first, and its own save becomes the latest. A tab
whose last save failed keeps its drawing, since it holds the only copy. Two
boards on the same key in one page overwrite each other; give each its own. A
controlled board shows its `strokes`, never restores or follows other tabs,
though it still saves.

Stored data is untrusted. A document that does not decode cleanly is never
half-restored: the board starts from `defaultStrokes` (or empty), announces
that the saved board could not be opened, and the first new mark replaces it.
When the store cannot keep the board, because it is full or blocked, the board
announces it each time saving starts to fail. These announcements are made in
the component's live region only; there is no visible notice.

## Server rendering

Nothing touches `window`, `document`, `localStorage` or `matchMedia` at module
scope or during render, so the component server-renders as it is — no
client-only wrapper, no dynamic import. Storage is read, the canvas is sized,
the tools' portal is created and the tools are bound in effects. The build
ships a `"use client"` banner for React Server Component frameworks.

## Accessibility

- Every tool is a real `button` with `aria-pressed`, reachable and operable from
  the keyboard; choosing one with the keyboard lifts it out of the tray without
  the flight animation.
- Undo, redo and clear are announced in a polite live region, as are a failed
  save, a saved board that could not be opened and a failed PNG export.
  Individual strokes are not: that would be noise.
- Undo, redo and clear stay focusable when there is nothing to do: they are
  marked `aria-disabled` rather than disabled, so a button that runs out of work
  under the keyboard keeps focus.
- **Drawing itself requires a pointing device** — mouse, pen or touch. The
  canvas carries a description saying so, and there is no keyboard drawing mode.
  Applications that must be operable without a pointer should provide another
  way in and treat the board as an enhancement.
- On coarse pointers the tray buttons themselves grow to at least 44 CSS
  pixels tall, reaching into the space under the board rather than over the
  drawing surface, and the eraser reaches sideways to 44 wide. The marker slots
  are 44 wide on any board wider than about 250px.
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
npm run dev -w melani          # demo at /
npx vitest run packages/melani # pixel, persistence and SSR tests
npm run build -w melani
```

Pixel tests cover stroke continuity, sampling independence, pooling,
translucency, rotated eraser coverage, ghosting, resize/DPR, cache invalidation
and that a stroke painted sample by sample is pixel-identical to its committed
replay, before and after a save and reload. Real touch and stylus hardware
still need a hands-on check.
