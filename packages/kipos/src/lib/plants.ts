import { seededRandom } from 'object-studies-core'
import type { CropId } from './garden.js'

/**
 * Each plant is drawn from stalks and parts laid out around its root, in
 * garden units (one unit is a thousandth of a bed's width). `x` runs right
 * from the root, `y` up from the soil.
 *
 * A stalk is a stem, vine or flower stalk: a smooth curve through a few
 * points, cut into equal segments that hang off one another, so a wilting
 * plant bends along its whole length and everything on it goes with it.
 *
 * A part is a leaf, flower, fruit, cane and so on. A part on a stalk sits at a
 * distance `along` it, offset by (x, y) in the stalk's own direction, and
 * turns with it; other parts stand at (x, y) from the root. A part's anchor
 * point, a fraction of its own box from the top left, sits at that spot and is
 * also its pivot, so a leaf turns and droops about where it joins the stem. A
 * part shows once the plant's progress reaches `at`, and never before its
 * stalk has grown that far: a leaf on a stalk unfurls as the tip reaches it.
 */
export type PartKind =
  | 'cane'
  | 'tie'
  | 'twine'
  | 'truss'
  | 'cotyledon'
  | 'leaf'
  | 'vine-leaf'
  | 'melon-leaf'
  | 'basil-leaf'
  | 'round-leaf'
  | 'flower'
  | 'tomato'
  | 'cucumber'
  | 'melon'
  | 'vine'
  | 'bloom'

export type Part = {
  kind: PartKind
  x: number
  y: number
  w: number
  h: number
  /** Where (x, y) falls in the part's box, and its pivot: [0, 0] top left, [1, 1] bottom right. */
  anchor: [number, number]
  /** Resting rotation, degrees: from upright for a free part, from its stalk's direction for one on a stalk. */
  r: number
  /** Which way a leaf droops when the plant wilts: -1 left, 1 right, 0 not at all. Also picks a leaf's facing. */
  side: -1 | 0 | 1
  /** Progress at which the part appears. */
  at: number
  /** Progress at which a fruit reaches full size and colour. */
  ripeAt?: number
  /** A trailing vine unrolls with growth instead of popping in. */
  grows?: boolean
  /** Progress over which a growing part unrolls from nothing to full length. */
  span?: number
  /** Which drawing of several to use. */
  variant: number
  /** Drawn in front of lower values. */
  z?: number
  /** The stalk the part grows on, by index, and how far up it. */
  stalk?: number
  along?: number
}

export type StalkKind = 'stem' | 'vine' | 'stalk'

export type Stalk = {
  kind: StalkKind
  /** Where it rises from, relative to the root. */
  origin: [number, number]
  /** The curve it follows, from its origin. The first point is [0, 0]. */
  points: [number, number][]
  /** Width at the foot; it narrows toward the tip. */
  width: number
  /** Progress over which it grows from its foot to its tip. */
  from: number
  to: number
  /** Which way it slumps when the plant wilts, and how far: degrees at the tip. */
  side: -1 | 1
  wilt: number
}

/** A stalk cut into equal straight segments. */
export type Segments = {
  /** Each segment's direction, degrees clockwise from straight up. */
  angles: number[]
  length: number
  total: number
}

export type PlantDrawing = {
  stalks: Stalk[]
  segments: Segments[]
  /** Free parts first, then parts on stalks; each group back to front. */
  parts: Part[]
}

type PartInput = Omit<Part, 'side' | 'r' | 'anchor' | 'variant'> &
  Partial<Pick<Part, 'side' | 'r' | 'anchor' | 'variant'>>

const part = (p: PartInput): Part => ({ side: 0, r: 0, anchor: [0.5, 1], variant: 0, ...p })

const SEGMENT = 22
const deg = (radians: number) => (radians * 180) / Math.PI

/** Points along a Catmull-Rom curve through the stalk's points, with the distance to each. */
function trace(points: [number, number][]) {
  const samples: { x: number; y: number; s: number }[] = [{ x: points[0][0], y: points[0][1], s: 0 }]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)]
    for (let k = 1; k <= 16; k++) {
      const t = k / 16, t2 = t * t, t3 = t2 * t
      const at = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
      const x = at(p0[0], p1[0], p2[0], p3[0])
      const y = at(p0[1], p1[1], p2[1], p3[1])
      const last = samples[samples.length - 1]
      samples.push({ x, y, s: last.s + Math.hypot(x - last.x, y - last.y) })
    }
  }
  return samples
}

