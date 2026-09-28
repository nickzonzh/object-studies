# kimolia

A tactile chalkboard for React. Pick up a real-feeling stick of chalk or a felt
duster, draw on slate framed in oak, and put the tool back on the rail.

κιμωλία — Greek for chalk.

```sh
npm install kimolia
```

```tsx
import { Chalkboard } from 'kimolia'
import 'kimolia/style.css'

export function Lesson() {
  return <Chalkboard />
}
```

React 19, ESM only. `react` and `react-dom` are peer dependencies; the shared
board engine [`object-studies-core`](../core) is a dependency.

Nothing is saved anywhere unless you ask for it, no drawing leaves the page, and
there are no network requests, images or fonts: slate, oak and chalk dust are
drawn procedurally at runtime, so the whole package is about 40 KB of JavaScript
and 17 KB of CSS.

## What it does

- Chalk that behaves like chalk: a worn flat tip that changes the weight of a
  line as it turns, density that wanders along a stroke, and patches where the
  stick misses the grain of the slate.
- A duster that lifts chalk rather than deleting it — feathered at its edges,
  smearing dust along the wipe, leaving a haze a little wider than the mark.
  Wipe again and more comes away.
- Slate that has been written on for years: a permanent, very subtle residue.
- Undo, redo, clear and PNG export, with Clear reversible and one undo step per
  gesture.
- Pointer, touch and full keyboard operation.

## Props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `defaultStrokes` | `readonly DrawingStroke[]` | `[]` | Starting drawing for an uncontrolled board. A drawing saved under the `persistence` key, even an empty one, takes its place. |
| `strokes` | `readonly DrawingStroke[]` | — | Controlled drawing. Pair with `onStrokesChange`. |
| `onStrokesChange` | `(strokes: readonly DrawingStroke[]) => void` | — | Called after every committed gesture, undo, redo and clear, and when another tab's save replaces the drawing, with a fresh array. |
| `persistence` | `false \| { key: string }` | `false` | Opt in to keeping the drawing on the device under your own key. |
| `exportFileName` | `string` | `'kimolia-board.png'` | File name for the built-in Save PNG control. |
| `showControls` | `boolean` | `true` | The built-in undo / redo / clear / save bar. |
| `labels` | `ChalkboardLabelOverrides` | English | Every user-visible string. Pass only the ones you change, down to a single chalk colour: `{ chalk: { white: 'Weiße Kreide' } }`. |
| `wear` | `number` | `--kimolia-wear` | 0–1. How much old chalk haze the slate has kept. Overrides the custom property. |
| `portalContainer` | `HTMLElement \| null` | `document.body` | Where the tools in flight are rendered. The board adds its own layer inside it and removes it on unmount. |
| `className`, `style` | | | Applied to the component root, which always carries `kimolia`. |
| `ref` | `Ref<ChalkboardHandle>` | | See below. |

A board is uncontrolled unless `strokes` is set. In controlled mode the board
replays whatever you pass — except the array it just handed you, which it
recognises as its own drawing coming back.

The board starts from `strokes` if set, then from the drawing saved under the
`persistence` key, then from `defaultStrokes`. Strokes passed as props must meet
the same replay limits as stored ones (see Persistence); a drawing that breaks
them throws instead of tying the board up.

```tsx
const [strokes, setStrokes] = useState<readonly DrawingStroke[]>([])

<Chalkboard strokes={strokes} onStrokesChange={setStrokes} />
```

## Ref handle

```ts
type ChalkboardHandle = {
  undo(): void
  redo(): void
  clear(): void
  toBlob(type?: string): Promise<Blob>   // the slate and its marks, without the frame
  getStrokes(): readonly DrawingStroke[]
}
```

```tsx
const board = useRef<ChalkboardHandle>(null)

<Chalkboard ref={board} showControls={false} />
<button onClick={() => board.current?.undo()}>Undo</button>
```

`toBlob` waits for a replay in progress (after a resize, undo or reload) to
finish, so the image is always the whole drawing.

Exported types: `ChalkboardProps`, `ChalkboardHandle`, `ChalkboardLabels`,
`ChalkboardLabelOverrides`, `DrawingStroke`, `ChalkStroke`, `DusterStroke`,
`ChalkPoint`, `ChalkColor`, plus `defaultLabels` and `decodeStrokes`.

## Persistence

Off by default: a component should not write to somebody's `localStorage`
because it was rendered. Opt in with a key:

```tsx
<Chalkboard persistence={{ key: 'lesson:board:v1' }} />
```

One key holds one drawing. Boards in several tabs on the same key share it: when
one tab saves, the others replace their drawing with it (their undo history
starts again), and a gesture in progress finishes first. The latest save wins,
except that a tab whose own drawing could not be saved keeps it rather than
losing it to another tab's. Two boards on the same page should not share a key.

