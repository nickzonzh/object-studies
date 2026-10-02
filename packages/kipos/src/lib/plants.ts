import { seededRandom } from 'object-studies-core'
import type { CropId } from './garden.js'

/**
 * Each plant is drawn from parts laid out around its root, in garden units
 * (one unit is a thousandth of a bed's width). `x` runs right from the root,
 * `y` up from the soil. A part shows once the plant's progress reaches `at`.
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
  | 'bloom'

export type Part = {
  kind: PartKind
  x: number
  y: number
  w: number
  h: number
  /** Resting rotation, degrees. */
  r: number
  /** Which way a leaf droops when the plant wilts: -1 left, 1 right, 0 not at all. */
  side: -1 | 0 | 1
  /** Progress at which the part appears. */
  at: number
  /** Progress at which a fruit reaches full size and colour. */
  ripeAt?: number
  /** Rotation pivot, CSS transform-origin. */
  origin?: string
  /** Stems and runners stretch with growth instead of popping in. */
  grows?: boolean
}

const part = (p: Omit<Part, 'side' | 'r'> & Partial<Pick<Part, 'side' | 'r'>>): Part => ({
  side: 0,
  r: 0,
  ...p,
})

// Cotyledons: the first pair of seed leaves every plant shows.
const seedLeaves = (spread: number): Part[] => [
  part({ kind: 'cotyledon', x: -spread, y: 6, w: 22, h: 11, r: -24, side: -1, at: 0.07, origin: '100% 50%' }),
  part({ kind: 'cotyledon', x: spread, y: 6, w: 22, h: 11, r: 24, side: 1, at: 0.07, origin: '0% 50%' }),
]

function tomato(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [
    part({ kind: 'cane', x: -38, y: 0, w: 7, h: 330, r: -4, at: 0, origin: '50% 100%' }),
    part({ kind: 'cane', x: 36, y: 0, w: 7, h: 336, r: 5, at: 0, origin: '50% 100%' }),
    ...seedLeaves(10),
    part({ kind: 'stem', x: 0, y: 0, w: 6, h: 300, at: 0.07, grows: true, origin: '50% 100%' }),
  ]
  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const y = 34 + i * 27 + jitter(8)
    parts.push(
      part({
        kind: 'leaf',
        x: side * (24 + jitter(6)),
        y,
        w: 54 - i * 1.6,
        h: 27 - i * 0.6,
        r: side * (-14 + jitter(14)),
        side,
        at: 0.1 + (y / 310) * 0.55,
        origin: side < 0 ? '100% 50%' : '0% 50%',
      }),
    )
  }
  for (const [i, y] of [118, 206, 292].entries()) {
    parts.push(part({ kind: 'tie', x: -38 + y * -0.07, y, w: 16, h: 7, r: -12, at: 0.28 + i * 0.12 }))
    parts.push(part({ kind: 'tie', x: 36 + y * 0.087, y: y - 6, w: 16, h: 7, r: 14, at: 0.32 + i * 0.12 }))
  }
  const flowers: [number, number][] = [[-16, 150], [18, 196], [-12, 244], [14, 280]]
  for (const [x, y] of flowers) parts.push(part({ kind: 'flower', x, y, w: 11, h: 11, at: 0.5 }))
  const fruit: [number, number, number][] = [[-15, 98, 30], [19, 132, 32], [-21, 174, 28], [15, 214, 30], [-9, 248, 26], [23, 262, 22]]
  fruit.forEach(([x, y, size], i) => {
    parts.push(
      part({
        kind: 'tomato',
        x: x + jitter(4),
        y: y + jitter(6),
        w: size,
        h: size * 0.93,
        at: 0.64 + i * 0.012,
        ripeAt: 0.86 + random() * 0.14,
      }),
    )
  })
  return parts
}

function cucumber(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  // An A-frame: two canes leaning in to meet above the root.
  const parts: Part[] = [
    part({ kind: 'cane', x: -72, y: 0, w: 7, h: 340, r: 12, at: 0, origin: '50% 100%' }),
    part({ kind: 'cane', x: 72, y: 0, w: 7, h: 340, r: -12, at: 0, origin: '50% 100%' }),
  ]
  for (const y of [86, 158, 230, 290]) {
    const half = 72 * (1 - y / 332)
    parts.push(part({ kind: 'twine', x: 0, y, w: half * 2, h: 1.5, at: 0 }))
  }
  parts.push(...seedLeaves(10))
  parts.push(part({ kind: 'stem', x: 0, y: 0, w: 4, h: 290, at: 0.07, grows: true, origin: '50% 100%' }))
  for (let i = 0; i < 11; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const y = 22 + i * 26 + jitter(8)
    const reach = 60 * (1 - y / 332)
    const size = 46 - i * 1.8
    parts.push(
      part({
        kind: 'vine-leaf',
        x: side * (reach * 0.55 + jitter(8)),
        y,
        w: size,
        h: size,
        r: side * 30 + jitter(20) + (side < 0 ? -45 : 45),
        side,
        at: 0.1 + (y / 320) * 0.55,
        origin: '50% 90%',
      }),
    )
  }
  for (const [x, y] of [[-18, 128], [22, 186], [-6, 238]] as const)
    parts.push(part({ kind: 'flower', x, y, w: 13, h: 13, at: 0.5 }))
  const fruit: [number, number, number][] = [[-22, 118, 6], [26, 168, -8], [-6, 214, 4]]
  fruit.forEach(([x, y, r], i) => {
    parts.push(part({ kind: 'cucumber', x, y, w: 17, h: 62, r, at: 0.66 + i * 0.03, ripeAt: 0.96, origin: '50% 0%' }))
  })
  return parts
}