/** The stalk cut into segments of about SEGMENT units, each following the curve. */
export function segmentsOf(stalk: Stalk): Segments {
  const samples = trace(stalk.points)
  const total = samples[samples.length - 1].s
  const count = Math.max(2, Math.round(total / SEGMENT))
  const length = total / count
  const pointAt = (s: number) => {
    const i = samples.findIndex((p) => p.s >= s)
    if (i <= 0) return samples[i === 0 ? 0 : samples.length - 1]
    const a = samples[i - 1], b = samples[i]
    const f = (s - a.s) / Math.max(1e-6, b.s - a.s)
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, s }
  }
  const angles = Array.from({ length: count }, (_, i) => {
    const a = pointAt(i * length), b = pointAt((i + 1) * length)
    return deg(Math.atan2(b.x - a.x, b.y - a.y))
  })
  return { angles, length, total }
}

/** How far along the stalk it first reaches height y above its origin. */
function alongAt(stalk: Stalk, y: number) {
  const samples = trace(stalk.points)
  return (samples.find((p) => p.y >= y) ?? samples[samples.length - 1]).s
}

/** The progress at which a stalk has grown as far as `along`. */
export const arrival = (stalk: Stalk, segments: Segments, along: number) =>
  stalk.from + (stalk.to - stalk.from) * Math.min(1, along / segments.total)

/** The direction of the stalk at `along`, so a part given an upright angle can be set against it. */
function directionAt(stalk: Stalk, along: number) {
  const segments = segmentsOf(stalk)
  return segments.angles[Math.min(segments.angles.length - 1, Math.floor(along / segments.length))]
}

/** A part placed on a stalk with an angle measured from upright. */
function onStalk(stalks: Stalk[], index: number, along: number, p: PartInput): Part {
  return part({ ...p, stalk: index, along, r: (p.r ?? 0) - directionAt(stalks[index], along) })
}

/**
 * A fruit or flower hanging off a stalk on its own little stem. The part's
 * anchor sits at (dx, dy) from the stalk; the truss runs from the stalk to it.
 */
function hanging(stalks: Stalk[], index: number, along: number, dx: number, dy: number, p: PartInput): Part[] {
  const direction = directionAt(stalks[index], along)
  const length = Math.hypot(dx, dy)
  return [
    part({ kind: 'truss', x: 0, y: 0, w: 1.8, h: length + 1, r: deg(Math.atan2(dx, dy)), at: p.at, stalk: index, along, z: (p.z ?? 0) - 0.5 }),
    part({ ...p, x: dx, y: dy, stalk: index, along, r: (p.r ?? 0) - direction }),
  ]
}

// Where a leaf's stalk meets its blade, as a fraction of the sprite, for each facing.
const TOMATO_LEAF_BASE: [number, number] = [0.05, 0.53]
const BASIL_LEAF_BASE: [number, number] = [0.06, 0.52]
const facing = (base: [number, number], side: number): [number, number] => (side < 0 ? [1 - base[0], base[1]] : base)

// Cotyledons: the first pair of seed leaves every plant shows.
const seedLeaves = (y = 4): Part[] => [
  part({ kind: 'cotyledon', x: -2, y, w: 26, h: 12, anchor: [0.95, 0.5], r: 18, side: -1, at: 0.07 }),
  part({ kind: 'cotyledon', x: 2, y, w: 26, h: 12, anchor: [0.05, 0.5], r: -18, side: 1, at: 0.07 }),
]

type Drawn = { stalks: Stalk[]; parts: Part[] }