Stored drawings are versioned and treated as untrusted. A document that does not
decode cleanly is reported to the user and left alone rather than partially
restored, and oversized drawings (4000 strokes, 40 000 points or 2 MB) are
refused before they replace a good one. So are drawings that would take too long
to replay: tool sizes the board never produces, a slate smaller than 64 px, or
more than four million chalk and felt stamps in all. Failures — blocked storage,
a full quota, an unreadable document — are the only things announced to screen
readers; a successful autosave is not news.

For your own storage, keep `onStrokesChange` and validate on the way back in
with the exported `decodeStrokes`, which takes the array and returns a clean
copy, or throws for anything invalid:

```ts
const strokes = decodeStrokes(JSON.parse(saved))
```

## Theming

Every colour is a custom property. The defaults sit on the document root with
no specificity, so setting one on any ancestor, a `className` or `style`
rethemes the object. The chalk colours also drive the marks on the canvas.

| Property | Default | |
| --- | --- | --- |
| `--kimolia-frame-width` | `clamp(19px, 2.9cqi, 30px)` | Oak frame thickness. |
| `--kimolia-radius` | `2px` | Outer corner radius. |
| `--kimolia-timber` | `#7c5a3b` | Oak body. |
| `--kimolia-timber-light` | `#a7875c` | Lit edges of the timber. |
| `--kimolia-timber-dark` | `#33251b` | Shaded edges of the timber. |
| `--kimolia-slate` | `#26302b` | Slate body. |
| `--kimolia-slate-light` / `--kimolia-slate-dark` | `#28312d` / `#222b27` | Ends of the slate's gradient. |
| `--kimolia-chalk-white` | `#f0ead8` | White chalk, stick and marks. |
| `--kimolia-chalk-yellow` | `#e2d288` | |
| `--kimolia-chalk-blue` | `#9cbfcd` | |
| `--kimolia-chalk-pink` | `#dfabaf` | |
| `--kimolia-wear` | `0.35` | Residual chalk haze, on screen and in the PNG; the `wear` prop overrides it. |
| `--kimolia-text` / `--kimolia-muted` / `--kimolia-focus` | `#515a4a` / `#727469` / `#65725b` | Caption, note and focus ring. |
| `--kimolia-light-x` / `--kimolia-light-y` | `24%` / `0%` | Where the key light sits. |

```css
.night-room {
  --kimolia-timber: #4a3a2c;
  --kimolia-slate: #1d2422;
  --kimolia-chalk-white: #e9f0ef;
}
```

Chalk colours are read once, when the board mounts. Layout follows the width of
the component's own container, not the viewport: a board in a narrow column
becomes squarer instead of shrinking into a strip, so it stays usable inside a
sidebar.

## Server rendering

Safe to render on a server: nothing touches `window`, `document`,
`localStorage`, `matchMedia` or `devicePixelRatio` during render. The tools in
flight are portalled into an element created in an effect (`portalContainer`
chooses where it goes), and the materials are drawn on the client. There is no
hydration mismatch — the markup is the board and its controls.

## Accessibility

- The rail is a group of toggle buttons with `aria-pressed`. The slate is a
  focusable `application`, so screen readers in browse mode hand it the arrow
  keys, and it is described by the full instructions.
- Controls that cannot act right now are `aria-disabled` rather than disabled,
  so pressing Undo to the last step or Clear keeps keyboard focus on the button
  and the shortcuts keep working.
- Keyboard: choose chalk with Enter or Space and focus moves to the slate. Arrow
  keys move the tool (Shift for larger steps); hold Space or Enter while moving
  to draw or erase. Escape puts the tool back and returns focus to its slot.
  Control/Command Z undoes, Shift Z or Control Y redoes, while the board or its
  controls have focus.
- Touch activates on a completed tap rather than the compatibility click that
  follows it, so a tool can be picked up immediately after a drawing gesture.
  All controls are at least 44×44 px.
- Long replays set `aria-busy` on the slate while they run.
- `prefers-reduced-motion` places tools directly instead of animating them;
  `forced-colors` outlines the board, its recess and the tools.
- Drawing needs a pointer or the keyboard steps above — the marks themselves are
  a raster, and are not exposed to assistive technology.

## Browser support

Modern evergreen browsers: Chrome/Edge 111+, Safari 16.4+, Firefox 128+. The
board uses Canvas 2D, Pointer Events, the Web Animations API, CSS container
queries, `color-mix()` and `ResizeObserver`.

## Development

```sh
npm run dev -w kimolia        # demo at http://localhost:5173
npm run build -w kimolia      # library build into dist/
npx vitest run packages/kimolia
```

`src/` is the library, `demo/` is the showcase (not published), `test/` holds
the unit tests, and `docs/K1–K6-review.md` is the review trail this object was
built against.

MIT.
