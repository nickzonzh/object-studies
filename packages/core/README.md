# object-studies-core

Framework-agnostic engine shared by the Object Studies packages
([kimolia](../kimolia), [melani](../melani), [kollaz](../kollaz),
[keramos](../keramos)): the parts of a physical drawing
surface that have nothing to do with chalk or ink — seeded randomness, tool
motion, gesture history, replay caching, cooperative scheduling and validated
persistence.

No React, no bundler, no CSS. Pure functions plus a few DOM-only helpers that
must be created in the browser (never at module scope, never during render).

```sh
npm install object-studies-core
```

```ts
import { createGestureHistory, seededRandom } from 'object-studies-core'
```

MIT. Requires an ES2022 runtime; ships ESM and type declarations only.

## API

### Seeded randomness

```ts
seededRandom(seed: number): () => number
```

mulberry32. Stable across engines, so a stored stroke seed replays the same
grain on every device. The sequence a seed produces is part of the public
contract and never changes within a major version.

### Pose geometry

```ts
type Point = { x: number; y: number }
type Rect = { left: number; top: number; width: number; height: number }
type Pose = Point & { angle: number; scale?: number }
type PoseWeights = { position: number; rotation: number }

clampPoint(point: Point, rect: Rect): Point
```

`PoseWeights` (used by tool motion) are per-frame retention factors at 60Hz —
the share of the remaining distance the tool still has to travel after one
frame; smaller follows the pointer harder (chalk `{ position: 0.1, rotation: 0.76 }`,
a heavy duster `{ position: 0.48, rotation: 0.82 }`). Easing is time-normalised,
so 60Hz and 120Hz produce the same motion. `scale` is interpolated with the
rotation weight when both poses carry one.

### Cooperative scheduling

```ts
type CooperativeClock = { now: () => number; schedule: (callback: () => void) => () => void }
createCooperativeTask(onBusy: (busy: boolean) => void, clock?: CooperativeClock, budgetMs?: number): CooperativeTask
// { isBusy(): boolean; cancel(): void; run(iterator: Iterator<unknown>): void }
```

Short jobs stay synchronous (no busy flash). Longer ones yield every `budgetMs`
or 64 units, whichever comes first, so input and paint keep running. `run`
replaces any job in flight; a callback that escaped cancellation cannot resume a
replaced job. If the iterator throws, the task stops, reports not busy and
rethrows. `clock` defaults to `performance.now` + `setTimeout`.

### Gesture history

```ts
createGestureHistory<Stroke>(initial?: readonly Stroke[]): GestureHistory<Stroke>
// { strokes(): readonly Stroke[]; state(); commit(gesture: readonly Stroke[]); clear(); undo(); redo() }
type HistoryState = { hasMarks: boolean; canUndo: boolean; canRedo: boolean }
```

One action per gesture, even when clipping splits it into several strokes.
`clear` is reversible and retains the previous records rather than copying point
arrays. `initial` is a base drawing: restoring a saved board does not give the
session a redo branch. Strokes are compared by identity — treat them as
immutable once committed. `commit` copies the gesture array; `strokes()` is the
history's own array, which later changes will alter, so copy it to keep a
snapshot.

### Replay cache

```ts
createReplayCache<Stroke>(canvas: HTMLCanvasElement): ReplayCache<Stroke>
// { capture(strokes, checkpoint?); restore(strokes): number; clear() }
CHECKPOINT_INTERVAL: 24
```

Keeps a few completed raster prefixes (max 4 images / 32 MB) so undo does not
replay from zero. An image is only restored onto a canvas of the size it was
captured at; after a resize, older images are dropped and the drawing replays
in full. A zero-sized canvas is never captured. `restore` paints the longest prefix whose strokes are
identical to the head of `strokes` and returns its length, so the caller replays
only the remainder. Identity matching means a new branch after Undo or Clear can
never reuse an unrelated image. Pass `checkpoint: true` every
`CHECKPOINT_INTERVAL` strokes to keep an older prefix alive under memory
pressure.

### Validated persistence

