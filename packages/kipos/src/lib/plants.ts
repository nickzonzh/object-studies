import { seededRandom } from 'object-studies-core'
import type { CropId } from './garden.js'

/**
 * Each plant is drawn from parts laid out around its root, in garden units
 * (one unit is a thousandth of a bed's width). `x` runs right from the root,
 * `y` up from the soil. A part's anchor point, a fraction of its own box from
 * the top left, sits at (x, y) and is also its pivot, so a leaf turns and
 * droops about where it joins the stem. A part shows once the plant's progress
 * reaches `at`.
 */
export type PartKind =
  | 'cane'
  | 'tie'
  | 'twine'
  | 'stem'
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
  | 'runner'
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
  /** Resting rotation, degrees. */
  r: number
  /** Which way a leaf droops when the plant wilts: -1 left, 1 right, 0 not at all. Also picks a leaf's facing. */
  side: -1 | 0 | 1
  /** Progress at which the part appears. */
  at: number
  /** Progress at which a fruit reaches full size and colour. */
  ripeAt?: number
  /** Stems and runners stretch with growth instead of popping in. */
  grows?: boolean
  /** Progress over which a growing part stretches from nothing to full length. */
  span?: number
  /** Which drawing of several to use. */
  variant: number
  /** Drawn in front of lower values. */
  z?: number
}

type PartInput = Omit<Part, 'side' | 'r' | 'anchor' | 'variant'> &
  Partial<Pick<Part, 'side' | 'r' | 'anchor' | 'variant'>>

const part = (p: PartInput): Part => ({ side: 0, r: 0, anchor: [0.5, 1], variant: 0, ...p })

// Where a leaf's stalk meets its blade, as a fraction of the sprite, for each facing.
const TOMATO_LEAF_BASE: [number, number] = [0.05, 0.53]
const BASIL_LEAF_BASE: [number, number] = [0.06, 0.52]
const facing = (base: [number, number], side: number): [number, number] => (side < 0 ? [1 - base[0], base[1]] : base)

/**
 * A stem through a list of points, as one growing segment per stretch, each
 * starting to grow as the one below it finishes. A real stem never runs
 * dead straight.
 */
function stem(points: [number, number][], width: number, from: number, to: number, z?: number): Part[] {
  const top = points[points.length - 1][1]
  return points.slice(0, -1).map(([x, y], i) => {
    const [nx, ny] = points[i + 1]
    const length = Math.hypot(nx - x, ny - y)
    return part({
      kind: 'stem',
      x,
      y,
      w: width * (1 - (i / points.length) * 0.35),
      h: length + width * 0.6,
      r: (Math.atan2(nx - x, ny - y) * 180) / Math.PI,
      at: from + (to - from) * (y / top),
      span: Math.max(0.02, (to - from) * ((ny - y) / top)),
      grows: true,
      z,
    })
  })
}

/** Where a stem through these points crosses height y. */
function stemX(points: [number, number][], y: number) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1]
    if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / Math.max(1, y1 - y0)
  }
  return points[points.length - 1][0]
}

// Cotyledons: the first pair of seed leaves every plant shows.
const seedLeaves = (y = 4): Part[] => [
  part({ kind: 'cotyledon', x: -2, y, w: 26, h: 12, anchor: [0.95, 0.5], r: 18, side: -1, at: 0.07 }),
  part({ kind: 'cotyledon', x: 2, y, w: 26, h: 12, anchor: [0.05, 0.5], r: -18, side: 1, at: 0.07 }),
]