function tomato(random: () => number): Drawn {
  const jitter = (n: number) => (random() - 0.5) * n
  // Yiayia's canes go in on sowing day: two stakes, leaning in a little.
  const parts: Part[] = [
    part({ kind: 'cane', x: -40, y: -6, w: 9, h: 330, r: -3, at: 0 }),
    part({ kind: 'cane', x: 38, y: -6, w: 9, h: 338, r: 4, at: 0 }),
    ...seedLeaves(),
  ]
  // The main stem wanders a little as it climbs, and leans the way it was planted.
  const lean = jitter(0.08)
  const spine: [number, number][] = [[0, 0], [3, 50], [-4, 104], [4, 158], [-3, 212], [3, 258], [-1, 296]].map(
    ([x, y]) => [x + y * lean, y] as [number, number],
  )
  const stalks: Stalk[] = [
    { kind: 'stem', origin: [0, 0], points: spine, width: 6.5, from: 0.07, to: 0.78, side: random() < 0.5 ? -1 : 1, wilt: 34 },
  ]
  for (let i = 0; i < 13; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const y = 24 + i * 21 + jitter(8)
    const w = 118 - i * 4.2
    parts.push(
      onStalk(stalks, 0, alongAt(stalks[0], y), {
        kind: 'leaf',
        x: side * 1.5,
        y: 0,
        w,
        h: w * 0.53,
        anchor: facing(TOMATO_LEAF_BASE, side),
        r: side * (-14 + jitter(22)) + (i > 9 ? side * -14 : 0),
        side,
        at: 0.07,
        variant: Math.floor(random() * 3),
      }),
    )
  }
  for (const [i, y] of [112, 196, 280].entries()) {
    parts.push(part({ kind: 'tie', x: -40 - y * 0.052, y, w: 18, h: 10, anchor: [0.5, 0.5], r: -8, at: 0.28 + i * 0.12, z: 1 }))
    parts.push(part({ kind: 'tie', x: 38 + y * 0.07, y: y - 8, w: 18, h: 10, anchor: [0.5, 0.5], r: 10, at: 0.32 + i * 0.12, variant: 1 - (i % 2), z: 1 }))
  }
  const flowers: [number, number][] = [[-22, 150], [24, 198], [-16, 238], [20, 270], [-26, 210]]
  for (const [x, y] of flowers)
    parts.push(...hanging(stalks, 0, alongAt(stalks[0], y), x * 0.8, -6, { kind: 'flower', x: 0, y: 0, w: 16, h: 16, anchor: [0.5, 0], r: jitter(40), at: 0.5, z: 1 }))
  // Trusses of fruit hanging under the leaves, lowest ripening first.
  const fruit: [number, number, number][] = [
    [-16, 104, 34], [8, 96, 30], [20, 142, 32], [-24, 178, 30], [-6, 170, 26], [18, 220, 30], [-12, 252, 26], [24, 262, 22],
  ]
  fruit.forEach(([x, y, size], i) => {
    parts.push(
      ...hanging(stalks, 0, alongAt(stalks[0], y + 10), x + jitter(4), -10 + jitter(4), {
        kind: 'tomato',
        x: 0,
        y: 0,
        w: size,
        h: size * 0.95,
        anchor: [0.5, 0.06],
        r: jitter(16),
        at: 0.64 + i * 0.01,
        ripeAt: 0.84 + (i / fruit.length) * 0.14 + random() * 0.03,
        z: 2,
      }),
    )
  })
  return { stalks, parts }
}

