# object-studies-core

Framework-agnostic engine shared by the Object Studies boards
([kimolia](../kimolia), [melani](../melani)): the parts of a physical drawing
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
grain on every device.

### Pose geometry

```ts
type Point = { x: number; y: number }
type Rect = { left: number; top: number; width: number; height: number }
type Pose = Point & { angle: number; scale?: number }
type PoseWeights = { position: number; rotation: number }

clampPoint(point: Point, rect: Rect): Point
advancePose(current: Pose, target: Pose, elapsed: number, weights: PoseWeights, snap?: boolean): Pose
settled(a: Pose, b: Pose): boolean
```

`weights` are per-frame retention factors at 60Hz — the share of the remaining
distance the tool still has to travel after one frame; smaller follows the
pointer harder (chalk `{ position: 0.1, rotation: 0.76 }`, a heavy duster
`{ position: 0.48, rotation: 0.82 }`). Easing is time-normalised, so 60Hz and
120Hz produce the same motion. `snap` puts the position exactly under the
pointer while rotation keeps its weight — use it while a tool is in contact.
`scale` is interpolated with the rotation weight when both poses carry one.

### Cooperative scheduling

```ts
type CooperativeClock = { now: () => number; schedule: (callback: () => void) => () => void }
createCooperativeTask(onBusy: (busy: boolean) => void, clock?: CooperativeClock, budgetMs?: number): CooperativeTask
// { isBusy(): boolean; cancel(): void; run(iterator: Iterator<unknown>): void }
```

Short jobs stay synchronous (no busy flash). Longer ones yield every `budgetMs`
or 64 units, whichever comes first, so input and paint keep running. `run`
replaces any job in flight; a callback that escaped cancellation cannot resume a
replaced job. `clock` defaults to `performance.now` + `setTimeout`.

### Gesture history

```ts
createGestureHistory<Stroke>(initial?: readonly Stroke[]): GestureHistory<Stroke>
// { strokes(); state(); commit(gesture: Stroke[]); clear(); undo(); redo() }
type HistoryState = { hasMarks: boolean; canUndo: boolean; canRedo: boolean }
```

One action per gesture, even when clipping splits it into several strokes.
`clear` is reversible and retains the previous records rather than copying point
arrays. `initial` is a base drawing: restoring a saved board does not give the
session a redo branch. Strokes are compared by identity — treat them as
immutable once committed.

### Replay cache

```ts
createReplayCache<Stroke>(canvas: HTMLCanvasElement): ReplayCache<Stroke>
// { capture(strokes, checkpoint?); restore(strokes): number; clear() }
CHECKPOINT_INTERVAL: 24
```

Keeps a few completed raster prefixes (max 4 images / 32 MB) so undo and resize
do not replay from zero. `restore` paints the longest prefix whose strokes are
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
  encode: (value: T) => Record<string, unknown>      // the version is added for you
  getStorage?: () => StorageLike | null              // default: localStorage where it exists
  maxCharacters?: number                             // default 2_000_000
  withinLimits?: (value: T) => boolean               // cheap pre-serialisation check
}): Persistence<T>
// { load(): { value: T | null; status }; save(value): status; remove(): void }

type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'unavailable' | 'invalid' | 'full'
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
```

Stored data is untrusted: a document that does not decode cleanly is reported
`invalid` and nothing is restored or rewritten. A missing, blocked or throwing
store is `unavailable`; an exceeded quota (including Safari's legacy code 22) is
`full`, as is a value rejected by `withinLimits` or longer than `maxCharacters`.
`getStorage` is called per operation and may return `null`, which keeps the API
safe to construct during server rendering.

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
// { ready(id, immediate?); arrive(id, pose); move(id, pose, pressed?, immediate?);
//   dock(id, immediate?); dockAll(immediate?); destroy() }
```

Moves a physical tool between its tray and the pointer. `root` is translated in
viewport coordinates and `rotation` carries `rotate()` (plus `scale()` when the
pose has one), so a cast shadow on `root` stays aligned to the scene light.
`parked` is the tray copy, hidden while the tool is in the air.

Pickup, `arrive` and put-back are Web Animations and can be retargeted
mid-flight without restarting their clock; following a pointer is rAF inertia
that stops as soon as the pose settles. `prefers-reduced-motion` places tools
directly and finishes anything in flight.

State is published on `root` for CSS: `hidden` while docked, `data-state` of
`ready` | `held` | `contact`, and `data-direct` when the move was immediate (so
lift and squash transitions can be suppressed). Create it in the browser after
the elements are in the document, and call `destroy()` on teardown.

### Tap activation

```ts
createTapActivation(
  onActivate: (source: 'pointer' | 'touch' | 'keyboard', target: HTMLElement) => void,
  options?: { slop?: number; enabled?: (target: HTMLElement) => boolean },
): { pointerDown; pointerUp; pointerCancel; click }
```

Activates a control on a completed touch instead of the compatibility click that
follows it — browsers suppress that click right after a captured drawing
gesture, which would otherwise swallow the next tap on a tool. Wire all four
handlers to the control (or to one delegating group of them); the event types
are structural, so React's synthetic events fit as they are.