```ts
createPersistence<T>(options: {
  key: string
  version: number
  decode: (document: Record<string, unknown>) => T   // throws for anything untrusted
  encode: (value: T) => Record<string, unknown>      // the version is stamped over it
  migrate?: (document: Record<string, unknown>, fromVersion: number) => Record<string, unknown> | null
  getStorage?: () => StorageLike | null              // default: localStorage where it exists
  maxCharacters?: number                             // default 2_000_000
  withinLimits?: (value: T) => boolean               // cheap pre-serialisation check
}): Persistence<T>
// { load(): { value: T | null; status: LoadStatus }; save(value): SaveStatus; remove(): void }

type LoadStatus = 'idle' | 'saved' | 'unavailable' | 'invalid'
type SaveStatus = 'saved' | 'unavailable' | 'full'
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
```

Loading reports `idle` when nothing is stored and `saved` when the document was
restored. Stored data is untrusted: a document that does not decode cleanly is
reported `invalid` and nothing is restored or rewritten. A missing, blocked or throwing
store is `unavailable`; an exceeded quota (including Safari's legacy code 22) is
`full`, as is a value rejected by `withinLimits` or longer than `maxCharacters`.
`getStorage` is called per operation and may return `null`, which keeps the API
safe to construct during server rendering.

A document stamped with another `version` is `invalid` unless you pass
`migrate`. It receives the stored document and its version, and returns the
document in the current shape, which is then decoded as usual; return `null`
(or throw) for a version it cannot upgrade. The upgraded document is written
back on the next save, not during `load`.

`save` throws if the encoded document contains `NaN` or `Infinity`. JSON would
store them as `null`, the decoder would reject the document, and the board would
be lost on the next load, so this is treated as a bug in the caller's data.

Decoding helpers for writing `decode`:

```ts
isRecord(value: unknown): value is Record<string, unknown>
isNumberWithin(value: unknown, min: number, max: number): value is number
isIntegerWithin(value: unknown, min: number, max: number): value is number
```

### Tool motion

```ts
createToolMotion<Id extends string>(config: {
  tools: readonly Id[]
  elements: (id: Id) => { root: HTMLElement; rotation: HTMLElement; parked?: HTMLElement }
  restPose: (id: Id, elements) => Pose
  readyPose?: (id: Id, rest: Pose) => Pose
  weights?: (id: Id) => PoseWeights
  duration?: (id: Id, move: 'pickup' | 'dock') => number   // default 160 / 190 ms
}): ToolMotion<Id>
// { ready(id, { immediate? }?); arrive(id, pose); move(id, pose, { pressed?, immediate? }?);
//   dock(id, { immediate? }?); dockAll({ immediate? }?); destroy() }
```

Moves a physical tool between its tray and the pointer. `root` is translated in
viewport coordinates and `rotation` carries `rotate()` (plus `scale()` when the
pose has one), so a cast shadow on `root` stays aligned to the scene light.
`parked` is the tray copy, hidden while the tool is in the air.

Pickup, `arrive` and put-back are Web Animations and can be retargeted
mid-flight without restarting their clock; following a pointer is rAF inertia
that stops as soon as the pose settles. `pressed` puts the position exactly
under the pointer while rotation keeps its weight — use it while a tool is in
contact. A `move` or `arrive` during a put-back flies the tool out again from
wherever it has got to. `immediate` places the tool without animating, and
`prefers-reduced-motion` does the same for every move and finishes anything in
flight.

State is published on `root` for CSS: `hidden` while docked, `data-state` of
`ready` | `held` | `contact`, and `data-direct` when the move was immediate (so
lift and squash transitions can be suppressed). Create it in the browser after
the elements are in the document, and call `destroy()` on teardown.

### Tap activation

```ts
createTapActivation(options?: { slop?: number }): TapActivation   // slop default 12 px
// { pointerDown(event): void; pointerUp(event): TapResult | null;
//   pointerCancel(event): void; click(event): TapResult | null }
type TapResult = { source: 'pointer' | 'touch' | 'keyboard'; target: HTMLElement }
```

Decides when a control has been activated, without owning what that means. A
touch activates on the completed press (released on the control, within `slop`
pixels of where it started) instead of the compatibility click that follows
it — browsers suppress that click right after a captured drawing gesture, which
would otherwise swallow the next tap on a tool. Mouse, pen and keyboard activate
on `click`. Wire all four handlers to the control (or to one delegating group
of them) and act on the returned `TapResult`; `null` is not an activation.
`target` is the control the gesture started on. The event types are
structural, so React's synthetic events fit as they are.