function cucumber(random: () => number): Drawn {
  const jitter = (n: number) => (random() - 0.5) * n
  // An A-frame of canes meeting above the root, strung with twine.
  const parts: Part[] = [
    part({ kind: 'cane', x: -74, y: -6, w: 9, h: 346, r: 12, at: 0 }),
    part({ kind: 'cane', x: 74, y: -6, w: 9, h: 346, r: -12, at: 0 }),
  ]
  for (const y of [70, 140, 210, 270]) {
    const half = 74 * (1 - y / 334)
    parts.push(part({ kind: 'twine', x: 0, y, w: half * 2, h: 1.6, anchor: [0.5, 0.5], at: 0 }))
  }
  parts.push(...seedLeaves())
  // The vine winds up through the twine, tendrils and all.
  const stalks: Stalk[] = [
    {
      kind: 'vine',
      origin: [0, 0],
      points: [[0, 0], [-5, 44], [5, 92], [-6, 140], [5, 188], [-4, 236], [2, 292]],
      width: 4.5,
      from: 0.07,
      to: 0.78,
      side: random() < 0.5 ? -1 : 1,
      wilt: 26,
    },
  ]
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const y = 16 + i * 24 + jitter(8)
    const size = 62 - i * 2.4
    // Each leaf stands out from the vine on its own stalk, which the drawing includes.
    parts.push(
      onStalk(stalks, 0, alongAt(stalks[0], y), {
        kind: 'vine-leaf',
        x: 0,
        y: 0,
        w: size,
        h: size,
        anchor: [0.5, 1],
        r: side * (40 + jitter(18)),
        side,
        at: 0.07,
        variant: Math.floor(random() * 2),
      }),
    )
  }
  for (const [x, y] of [[-20, 120], [24, 178], [-8, 232], [16, 100]] as const)
    parts.push(...hanging(stalks, 0, alongAt(stalks[0], y), Math.sign(x) * 9, 2, { kind: 'flower', x: 0, y: 0, w: 18, h: 18, anchor: [0.5, 0.5], r: jitter(60), at: 0.5, z: 1 }))
  const fruit: [number, number, number][] = [[-24, 112, 6], [28, 160, -8], [-6, 206, 4]]
  fruit.forEach(([x, y, r], i) => {
    parts.push(
      ...hanging(stalks, 0, alongAt(stalks[0], y + 6), Math.sign(x) * 14, -4, {
        kind: 'cucumber', x: 0, y: 0, w: 17, h: 58, anchor: [0.5, 0.02], r, at: 0.66 + i * 0.03, ripeAt: 0.96, z: 2,
      }),
    )
  })
  return { stalks, parts }
}

function watermelon(random: () => number): Drawn {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [...seedLeaves()]
  // The vine trails out along the soil and over the front edge, unrolling as it grows.
  parts.push(part({ kind: 'vine', x: 2, y: 8, w: 170, h: 180, anchor: [0.01, 0.06], at: 0.25, span: 0.45, grows: true, z: 3 }))
  const leaves: [number, number, -1 | 0 | 1][] = [
    [-6, 12, 0], [-48, 6, -1], [36, 10, 1], [-90, 2, -1], [78, 8, 1], [-124, 0, -1], [114, 6, 1], [8, 30, 0], [-30, 26, -1], [52, 28, 1],
  ]
  leaves.forEach(([x, y, side], i) => {
    const w = 82 - i * 2
    parts.push(
      part({
        kind: 'melon-leaf',
        x: x + jitter(8),
        y: y + jitter(4),
        w,
        h: w * 0.8,
        anchor: [0.5, 0.92],
        r: side * 14 + jitter(24),
        side,
        at: 0.1 + (Math.abs(x) / 130) * 0.5,
        variant: i % 2,
      }),
    )
  })
  for (const [x, y, r] of [[154, -34, 70], [150, -112, 104]] as const)
    parts.push(part({ kind: 'melon-leaf', x, y, w: 58, h: 46, anchor: [0.15, 0.5], r, side: 1, at: 0.62, variant: 1, z: 4 }))
  parts.push(part({ kind: 'flower', x: 24, y: 40, w: 20, h: 20, anchor: [0.5, 0.5], at: 0.5, z: 1 }))
  parts.push(part({ kind: 'melon', x: -26, y: -8, w: 132, h: 86, anchor: [0.5, 0.94], r: -2, at: 0.62, ripeAt: 1, z: 2 }))
  return { stalks: [], parts }
}