function tomato(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  // Yiayia's canes go in on sowing day: two stakes, leaning in a little.
  const parts: Part[] = [
    part({ kind: 'cane', x: -40, y: -6, w: 9, h: 330, r: -3, at: 0 }),
    part({ kind: 'cane', x: 38, y: -6, w: 9, h: 338, r: 4, at: 0 }),
    ...seedLeaves(),
  ]
  const spine: [number, number][] = [[0, 0], [3, 50], [-4, 104], [4, 158], [-3, 212], [3, 258], [-1, 296]]
  parts.push(...stem(spine, 6.5, 0.07, 0.78))
  for (let i = 0; i < 13; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const y = 24 + i * 21 + jitter(8)
    const w = 118 - i * 4.2
    parts.push(
      part({
        kind: 'leaf',
        x: stemX(spine, y) + side * 2,
        y,
        w,
        h: w * 0.53,
        anchor: facing(TOMATO_LEAF_BASE, side),
        r: side * (-14 + jitter(22)) + (i > 9 ? side * -14 : 0),
        side,
        at: 0.1 + (y / 300) * 0.55,
        variant: Math.floor(random() * 3),
      }),
    )
  }
  for (const [i, y] of [112, 196, 280].entries()) {
    parts.push(part({ kind: 'tie', x: -40 - y * 0.052, y, w: 18, h: 10, anchor: [0.5, 0.5], r: -8, at: 0.28 + i * 0.12, z: 1 }))
    parts.push(part({ kind: 'tie', x: 38 + y * 0.07, y: y - 8, w: 18, h: 10, anchor: [0.5, 0.5], r: 10, at: 0.32 + i * 0.12, variant: 1 - (i % 2), z: 1 }))
  }
  const flowers: [number, number][] = [[-22, 150], [24, 198], [-16, 238], [20, 270], [-26, 210]]
  for (const [x, y] of flowers) parts.push(part({ kind: 'flower', x, y, w: 16, h: 16, anchor: [0.5, 0], r: jitter(40), at: 0.5 }))
  // Trusses of fruit hanging under the leaves, lowest ripening first.
  const fruit: [number, number, number][] = [
    [-16, 104, 34], [8, 96, 30], [20, 142, 32], [-24, 178, 30], [-6, 170, 26], [18, 220, 30], [-12, 252, 26], [24, 262, 22],
  ]
  fruit.forEach(([x, y, size], i) => {
    parts.push(
      part({
        kind: 'tomato',
        x: x + jitter(4),
        y: y + jitter(6),
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
  return parts
}

function cucumber(random: () => number): Part[] {
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
  const vine: [number, number][] = [[0, 0], [-5, 44], [5, 92], [-6, 140], [5, 188], [-4, 236], [2, 292]]
  parts.push(...stem(vine, 4.5, 0.07, 0.78))
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const y = 16 + i * 24 + jitter(8)
    const reach = 64 * (1 - y / 334)
    const size = 62 - i * 2.4
    parts.push(
      part({
        kind: 'vine-leaf',
        x: stemX(vine, y) + side * (reach * 0.42 + jitter(8)),
        y,
        w: size,
        h: size,
        anchor: [0.5, 1],
        r: side * (34 + jitter(18)),
        side,
        at: 0.1 + (y / 320) * 0.55,
        variant: Math.floor(random() * 2),
      }),
    )
  }
  for (const [x, y] of [[-20, 120], [24, 178], [-8, 232], [16, 100]] as const)
    parts.push(part({ kind: 'flower', x, y, w: 18, h: 18, anchor: [0.5, 0.5], r: jitter(60), at: 0.5, z: 1 }))
  const fruit: [number, number, number][] = [[-24, 112, 6], [28, 160, -8], [-6, 206, 4]]
  fruit.forEach(([x, y, r], i) => {
    parts.push(part({ kind: 'cucumber', x, y, w: 17, h: 58, anchor: [0.5, 0.02], r, at: 0.66 + i * 0.03, ripeAt: 0.96, z: 2 }))
  })
  return parts
}

function watermelon(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [...seedLeaves()]
  // The vine sprawls along the soil and over the front edge of the bed.
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
  return parts
}

function basil(random: () => number): Part[] {
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
  for (const stem of stems) {
    parts.push(part({ kind: 'stem', x: stem.x, y: 0, w: 4.5, h: stem.height, r: stem.lean, at: stem.start, grows: true }))
    const pairs = Math.round(stem.height / 17)
    const rad = (stem.lean * Math.PI) / 180
    for (let i = 0; i < pairs; i++) {
      const along = 8 + (i / pairs) * stem.height * 0.92
      const x = stem.x + Math.sin(rad) * along
      const y = Math.cos(rad) * along
      const size = (84 - i * 6.5) * (stem.lean ? 0.86 : 1)
      const facingViewer = (i + (stem.lean > 0 ? 1 : 0)) % 2 === 1
      for (const side of [-1, 1] as const) {
        const w = size * (facingViewer ? 0.62 : 1) * (0.9 + random() * 0.2)
        parts.push(
          part({
            kind: 'basil-leaf',
            x,
            y,
            w,
            h: size * 0.78 * (facingViewer ? 1.05 : 0.86),
            anchor: facing(BASIL_LEAF_BASE, side),
            r: side * (14 - i * 7 + jitter(26)) + stem.lean * 0.6,
            side,
            at: stem.start + 0.04 + (i / pairs) * 0.6 + (side > 0 ? 0.02 : 0),
            variant: Math.floor(random() * 3),
            z: facingViewer ? 1 : 0,
          }),
        )
      }
    }
  }
  return parts
}

function geranium(random: () => number): Part[] {
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
  const blooms: [number, number][] = [[-30, 108], [24, 120], [-2, 140]]
  blooms.forEach(([x, y], i) => {
    const dx = x * 0.7
    parts.push(
      part({
        kind: 'stem',
        x: x * 0.3,
        y: 30,
        w: 3.4,
        h: Math.hypot(dx, y - 30),
        r: (Math.atan2(dx, y - 30) * 180) / Math.PI,
        at: 0.48,
        grows: true,
        z: 2,
      }),
    )
    parts.push(part({ kind: 'bloom', x, y, w: 62, h: 54, anchor: [0.5, 0.75], at: 0.55 + i * 0.05, ripeAt: 0.82 + i * 0.07, z: 3 }))
  })
  return parts
}

const DRAW: Record<CropId, (random: () => number) => Part[]> = { tomato, cucumber, watermelon, basil, geranium }

/** The same crop and seed always lay out the same plant, back to front. */
export function plantParts(crop: CropId, seed: number): Part[] {
  return DRAW[crop](seededRandom(seed))
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.z ?? 0) - (b.p.z ?? 0) || a.i - b.i)
    .map(({ p }) => p)
}