function watermelon(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [...seedLeaves(10)]
  // The vine sprawls along the soil and over the front edge of the bed.
  parts.push(part({ kind: 'runner', x: 64, y: 4, w: 120, h: 4, at: 0.25, grows: true, origin: '0% 50%' }))
  parts.push(part({ kind: 'runner', x: 126, y: -138, w: 4, h: 144, at: 0.52, grows: true, origin: '50% 0%' }))
  const leaves: [number, number, number][] = [
    [-8, 18, 0], [-46, 10, -1], [34, 14, 1], [-84, 6, -1], [76, 10, 1], [-118, 4, -1], [112, 8, 1], [6, 30, 0],
  ]
  leaves.forEach(([x, y, side], i) => {
    parts.push(
      part({
        kind: 'melon-leaf',
        x: x + jitter(8),
        y: y + jitter(4),
        w: 66 - i * 1.5,
        h: 44 - i,
        r: jitter(30),
        side: side as -1 | 0 | 1,
        at: 0.1 + (Math.abs(x) / 130) * 0.5,
        origin: '50% 100%',
      }),
    )
  })
  for (const [y, r] of [[-30, 30], [-92, -24]] as const)
    parts.push(part({ kind: 'melon-leaf', x: 140, y, w: 44, h: 30, r, side: 1, at: 0.58, origin: '0% 50%' }))
  parts.push(part({ kind: 'flower', x: 22, y: 34, w: 14, h: 14, at: 0.5 }))
  parts.push(part({ kind: 'melon', x: -30, y: -4, w: 124, h: 80, r: -3, at: 0.62, ripeAt: 1 }))
  return parts
}

function basil(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [...seedLeaves(8), part({ kind: 'stem', x: 0, y: 0, w: 4, h: 70, at: 0.07, grows: true, origin: '50% 100%' })]
  // A mound: pairs of round leaves stacked higher and wider as it bushes out.
  for (let i = 0; i < 16; i++) {
    const ring = Math.floor(i / 4)
    const angle = (i % 4) / 3 - 0.5
    const side = angle < 0 ? -1 : 1
    parts.push(
      part({
        kind: 'basil-leaf',
        x: angle * (46 + ring * 20) + jitter(10),
        y: 8 + ring * 22 + (1 - Math.abs(angle) * 2) * 16 + jitter(6),
        w: 46 - ring * 3,
        h: 36 - ring * 2,
        r: side * (20 + jitter(20)),
        side,
        at: 0.1 + i * 0.045,
        origin: '50% 100%',
      }),
    )
  }
  return parts
}

function geranium(random: () => number): Part[] {
  const jitter = (n: number) => (random() - 0.5) * n
  const parts: Part[] = [...seedLeaves(8)]
  for (let i = 0; i < 9; i++) {
    const side = i % 2 === 0 ? -1 : 1
    parts.push(
      part({
        kind: 'round-leaf',
        x: side * (10 + i * 5) + jitter(10),
        y: 6 + (i % 3) * 14 + jitter(6),
        w: 50,
        h: 42,
        r: jitter(30),
        side,
        at: 0.1 + i * 0.05,
        origin: '50% 100%',
      }),
    )
  }
  const blooms: [number, number][] = [[-26, 92], [20, 104], [-2, 122]]
  blooms.forEach(([x, y], i) => {
    parts.push(part({ kind: 'stem', x: x * 0.7, y: 30, w: 3, h: y - 30, r: x * 0.2, at: 0.48, grows: true, origin: '50% 100%' }))
    parts.push(part({ kind: 'bloom', x, y, w: 54, h: 48, at: 0.55 + i * 0.05, ripeAt: 0.8 + i * 0.07 }))
  })
  return parts
}

const DRAW: Record<CropId, (random: () => number) => Part[]> = { tomato, cucumber, watermelon, basil, geranium }

/** The same crop and seed always lay out the same plant. */
export function plantParts(crop: CropId, seed: number): Part[] {
  return DRAW[crop](seededRandom(seed))
}