function basil(random: () => number): Drawn {
  const jitter = (n: number) => (random() - 0.5) * n
  // A bush, seen from the side: a main stem and two branches, each carrying
  // opposite pairs at every angle. Some pairs face the viewer and foreshorten,
  // so the leaves overlap into a mound rather than a neat ladder.
  const parts: Part[] = [...seedLeaves()]
  const stems = [
    { x: 0, lean: 0, height: 126, start: 0.07 },
    { x: -5, lean: -28, height: 92, start: 0.3 },
    { x: 5, lean: 26, height: 98, start: 0.34 },
  ]
  const stalks: Stalk[] = stems.map((stem) => {
    const rad = (stem.lean * Math.PI) / 180
    const bow = jitter(10)
    return {
      kind: 'stem',
      origin: [stem.x, 0],
      points: [
        [0, 0],
        [Math.sin(rad) * stem.height * 0.5 + bow, Math.cos(rad) * stem.height * 0.5],
        [Math.sin(rad) * stem.height, Math.cos(rad) * stem.height],
      ],
      width: 4.5,
      from: stem.start,
      to: stem.start + 0.5,
      side: stem.lean < 0 ? -1 : 1,
      wilt: 24,
    }
  })
  stems.forEach((stem, index) => {
    const pairs = Math.round(stem.height / 17)
    for (let i = 0; i < pairs; i++) {
      const along = 8 + (i / pairs) * stem.height * 0.92
      const size = (84 - i * 6.5) * (stem.lean ? 0.86 : 1)
      const facingViewer = (i + (stem.lean > 0 ? 1 : 0)) % 2 === 1
      for (const side of [-1, 1] as const) {
        const w = size * (facingViewer ? 0.62 : 1) * (0.9 + random() * 0.2)
        parts.push(
          onStalk(stalks, index, along, {
            kind: 'basil-leaf',
            x: 0,
            y: 0,
            w,
            h: size * 0.78 * (facingViewer ? 1.05 : 0.86),
            anchor: facing(BASIL_LEAF_BASE, side),
            r: side * (14 - i * 7 + jitter(26)) + stem.lean * 0.6,
            side,
            at: stem.start + (side > 0 ? 0.02 : 0),
            variant: Math.floor(random() * 3),
            z: facingViewer ? 1 : 0,
          }),
        )
      }
    }
  })
  return { stalks, parts }
}

function geranium(random: () => number): Drawn {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [...seedLeaves()]
  for (let i = 0; i < 9; i++) {
    const side = i % 2 === 0 ? -1 : 1
    parts.push(
      part({
        kind: 'round-leaf',
        x: side * (8 + i * 6) + jitter(10),
        y: 2 + (i % 3) * 14 + jitter(6),
        w: 62,
        h: 52,
        anchor: [0.5, 0.92],
        r: side * (10 + i * 3) + jitter(16),
        side,
        at: 0.1 + i * 0.05,
        variant: i % 2,
        z: i % 3 === 2 ? 1 : 0,
      }),
    )
  }
  // Each flower head rises out of the leaves on its own long stalk.
  const blooms: [number, number][] = [[-30, 108], [24, 120], [-2, 140]]
  const stalks: Stalk[] = blooms.map(([x, y], i) => {
    const dx = x * 0.7
    return {
      kind: 'stalk',
      origin: [x * 0.3, 30],
      points: [[0, 0], [dx * 0.4 + jitter(8), (y - 30) * 0.5], [dx, y - 30]],
      width: 3.4,
      from: 0.48,
      to: 0.55 + i * 0.05,
      side: x < 0 ? -1 : 1,
      wilt: 30,
    }
  })
  blooms.forEach((_, i) => {
    const along = segmentsOf(stalks[i]).total
    parts.push(
      onStalk(stalks, i, along, {
        kind: 'bloom', x: 0, y: 0, w: 62, h: 54, anchor: [0.5, 0.75], r: directionAt(stalks[i], along) * 0.5, at: 0.55 + i * 0.05, ripeAt: 0.82 + i * 0.07, z: 3,
      }),
    )
  })
  return { stalks, parts }
}

const DRAW: Record<CropId, (random: () => number) => Drawn> = { tomato, cucumber, watermelon, basil, geranium }

/**
 * Progress rounded to what a drawing can show, so a fast clock re-draws a
 * plant only when something about it would change.
 */
export const plantProgress = (progress: number) => Math.round(progress * 200) / 200

/** The same crop and seed always lay out the same plant. */
export function plantDrawing(crop: CropId, seed: number): PlantDrawing {
  const { stalks, parts } = DRAW[crop](seededRandom(seed))
  const sorted = parts
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(a.p.stalk !== undefined) - Number(b.p.stalk !== undefined) || (a.p.z ?? 0) - (b.p.z ?? 0) || a.i - b.i)
    .map(({ p }) => p)
  return { stalks, segments: stalks.map(segmentsOf), parts: sorted }
}
