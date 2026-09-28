// Ikaros style: Rhodian hand-painted ware in the Iznik tradition.
// White glaze, cobalt and green underglaze, fine gold overglaze contours.
//
// Every motif is built from brush strokes in wall units and varied by the
// piece's seed, so two vases with the same pattern are never quite the same.

import {
  type Frame,
  type LayerName,
  type Pt,
  Painter,
  Rng,
  TAU,
  catmull,
  circle,
  cubic,
  ribbon,
  transform,
  wobble,
  along,
  jitterPts,
  shade,
  fit,
  type Extent,
} from './painter.js'
import type { Zone } from './shapes.js'

export type IkarosPaletteId = 'cobalt-gold' | 'lindos' | 'midnight' | 'folk'

export type IkarosPalette = {
  id: IkarosPaletteId
  label: string
  ground: string
  field: string | null
  cobalt: string
  blue: string
  pale: string
  green: string
  leaf: string
  turq: string
  accent: string
  accentRaised: boolean
  dark: string
  contour: 'gold' | 'dark'
  bandGround: string
  bandMotif: string
  bandInk: string
  petalLight: string
}

export const IKAROS_PALETTES: Record<IkarosPaletteId, IkarosPalette> = {
  'cobalt-gold': {
    id: 'cobalt-gold',
    label: 'Cobalt & gold',
    ground: '#f6f3ec',
    field: null,
    cobalt: '#0c1450',
    blue: '#1c2e88',
    pale: '#4f6cc4',
    green: '#164e33',
    leaf: '#2d6c47',
    turq: '#166c7a',
    accent: '#1c2e88',
    accentRaised: false,
    dark: '#070b30',
    contour: 'gold',
    bandGround: '#0c1452',
    bandMotif: '#f6f3ec',
    bandInk: '#233f9e',
    petalLight: '#7f98dc',
  },
  lindos: {
    id: 'lindos',
    label: 'Lindos',
    ground: '#f7f2e6',
    field: null,
    cobalt: '#0f2160',
    blue: '#1d4290',
    pale: '#4d80c0',
    green: '#1f5226',
    leaf: '#3a7634',
    turq: '#10707c',
    accent: '#94281f',
    accentRaised: true,
    dark: '#141c2a',
    contour: 'dark',
    bandGround: '#0f2160',
    bandMotif: '#f7f2e6',
    bandInk: '#94281f',
    petalLight: '#7ea8da',
  },
  // Folk ware is painted by its own module (folk.ts); these values are used for trims.
  folk: {
    id: 'folk',
    label: 'Folk',
    ground: '#f5f2ea',
    field: null,
    cobalt: '#243a9a',
    blue: '#4058bd',
    pale: '#6e76cf',
    green: '#2f7f55',
    leaf: '#4c9a6a',
    turq: '#58b8c0',
    accent: '#a8432b',
    accentRaised: false,
    dark: '#191816',
    contour: 'dark',
    bandGround: '#4058bd',
    bandMotif: '#f5f2ea',
    bandInk: '#a8432b',
    petalLight: '#9aa2e0',
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    ground: '#f4f0e6',
    field: '#0d174e',
    cobalt: '#f4f0e6',
    blue: '#a9bdec',
    pale: '#f4f0e6',
    green: '#2f7a55',
    leaf: '#4f9670',
    turq: '#249a9e',
    accent: '#249a9e',
    accentRaised: false,
    dark: '#0e1850',
    contour: 'gold',
    bandGround: '#f4f0e6',
    bandMotif: '#0d174e',
    bandInk: '#1d7f8c',
    petalLight: '#dfe7fb',
  },
}

const GOLD = '#caa55a'

type Ctx = {
  p: Painter
  pal: IkarosPalette
  rng: Rng
}

// ------------------------------------------------------------ brush helpers

function contour(c: Ctx, f: Frame, pts: Pt[], width = 0.0021) {
  if (c.pal.contour === 'gold') f.outline('gold', pts, GOLD, width / f.scale)
  else f.outline('paint', pts, c.pal.dark, (width * 0.8) / f.scale, 0.9)
}

function wash(c: Ctx, f: Frame, pts: Pt[], color: string, layer: LayerName = 'paint') {
  // a shape painted on top hides the gold contours of whatever lies beneath it
  if (c.pal.contour === 'gold') f.fill('gold', pts, '#000', { erase: true })
  const size = physSize(f, pts)
  f.fill(layer, pts, color, {
    alpha: 0.96,
    edge: c.pal.dark,
    edgeWidth: 0.0011,
    edgeAlpha: 0.28,
    // cobalt settles thick at the edge of a wash and thins in the middle
    pool: { color: shade(color, c.pal.field && color === c.pal.cobalt ? -0.18 : -0.42), width: Math.min(0.0032, size * 0.13), alpha: 0.42 },
    grain: { angle: NaN, color: shade(color, 0.28), alpha: 0.14 },
  })
}

/** Rough physical size of a shape once placed. */
function physSize(f: Frame, pts: Pt[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const q of pts) {
    const [x, y] = f.phys(q)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return Math.min(maxX - minX, maxY - minY)
}

/**
 * Draw a motif at the largest size that keeps it inside its band. The motif
 * is measured first with a copy of its random seed, then painted for real.
 */
function fitIn(c: Ctx, draw: (c: Ctx, k: number) => void, room: (e: Extent) => number) {
  const seed = Math.floor(c.rng.next() * 4294967296)
  return fit(c.p, (k) => draw({ ...c, rng: new Rng(seed) }, k), room)
}

/** Room above a baseline: how far a motif rising from `base` can grow before it reaches `limit`. */
const under = (limit: number, base: number) => (e: Extent) =>
  e.maxY <= limit ? 1 : (limit - base) / Math.max(1e-6, e.maxY - base)

/** Room below a baseline, for motifs that hang down. */
const over = (limit: number, base: number) => (e: Extent) =>
  e.minY >= limit ? 1 : (base - limit) / Math.max(1e-6, base - e.minY)

/** Room inside a circle on a plate. */
const inside = (radius: number) => (e: Extent) => radius / Math.max(1e-6, e.maxR)

/** Thin lighter strokes inside a petal, the painter's second pass. */
function striations(f: Frame, lines: Pt[][], color: string, width = 0.0011) {
  for (const l of lines) f.line('paint', l, color, width / f.scale, { alpha: 0.75 })
}

/** Leaf midrib: a gold hairline on gilded pieces, a dark one on Lindos. */
function vein(c: Ctx, f: Frame, pts: Pt[], width = 0.0009) {
  if (c.pal.contour === 'gold') f.line('gold', pts, GOLD, width / f.scale, { alpha: 0.95 })
  else f.line('paint', pts, c.pal.field ? c.pal.pale : c.pal.dark, width / f.scale, { alpha: 0.55 })
}

/**
 * A hairline tendril that runs out from a stem and coils at the end, with a
 * couple of seed leaves. This is the fine work that fills the white ground.
 */
function tendril(c: Ctx, f: Frame, len: number, curl = 1) {
  const { pal, rng } = c
  const pts: Pt[] = []
  const turns = rng.range(1.1, 1.6)
  let x = 0
  let y = 0
  let a = 0
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push([x, y])
    const k = Math.pow(t, 2.2) * turns * Math.PI * 2.4 * curl
    a = Math.PI / 2 - k
    const step = (len / steps) * (1 - t * 0.55)
    x += Math.cos(a) * step
    y += Math.sin(a) * step
  }
  const gold = pal.contour === 'gold'
  const col = gold ? GOLD : pal.dark
  const layer: LayerName = gold ? 'gold' : 'paint'
  f.line(layer, pts, col, 0.00115 / f.scale, { alpha: gold ? 0.95 : 0.7 })
  // seed leaves along the run
  for (const t of [0.3, 0.55]) {
    const { p, d } = along(pts, t)
    const s = t < 0.5 ? 1 : -1
    const ang = Math.atan2(d[1], d[0]) - Math.PI / 2 + s * 0.9
    const lf = transform(catmull([[0, 0], [-0.25, 0.5], [0, 1], [0.25, 0.5]], 4, true), p[0], p[1], ang, len * 0.1)
    if (gold) f.fill('gold', lf, GOLD)
    else f.fill('paint', lf, pal.green, { alpha: 0.9 })
  }
  const end = pts[pts.length - 1]
  const tip = circle(end[0], end[1], len * 0.028, 10)
  if (gold) f.fill('gold', tip, GOLD)
  else f.fill(accentLayer(c), tip, pal.accent)
}

function accentLayer(c: Ctx): LayerName {
  return c.pal.accentRaised ? 'over' : 'paint'
}

// ------------------------------------------------------------------- motifs

/** Fringed petal pointing up (+y), base at y = b. */
function fringedPetal(rng: Rng, len: number, base: number, w0: number, wm: number, teeth: number): Pt[] {
  const top = base + len
  const shoulder = base + len * 0.72
  const tipW = wm * 0.95
  const side: Pt[] = catmull([[w0, base], [wm * 0.8, base + len * 0.35], [wm, shoulder], [tipW, top - len * 0.1]], 6)
  const left = side.map(([x, y]) => [-x, y] as Pt)
  const teethPts: Pt[] = []
  for (let j = 0; j <= teeth * 2; j++) {
    const x = -tipW + (2 * tipW * j) / (teeth * 2)
    const arch = 1 - Math.pow(x / tipW, 2) * 0.35
    const isTip = j % 2 === 1
    const y = top - len * 0.1 + (isTip ? len * 0.12 * arch * rng.vary(1, 0.2) : len * 0.02 * arch)
    teethPts.push([x, y])
  }
  return [...left, ...teethPts, ...side.slice().reverse()]
}

/** Face-on cornflower rosette: the large blossom from the Rhodian belly. */
function cornflower(c: Ctx, f: Frame, opts: { petals?: number; tone?: 'cool' | 'accent' } = {}) {
  const { pal, rng } = c
  const n = opts.petals ?? rng.int(8, 10)
  const rot0 = rng.range(0, TAU)
  const wob = wobble(rng, n)
  // back ring, half a step round, paler
  for (let i = 0; i < n; i++) {
    const a = rot0 + ((i + 0.5) / n) * TAU
    const petal = transform(fringedPetal(rng, 0.62, 0.3, 0.05, 0.16, 3), 0, 0, a - Math.PI / 2, rng.vary(1, 0.05))
    wash(c, f, petal, pal.pale)
  }
  const front: Pt[][] = []
  for (let i = 0; i < n; i++) {
    const a = rot0 + (i / n) * TAU
    const len = 0.6 * (1 + wob(i / n) * 0.06)
    const local = fringedPetal(rng, len, 0.24, 0.06, 0.2, rng.pick([3, 3, 4]))
    const petal = transform(local, 0, 0, a - Math.PI / 2)
    front.push(petal)
    wash(c, f, petal, opts.tone === 'accent' ? pal.accent : pal.cobalt, opts.tone === 'accent' ? accentLayer(c) : 'paint')
    // centre stripe
    const stripe = transform(
      [
        [0, 0.3],
        [rng.range(-0.01, 0.01), 0.5],
        [0, 0.72],
      ],
      0,
      0,
      a - Math.PI / 2,
    )
    striations(f, [catmull(stripe, 6)], pal.petalLight, 0.0016)
    for (const off of [-0.07, 0.07]) {
      const side = transform([[off * 0.6, 0.34], [off, 0.5], [off * 1.1, 0.66]], 0, 0, a - Math.PI / 2)
      striations(f, [catmull(side, 5)], pal.petalLight, 0.0008)
    }
  }
  if (pal.contour === 'gold') {
    for (let i = 0; i < n; i++) {
      const a = rot0 + ((i + 0.5) / n) * TAU
      f.line('gold', transform([[0, 0.62], [0, 0.86]], 0, 0, a - Math.PI / 2), GOLD, 0.0007 / f.scale)
    }
  }
  for (const petal of front) contour(c, f, petal)
  // centre boss
  const boss = circle(0, 0, 0.27, 32, rng, 0.03)
  wash(c, f, boss, pal.blue)
  const eye = circle(0, 0, 0.14, 24, rng, 0.04)
  wash(c, f, eye, pal.field ? pal.turq : pal.cobalt)
  contour(c, f, boss)
  contour(c, f, eye)
  // ring of seed dots
  const dots = rng.int(8, 11)
  for (let i = 0; i < dots; i++) {
    const a = (i / dots) * TAU + rot0
    const d = circle(Math.cos(a) * 0.205, Math.sin(a) * 0.205, 0.026, 10)
    if (pal.contour === 'gold') f.fill('gold', d, GOLD)
    else f.fill(accentLayer(c), d, pal.accent)
  }
}

/** Side-view carnation: fan of serrated petals rising from a green calyx. */
function carnation(c: Ctx, f: Frame) {
  const { pal, rng } = c
  const lobes = rng.pick([5, 5, 7])
  const spread = rng.range(1.05, 1.25)
  const order = Array.from({ length: lobes }, (_, i) => i).sort(
    (a, b) => Math.abs(b - (lobes - 1) / 2) - Math.abs(a - (lobes - 1) / 2),
  )
  const pivot: Pt = [0, 0.3]
  const polys: Pt[][] = []
  for (const i of order) {
    const k = i / (lobes - 1) - 0.5
    const ang = k * spread * 2
    const len = 0.66 - Math.abs(k) * 0.26
    const w = 0.13 + (0.5 - Math.abs(k)) * 0.05
    const lobe: Pt[] = [
      [-0.03, 0],
      ...catmull([[-0.04, 0.05], [-w * 0.8, len * 0.55], [-w, len * 0.88]], 5),
    ]
    const teeth = 4
    for (let j = 0; j <= teeth * 2; j++) {
      const x = -w + (2 * w * j) / (teeth * 2)
      const arch = 1 - Math.pow(x / w, 2) * 0.5
      lobe.push([x, len * 0.88 + (j % 2 ? len * 0.13 * arch * rng.vary(1, 0.2) : len * 0.03)])
    }
    lobe.push(...catmull([[w, len * 0.88], [w * 0.8, len * 0.55], [0.04, 0.05]], 5), [0.03, 0])
    const poly = transform(lobe, pivot[0], pivot[1], -ang)
    const col = i % 2 === (lobes === 5 ? 0 : 1) ? pal.cobalt : pal.accent
    wash(c, f, poly, col, col === pal.accent ? accentLayer(c) : 'paint')
    const lines: Pt[][] = [-0.4, 0, 0.4].map((s) =>
      transform(catmull([[s * w * 0.3, 0.12], [s * w * 0.6, len * 0.5], [s * w * 0.7, len * 0.8]], 5), pivot[0], pivot[1], -ang),
    )
    striations(f, lines, col === pal.cobalt ? pal.pale : pal.petalLight, 0.0012)
    contour(c, f, poly)
    polys.push(poly)
  }
  // calyx: a cup with pointed sepals
  const calyx: Pt[] = [
    [-0.1, 0],
    ...catmull([[-0.14, 0.08], [-0.2, 0.22], [-0.25, 0.36]], 5),
    [-0.14, 0.29],
    [-0.06, 0.39],
    [0, 0.3],
    [0.06, 0.39],
    [0.14, 0.29],
    ...catmull([[0.25, 0.36], [0.2, 0.22], [0.14, 0.08]], 5),
    [0.1, 0],
  ]
  const cal = jitterPts(calyx, rng, 0.006)
  wash(c, f, cal, pal.green)
  striations(f, [[[0, 0.03], [0, 0.26]], [[-0.07, 0.04], [-0.12, 0.26]], [[0.07, 0.04], [0.12, 0.26]]], pal.leaf, 0.001)
  contour(c, f, cal)
}

/** Side-view tulip: two flared outer petals framing a pointed centre petal. */
function tulip(c: Ctx, f: Frame) {
  const { pal, rng } = c
  const flare = rng.range(0.32, 0.42)
  const side = (s: number): Pt[] =>
    [
      ...cubic([0.02 * s, 0.04], [0.3 * s, 0.12], [flare * s, 0.5], [flare * 1.05 * s, 0.98], 18),
      ...cubic([flare * 1.05 * s, 0.98], [0.2 * s, 0.72], [0.12 * s, 0.4], [0.02 * s, 0.2], 14),
    ].map(([x, y]) => [x, y] as Pt)
  const left = side(-1)
  const right = side(1)
  const sideCol = pal.cobalt
  wash(c, f, left, sideCol)
  contour(c, f, left)
  wash(c, f, right, sideCol)
  contour(c, f, right)
  striations(
    f,
    [
      cubic([-0.06, 0.12], [-0.2, 0.3], [-flare * 0.7, 0.55], [-flare * 0.9, 0.84], 10),
      cubic([0.06, 0.12], [0.2, 0.3], [flare * 0.7, 0.55], [flare * 0.9, 0.84], 10),
    ],
    pal.pale,
    0.0012,
  )
  const centreCol = rng.chance(0.5) ? pal.accent : pal.turq
  const centre: Pt[] = [
    ...cubic([0, 0.02], [-0.24, 0.05], [-0.26, 0.5], [0, rng.range(0.92, 1.02)], 20),
    ...cubic([0, 0.97], [0.26, 0.5], [0.24, 0.05], [0, 0.02], 20).slice(1),
  ]
  wash(c, f, centre, centreCol, centreCol === pal.accent ? accentLayer(c) : 'paint')
  striations(f, [cubic([0, 0.1], [-0.06, 0.4], [-0.05, 0.6], [0, 0.82], 10)], pal.petalLight, 0.0012)
  contour(c, f, centre)
}

function veinOf(c: Ctx, f: Frame, vv: Pt[]) {
  vein(c, f, vv, 0.0011)
  if (c.pal.contour !== 'gold') return
  for (let i = 1; i < 7; i++) {
    const { p, d } = along(vv, i / 7)
    const w = 0.012
    vein(c, f, [p, [p[0] + d[0] * w * 0.7 - d[1] * w, p[1] + d[1] * w * 0.7 + d[0] * w]], 0.0006)
  }
}

/** Long serrated saz leaf along a curve, split in two tones down the vein. */
function saz(c: Ctx, f: Frame, path: Pt[], width: number) {
  const { pal, rng } = c
  const center = catmull(path, 14)
  const teeth = rng.int(6, 8)
  const profile = (t: number) => width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.85)
  const outer = (t: number) => {
    if (t < 0.12 || t > 0.9) return 0
    const k = (t * teeth * 1.3) % 1
    return width * 0.22 * Math.pow(k, 2.2)
  }
  const left: Pt[] = []
  const right: Pt[] = []
  const vein: Pt[] = []
  const N = 120
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const { p, d } = along(center, t)
    const nx = -d[1]
    const ny = d[0]
    const w = profile(t) / 2
    left.push([p[0] + nx * (w + outer(t)), p[1] + ny * (w + outer(t))])
    right.push([p[0] - nx * w, p[1] - ny * w])
    vein.push(p)
  }
  const leaf = [...left, ...right.reverse()]
  wash(c, f, leaf, pal.green)
  // darker half along the vein
  const half = [...left, ...vein.slice().reverse()]
  f.fill('paint', half, pal.field ? pal.turq : pal.dark, { alpha: pal.field ? 0.35 : 0.22 })
  contour(c, f, leaf)
  // gold midrib and fine side veins
  veinOf(c, f, vein.slice(4, N - 6))
}

function smallLeaf(c: Ctx, f: Frame, len: number, width: number, bend = 0.2) {
  const { pal, rng } = c
  const center = catmull([[0, 0], [bend * len * 0.3, len * 0.5], [bend * len * 0.1 + rng.range(-0.01, 0.01), len]], 8)
  const leaf = ribbon(center, (t) => width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.9), false)
  wash(c, f, leaf, rng.chance(0.75) ? pal.green : pal.leaf)
  contour(c, f, leaf, 0.0012)
  vein(c, f, center.slice(1, -2), 0.00085)
  // side veins, very fine
  if (pal.contour === 'gold' && len > 0.02) {
    for (const t of [0.3, 0.5, 0.7]) {
      const { p, d } = along(center, t)
      for (const s of [-1, 1]) {
        const w = width * 0.32 * Math.sin(Math.PI * t)
        vein(c, f, [p, [p[0] + d[0] * w * 0.9 - s * d[1] * w, p[1] + d[1] * w * 0.9 + s * d[0] * w]], 0.0006)
      }
    }
  }
}

function stem(c: Ctx, f: Frame, path: Pt[], w0: number, w1: number) {
  const center = catmull(path, 12)
  const poly = ribbon(center, (t) => w0 + (w1 - w0) * t)
  f.fill('paint', poly, c.pal.green, { alpha: 0.95 })
}

function bud(c: Ctx, f: Frame, color?: string) {
  const { pal, rng } = c
  const body: Pt[] = [
    ...cubic([0, 0.05], [-0.3, 0.1], [-0.28, 0.6], [0, rng.range(0.95, 1.05)], 14),
    ...cubic([0, 1], [0.28, 0.6], [0.3, 0.1], [0, 0.05], 14).slice(1),
  ]
  const col = color ?? rng.pick([pal.cobalt, pal.blue, pal.accent])
  wash(c, f, body, col, col === pal.accent ? accentLayer(c) : 'paint')
  const cal: Pt[] = [[-0.2, 0.1], [-0.28, 0.32], [-0.08, 0.2], [0, 0.34], [0.08, 0.2], [0.28, 0.32], [0.2, 0.1], [0, 0]]
  wash(c, f, cal, pal.green)
  contour(c, f, body)
}

/** Stem hung with little bells, like a hyacinth spray. */
function hyacinth(c: Ctx, f: Frame, len: number) {
  const { pal, rng } = c
  const spine = catmull([[0, 0], [rng.range(-0.02, 0.02), len * 0.5], [0, len]], 10)
  stem(c, f, spine, 0.006, 0.003)
  const bells = rng.int(5, 7)
  for (let i = 0; i < bells; i++) {
    const t = 0.25 + (i / (bells - 1)) * 0.72
    const { p } = along(spine, t)
    const s = i % 2 ? 1 : -1
    const size = 0.03 * (1 - t * 0.3)
    const b = f.child(p[0] + s * 0.012, p[1], s * 1.1 + Math.PI, size)
    const bell: Pt[] = [
      ...cubic([-0.12, 0], [-0.36, 0.2], [-0.42, 0.7], [-0.46, 1.0], 10),
      [-0.3, 0.94], [-0.15, 1.06], [0, 0.95], [0.15, 1.06], [0.3, 0.94],
      ...cubic([0.46, 1.0], [0.42, 0.7], [0.36, 0.2], [0.12, 0], 10),
    ]
    const col = i % 2 ? pal.cobalt : pal.blue
    wash(c, b, bell, col)
    contour(c, b, bell, 0.0011)
  }
}

/** Small round-petalled rosette, for bands and fillers. */
function rosette(c: Ctx, f: Frame, petal: string, heart: string, n = 6, layer: LayerName = 'paint', outline = true) {
  const { rng } = c
  const rot = rng.range(0, TAU)
  const petals: Pt[][] = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    const pp = circle(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.36, 18, rng, 0.05)
    petals.push(pp)
    f.fill(layer, pp, petal, { alpha: 0.96 })
  }
  const h = circle(0, 0, 0.3, 18, rng, 0.05)
  f.fill(layer, h, heart)
  if (outline && c.pal.contour === 'gold') {
    for (const pp of petals) f.outline('gold', pp, GOLD, 0.001 / f.scale)
  }
}

// ------------------------------------------------------------- compositions

/** One bouquet: stems rising from a root, a big blossom, flanking flowers and saz leaves. */
function bouquet(c: Ctx, f: Frame, W: number, H: number) {
  const { rng } = c
  const S = Math.min(W * 0.9, H)
  const mir = rng.chance(0.5)
  const g = mir ? f.child(0, 0, 0, 1, true) : f

  // saz leaves sweep low from the root
  saz(c, g, [[-0.01, 0.03 * H], [-0.16 * W, 0.08 * H], [-0.36 * W, 0.18 * H], [-0.48 * W, rng.range(0.36, 0.44) * H]], 0.13 * S)
  saz(c, g.child(0, 0, 0, 1, true), [[-0.01, 0.03 * H], [-0.14 * W, 0.1 * H], [-0.3 * W, 0.2 * H], [-0.42 * W, rng.range(0.3, 0.36) * H]], 0.11 * S)

  // main stem, S-curved
  const top = rng.range(0.6, 0.66) * H
  const main: Pt[] = [[0, 0.02 * H], [-0.04 * W, 0.22 * H], [0.03 * W, 0.42 * H], [0, top]]
  const mainC = catmull(main, 12)
  stem(c, g, main, 0.012, 0.007)

  // side branches
  const lp = along(mainC, 0.38).p
  const rp = along(mainC, 0.3).p
  const lEnd: Pt = [-0.28 * W, rng.range(0.36, 0.42) * H]
  const rEnd: Pt = [0.28 * W, rng.range(0.36, 0.44) * H]
  stem(c, g, [lp, [lp[0] - 0.08 * W, lp[1] + 0.06 * H], [lEnd[0] + 0.04 * W, lEnd[1] - 0.03 * H], lEnd], 0.008, 0.006)
  stem(c, g, [rp, [rp[0] + 0.08 * W, rp[1] + 0.04 * H], [rEnd[0] - 0.05 * W, rEnd[1] - 0.04 * H], rEnd], 0.008, 0.006)

  // upper sprays
  const up = along(mainC, 0.7).p
  const lt: Pt = [-0.1 * W, rng.range(0.88, 0.93) * H]
  const rt: Pt = [0.2 * W, rng.range(0.8, 0.88) * H]
  stem(c, g, [up, [up[0] - 0.06 * W, up[1] + 0.08 * H], [lt[0] + 0.02 * W, lt[1] - 0.08 * H], lt], 0.006, 0.0045)
  stem(c, g, [up, [up[0] + 0.06 * W, up[1] + 0.06 * H], [rt[0] - 0.02 * W, rt[1] - 0.1 * H], rt], 0.006, 0.0045)

  // leaves along the stems
  for (const [t, s] of [[0.18, -1], [0.26, 1], [0.52, -1]] as const) {
    const { p, d } = along(mainC, t)
    const ang = Math.atan2(d[1], d[0]) - Math.PI / 2 + s * rng.range(0.7, 1.0)
    smallLeaf(c, g.child(p[0], p[1], ang, 1), 0.2 * S, 0.066 * S, s * 0.4)
  }

  // flowers
  const left = rng.chance(0.5) ? carnation : tulip
  const right = left === carnation ? tulip : carnation
  left(c, g.child(lEnd[0], lEnd[1], 0.42, 0.38 * S))
  right(c, g.child(rEnd[0], rEnd[1], -0.42, 0.4 * S))
  if (rng.chance(0.5)) hyacinth(c, g.child(lt[0], lt[1] - 0.06 * H, 0.25, 1.5), 0.16 * S)
  else cornflower(c, g.child(lt[0], lt[1], 0, 0.13 * S))
  bud(c, g.child(rt[0], rt[1], -0.35, 0.21 * S))
  cornflower(c, g.child(0, top + 0.03 * H, 0, 0.27 * S))

  // fine tendrils curling off the stems into the white ground
  const tendrils = rng.int(3, 5)
  for (let i = 0; i < tendrils; i++) {
    const src = rng.pick([mainC, catmull([lp, lEnd], 4), catmull([rp, rEnd], 4)])
    const { p, d } = along(src, rng.range(0.25, 0.75))
    const s = rng.chance(0.5) ? 1 : -1
    const ang = Math.atan2(d[1], d[0]) - Math.PI / 2 + s * rng.range(0.6, 1.1)
    tendril(c, g.child(p[0], p[1], ang, 1, s < 0), 0.2 * S * rng.range(0.85, 1.2), 1)
  }
}

/** Filler between bouquets: a small sprig with a rosette. */
function sprig(c: Ctx, f: Frame, H: number, S: number) {
  const { pal, rng } = c
  const y0 = rng.range(0.66, 0.74) * H
  stem(c, f, [[0, y0 - 0.2 * H], [0.01, y0 - 0.08 * H], [0, y0]], 0.006, 0.004)
  smallLeaf(c, f.child(0, y0 - 0.16 * H, -0.8, 1), 0.12 * S, 0.042 * S, 0.3)
  smallLeaf(c, f.child(0, y0 - 0.1 * H, 0.8, 1), 0.12 * S, 0.042 * S, -0.3)
  rosette(c, f.child(0, y0 + 0.03 * H, 0, 0.1 * S), pal.blue, pal.field ? pal.turq : pal.cobalt, rng.pick([5, 6]))
}

/** Tall spray for a narrow neck: stem, paired leaves, a blossom and a crowning flower. */
function neckSpray(c: Ctx, f: Frame, W: number, H: number) {
  const { rng } = c
  const S = Math.min(W * 0.95, H * 0.5)
  const top = rng.range(0.56, 0.6) * H
  const sway = rng.range(-0.1, 0.1) * W
  const path: Pt[] = [[0, 0.02 * H], [sway, 0.25 * H], [-sway, 0.45 * H], [0, top]]
  const spine = catmull(path, 12)
  stem(c, f, path, 0.009, 0.0055)
  for (let i = 0; i < 5; i++) {
    const t = 0.08 + i * 0.15
    const { p, d } = along(spine, t)
    const s = i % 2 ? 1 : -1
    const ang = Math.atan2(d[1], d[0]) - Math.PI / 2 + s * rng.range(0.7, 0.95)
    smallLeaf(c, f.child(p[0], p[1], ang, 1), 0.46 * S * (1 - i * 0.08), 0.15 * S, s * 0.35)
  }
  // side branch with a blossom
  const bp = along(spine, 0.42).p
  const side = rng.chance(0.5) ? 1 : -1
  const bEnd: Pt = [bp[0] + side * 0.3 * W, bp[1] + 0.12 * H]
  stem(c, f, [bp, [bp[0] + side * 0.15 * W, bp[1] + 0.02 * H], bEnd], 0.006, 0.0045)
  cornflower(c, f.child(bEnd[0], bEnd[1], 0, 0.22 * S))
  const flower = rng.pick([tulip, tulip, carnation])
  flower(c, f.child(0, top - 0.02 * H, 0, 0.92 * S))
}

/** A scrolling vine that wraps the whole piece: waves of stem with blossoms on the crests. */
function vine(c: Ctx, from: number, to: number) {
  const { p, rng } = c
  const h = to - from
  const mid = (from + to) / 2
  const circ = p.circumference(mid)
  const n = Math.max(4, Math.round(circ / Math.max(0.2, h * 1.5)))
  const lambda = circ / n
  const A = h * 0.2
  const offset = rng.range(0, TAU)
  for (let i = 0; i < n; i++) {
    const r = rng.fork()
    const cc = { ...c, rng: r }
    const f = p.frame(offset + (i / n) * TAU, 0, mid)
    const wave: Pt[] = []
    for (let k = 0; k <= 24; k++) {
      const x = (k / 24) * lambda
      wave.push([x, A * Math.sin((x / lambda) * TAU)])
    }
    stem(cc, f, wave, 0.008, 0.008)
    // leaves either side of each crest
    for (const [x0, s] of [[0.1, 1], [0.4, -1], [0.6, -1], [0.9, 1]] as const) {
      const x = x0 * lambda
      const y = A * Math.sin(x0 * TAU)
      const slope = Math.atan2(A * TAU * Math.cos(x0 * TAU), lambda)
      smallLeaf(cc, f.child(x, y, slope + (s > 0 ? 0.9 : -0.9 + Math.PI) - Math.PI / 2, 1), h * 0.36, h * 0.12, s * 0.3)
    }
    // blossom on the crest, bud in the trough, each sized to stay inside the band
    const pick = r.int(0, 2)
    const tilt = r.range(-0.2, 0.2)
    fitIn(
      cc,
      (c2, k) => {
        const crest = f.child(lambda * 0.25, A, 0, k)
        if (pick === 0) cornflower(c2, crest.child(0, h * 0.17, 0, h * 0.27))
        else if (pick === 1) tulip(c2, crest.child(0, -h * 0.02, tilt, h * 0.56))
        else carnation(c2, crest.child(0, -h * 0.02, tilt, h * 0.54))
      },
      under(to - 0.004, mid + A),
    )
    const hang = r.range(-0.3, 0.3)
    fitIn(cc, (c2, k) => bud(c2, f.child(lambda * 0.75, -A, Math.PI + hang, h * 0.3 * k)), over(from + 0.004, mid - A))
    rosette(cc, f.child(lambda * 0.75, A * 0.9, 0, h * 0.07), c.pal.blue, c.pal.field ? c.pal.turq : c.pal.cobalt, 5)
  }
}

// -------------------------------------------------------------------- bands

function bandLines(c: Ctx, from: number, to: number) {
  const { p, pal, rng } = c
  const gold = pal.contour === 'gold'
  p.ring(gold ? 'gold' : 'paint', from + 0.0022, gold ? GOLD : pal.dark, 0.0016, rng)
  p.ring(gold ? 'gold' : 'paint', to - 0.0022, gold ? GOLD : pal.dark, 0.0016, rng)
}

/**
 * A jewel-like rosette for the collars: pointed outer petals with a pale
 * stripe, round inner petals, and a gilded heart ringed with dots.
 */
function jewelRosette(c: Ctx, f: Frame, petals = 8) {
  const { pal, rng } = c
  const gold = pal.contour === 'gold'
  const rot = rng.range(0, TAU)
  const outer: Pt[][] = []
  for (let i = 0; i < petals; i++) {
    const a = rot + (i / petals) * TAU
    const petal = transform(catmull([[-0.12, 0.3], [-0.2, 0.65], [0, 1.0], [0.2, 0.65], [0.12, 0.3]], 5), 0, 0, a - Math.PI / 2)
    f.fill('paint', petal, pal.bandInk, { alpha: 0.97, pool: { color: shade(pal.bandInk, -0.4), width: 0.0012, alpha: 0.4 } })
    f.line('paint', transform([[0, 0.36], [0, 0.82]], 0, 0, a - Math.PI / 2), pal.petalLight, 0.0008 / f.scale, { alpha: 0.85 })
    outer.push(petal)
  }
  for (let i = 0; i < petals; i++) {
    const a = rot + ((i + 0.5) / petals) * TAU
    const pp = circle(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.16, 12)
    f.fill('paint', pp, pal.id === 'midnight' ? pal.turq : pal.pale, { alpha: 0.95 })
  }
  const heart = circle(0, 0, 0.3, 20)
  f.fill('paint', heart, pal.id === 'midnight' ? pal.bandMotif : pal.cobalt)
  if (gold) {
    for (const pt of outer) f.outline('gold', pt, GOLD, 0.0008 / f.scale)
    f.outline('gold', heart, GOLD, 0.0009 / f.scale)
    f.fill('gold', circle(0, 0, 0.1, 10), GOLD)
    for (let i = 0; i < petals; i++) {
      const a = rot + ((i + 0.5) / petals) * TAU
      f.fill('gold', circle(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.045, 8), GOLD)
    }
  } else {
    for (const pt of outer) f.outline('paint', pt, pal.dark, 0.0007 / f.scale, 0.8)
    f.fill(accentLayer(c), circle(0, 0, 0.14, 10), pal.accent)
  }
}

/** A narrow rule of small reserved dots just inside a band edge. */
function dotRule(c: Ctx, y: number, size: number) {
  const { p, pal } = c
  const circ = p.circumference(y)
  const n = Math.round(circ / (size * 3.2))
  for (let i = 0; i < n; i++) {
    p.frame((i / n) * TAU, 0, y).fill('paint', circle(0, 0, size * 0.5, 8), pal.bandMotif, { alpha: 0.95 })
  }
}

/** Cobalt collar with reserved lozenges, each holding a rosette. */
function latticeBand(c: Ctx, z: Zone) {
  const { p, pal, rng } = c
  const mid = (z.from + z.to) / 2
  const h = z.to - z.from
  p.band('paint', z.from, z.to, pal.bandGround, 0.97)
  const circ = p.circumference(mid)
  const n = Math.max(6, Math.round(circ / (h * 1.2)))
  const hw = circ / n / 2
  const inset = h * 0.1
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, mid)
    const dia: Pt[] = [
      [0, h / 2 - inset],
      [hw * 0.92, 0],
      [0, -h / 2 + inset],
      [-hw * 0.92, 0],
    ]
    const soft = catmull(dia, 3, true)
    f.fill('paint', soft, '#000', { erase: true })
    if (pal.id === 'midnight') f.fill('paint', soft, pal.bandGround, { alpha: 1 })
    jewelRosette(c, f.child(0, 0, 0, Math.min(h * 0.5 - inset, hw * 0.92) * 0.62))
    // small leaves tucked into the side points of the lozenge
    for (const s of [-1, 1]) {
      const lf = transform(catmull([[0, 0], [-0.2, 0.5], [0, 1], [0.2, 0.5]], 4, true), s * hw * 0.84, 0, s * Math.PI / 2, h * 0.12)
      f.fill('paint', lf, pal.green, { alpha: 0.95 })
      if (pal.contour === 'gold') f.outline('gold', lf, GOLD, 0.0007)
    }
    if (pal.contour === 'gold') {
      f.outline('gold', dia, GOLD, 0.0015)
      f.outline('gold', catmull(dia.map(([x, y]) => [x * 0.9, y * 0.88] as Pt), 3, true), GOLD, 0.0007)
    } else f.outline('paint', dia, pal.dark, 0.0011)
    // a white trefoil and a gold dot in each cobalt triangle between lozenges
    const tf = p.frame(((i + 0.5) / n) * TAU, 0, mid)
    for (const y of [h * 0.27, -h * 0.27]) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + (y > 0 ? Math.PI / 2 : -Math.PI / 2)
        tf.fill('paint', circle(Math.cos(a) * h * 0.045, y + Math.sin(a) * h * 0.045, h * 0.04, 10, rng, 0.08), pal.bandMotif, { alpha: 0.95 })
      }
      if (pal.contour === 'gold') tf.fill('gold', circle(0, y, h * 0.022, 8), GOLD)
    }
  }
  dotRule(c, z.from + h * 0.06, h * 0.03)
  dotRule(c, z.to - h * 0.06, h * 0.03)
  bandLines(c, z.from, z.to)
}

/** Shoulder band: a chain of reserved medallions linked by gold knots. */
function medallionBand(c: Ctx, z: Zone) {
  const { p, pal, rng } = c
  const mid = (z.from + z.to) / 2
  const h = z.to - z.from
  p.band('paint', z.from, z.to, pal.bandGround, 0.97)
  const circ = p.circumference(mid)
  const n = Math.max(6, Math.round(circ / (h * 1.35)))
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, mid)
    const r = h * 0.36
    const disc = circle(0, 0, r, 36, rng, 0.02)
    f.fill('paint', disc, '#000', { erase: true })
    if (pal.id === 'midnight') f.fill('paint', disc, pal.bandGround)
    jewelRosette(c, f.child(0, 0, 0, r * 0.84), rng.pick([8, 10]))
    if (pal.contour === 'gold') {
      f.outline('gold', disc, GOLD, 0.0015)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU
        f.fill('gold', circle(Math.cos(a) * r * 1.14, Math.sin(a) * r * 1.14, h * 0.018, 8), GOLD)
      }
    } else f.outline('paint', disc, pal.dark, 0.0011)
    const k = p.frame(((i + 0.5) / n) * TAU, 0, mid)
    const knot: Pt[] = [[0, h * 0.2], [h * 0.12, 0], [0, -h * 0.2], [-h * 0.12, 0]]
    if (pal.contour === 'gold') k.fill('gold', knot, GOLD)
    else k.fill(accentLayer(c), knot, pal.accent)
  }
  bandLines(c, z.from, z.to)
}

/** A short neck gets a light chain of rosettes and gold dots on the white glaze. */
function rosetteChain(c: Ctx, z: Zone) {
  const { p, pal } = c
  const h = z.to - z.from
  const mid = (z.from + z.to) / 2
  const circ = p.circumference(mid)
  const n = Math.max(8, Math.round(circ / (h * 1.1)))
  if (pal.field) p.band('paint', z.from, z.to, pal.field, 1)
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, mid)
    rosette(c, f.child(0, 0, 0, h * 0.28), pal.blue, pal.field ? pal.turq : pal.cobalt, 6)
    const d = p.frame(((i + 0.5) / n) * TAU, 0, mid)
    const leafL = f.child(0, 0, 0, 1)
    void leafL
    if (pal.contour === 'gold') d.fill('gold', circle(0, 0, h * 0.06, 12), GOLD)
    else d.fill(accentLayer(c), circle(0, 0, h * 0.06, 12), pal.accent)
    smallLeaf(c, d.child(-h * 0.08, -h * 0.02, 1.5, 1), h * 0.3, h * 0.12, 0.3)
    smallLeaf(c, d.child(h * 0.08, -h * 0.02, -1.5, 1), h * 0.3, h * 0.12, -0.3)
  }
  bandLines(c, z.from, z.to)
}

/** Low band above the foot: small arches pointing up into the body. */
function arcadeBand(c: Ctx, z: Zone) {
  const { p, pal, rng } = c
  const h = z.to - z.from
  const mid = (z.from + z.to) / 2
  const circ = p.circumference(mid)
  const n = Math.max(10, Math.round(circ / (h * 0.9)))
  const base = z.from + h * 0.18
  p.band('paint', z.from, base, pal.field ?? pal.cobalt, 0.95)
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, base)
    const w = (circ / n) * 0.42
    const arch: Pt[] = [[-w, 0], ...cubic([-w, 0], [-w, h * 0.55], [w, h * 0.55], [w, 0], 12), [w, 0]]
    f.fill('paint', arch, pal.field ? pal.turq : pal.blue, { alpha: 0.9 })
    f.fill('paint', circle(0, h * 0.6, h * 0.07, 10, rng, 0.1), pal.field ? pal.pale : pal.cobalt)
    if (pal.contour === 'gold') f.outline('gold', arch, GOLD, 0.0011)
  }
  const gold = pal.contour === 'gold'
  p.ring(gold ? 'gold' : 'paint', z.to - 0.002, gold ? GOLD : pal.dark, 0.0014, rng)
}

const IKAROS_MATERIAL = {
  groundGloss: 0.97,
  paintGloss: 0.95,
  paintRelief: 0.06,
  goldGloss: 0.8,
  goldRelief: 0.35,
  overGloss: 0.9,
  overRelief: 0.45,
  pigmentNoise: 0.06,
  paintBlur: 0.9,
}

/** Iznik-style wall plate: a bouquet rising in the well, a medallion ring, a lattice rim. */
function paintPlate(c: Ctx, zone: (r: Zone['role']) => Zone | undefined) {
  const { p, pal, rng } = c
  const well = zone('body')!
  const cav = zone('shoulder')!
  const rimBand = zone('collar')!
  const edge = zone('rim')!
  if (pal.field) p.band('paint', 0, well.to, pal.field, 1)
  p.clip(0, well.to - 0.002)
  // a narrower spread than on a vessel wall, so the saz leaves curl inside
  // the round well instead of forcing the whole bouquet to shrink
  const W = well.to * 1.55
  const H = well.to * 1.82
  fitIn(c, (cc, k) => bouquet(cc, p.flat(0, -well.to * 0.9, 0, k), W, H), inside(well.to * 0.955))
  // small sprays tucked into the lower corners of the well
  for (const s of [-1, 1]) {
    fitIn(c, (cc, k) => sprig(cc, p.flat(s * well.to * 0.62, -well.to * 0.5, -s * 0.5, k).child(0, -0.12), 0.2, 0.2), inside(well.to * 0.955))
  }
  // fillers stay inside the well: keep them a spray's height back from the edge
  fillGaps(c, 0.03, well.to - 0.02, { sprays: 7, rosettes: 10, size: 0.05 })
  p.unclip()
  const gold = pal.contour === 'gold'
  p.ring(gold ? 'gold' : 'paint', well.to, gold ? GOLD : pal.dark, 0.0022, rng)
  medallionBand(c, cav)
  if (pal.field) p.band('paint', cav.to, rimBand.from, pal.field, 1)
  latticeBand(c, rimBand)
  p.band('gold', edge.from, edge.to, GOLD)
}

// --------------------------------------------------------------------- main

/**
 * A low-resolution look at what has been painted so far, so small ornaments
 * can be tucked into bare ground without landing on anything.
 */
class Probe {
  readonly w = 512
  readonly h: number
  readonly data: Uint8ClampedArray
  private field: [number, number, number] | null
  private c: Ctx

  constructor(c: Ctx) {
    this.c = c
    const { p, pal } = c
    this.h = Math.round((this.w * p.height) / p.width)
    const probe = document.createElement('canvas')
    probe.width = this.w
    probe.height = this.h
    const pc = probe.getContext('2d', { willReadFrequently: true })!
    pc.drawImage(p.layers.paint, 0, 0, this.w, this.h)
    pc.drawImage(p.layers.over, 0, 0, this.w, this.h)
    pc.drawImage(p.layers.gold, 0, 0, this.w, this.h)
    this.data = pc.getImageData(0, 0, this.w, this.h).data
    if (pal.field) {
      const n = parseInt(pal.field.slice(1), 16)
      this.field = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    } else this.field = null
  }

  private centre(theta: number, y: number): [number, number] {
    const { p } = this.c
    if (p.mode === 'disc') return [(0.5 + y * Math.cos(theta)) * this.w, (0.5 - y * Math.sin(theta)) * this.h]
    return [(((theta / TAU) % 1) + 1) % 1 * this.w, (1 - y) * this.h]
  }

  private radius(y: number, r: number): [number, number] {
    const { p } = this.c
    if (p.mode === 'disc') return [r * this.w, r * this.h]
    return [(r / (TAU * p.R(y))) * this.w, r * this.h]
  }

  private each(theta: number, y: number, r: number, fn: (i: number) => boolean | void) {
    const [cx, cy] = this.centre(theta, y)
    const [rx, ry] = this.radius(y, r)
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        if ((dx * dx) / (rx * rx + 0.01) + (dy * dy) / (ry * ry + 0.01) > 1) continue
        let x = Math.round(cx + dx)
        const yy = Math.round(cy + dy)
        if (yy < 0 || yy >= this.h) return false
        if (this.c.p.mode === 'wall') x = ((x % this.w) + this.w) % this.w
        else if (x < 0 || x >= this.w) return false
        if (fn((yy * this.w + x) * 4) === false) return false
      }
    }
    return true
  }

  empty(theta: number, y: number, r: number) {
    const d = this.data
    const fld = this.field
    return this.each(theta, y, r, (i) => {
      if (d[i + 3] < 10) return true
      if (fld && Math.abs(d[i] - fld[0]) + Math.abs(d[i + 1] - fld[1]) + Math.abs(d[i + 2] - fld[2]) < 40) return true
      return false
    })
  }

  mark(theta: number, y: number, r: number) {
    this.each(theta, y, r, (i) => {
      this.data[i] = this.data[i + 1] = this.data[i + 2] = 1
      this.data[i + 3] = 255
    })
  }
}

/** Scatter tiny gold trios into the empty ground of a zone. */
function goldDust(c: Ctx, from: number, to: number, count: number, probe = new Probe(c)) {
  const { p, pal, rng } = c
  if (pal.contour !== 'gold') return
  let placed = 0
  for (let t = 0; t < count * 14 && placed < count; t++) {
    const y = rng.range(from + 0.01, to - 0.01)
    const theta = rng.range(0, TAU)
    if (!probe.empty(theta, y, 0.008)) continue
    probe.mark(theta, y, 0.006)
    const f = p.frame(theta, 0, y, rng.range(0, TAU), 0.0035)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU
      f.fill('gold', circle(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.42, 10), GOLD)
    }
    placed++
  }
}

/** A little spray for filling gaps: a curved stem, a pair of leaves, a bud or small blossom, a tendril. */
function miniSpray(c: Ctx, f: Frame, s: number) {
  const { rng } = c
  const bend = rng.range(-0.25, 0.25)
  const path: Pt[] = [[0, -s * 0.9], [bend * s, -s * 0.2], [0, s * 0.35]]
  stem(c, f, path, 0.0045, 0.0032)
  const sp = catmull(path, 8)
  for (const [t, side] of [[0.3, -1], [0.55, 1]] as const) {
    const { p, d } = along(sp, t)
    smallLeaf(c, f.child(p[0], p[1], Math.atan2(d[1], d[0]) - Math.PI / 2 + side * 0.9), s * 0.62, s * 0.22, side * 0.35)
  }
  const top = sp[sp.length - 1]
  const kind = rng.int(0, 3)
  if (kind === 0) tulip(c, f.child(top[0], top[1] - s * 0.05, rng.range(-0.25, 0.25), s * 0.85))
  else if (kind === 1) cornflower(c, f.child(top[0], top[1] + s * 0.3, 0, s * 0.34))
  else if (kind === 2) bud(c, f.child(top[0], top[1], rng.range(-0.3, 0.3), s * 0.5))
  else carnation(c, f.child(top[0], top[1] - s * 0.05, rng.range(-0.2, 0.2), s * 0.8))
  const { p, d } = along(sp, 0.45)
  const side = rng.chance(0.5) ? 1 : -1
  tendril(c, f.child(p[0], p[1], Math.atan2(d[1], d[0]) - Math.PI / 2 + side * 1.1, 1, side < 0), s * 0.9, 1)
}

/** Fill the bare ground of a zone with small sprays and rosettes, as a painter finishes a piece. */
function fillGaps(c: Ctx, from: number, to: number, opts: { sprays: number; rosettes: number; size: number }) {
  const { p, pal, rng } = c
  const probe = new Probe(c)
  let placed = 0
  for (let t = 0; t < opts.sprays * 60 && placed < opts.sprays; t++) {
    // try large first, settle for smaller as the ground fills
    const s = opts.size * rng.range(0.75, 1.05) * (t > opts.sprays * 30 ? 0.72 : 1)
    const y = rng.range(from + s * 1.0, to - s * 1.4)
    const theta = rng.range(0, TAU)
    if (!probe.empty(theta, y, s * 0.82)) continue
    probe.mark(theta, y, s * 0.95)
    // on a plate the sprays stand upright like the bouquet, not radially
    const frame =
      p.mode === 'disc'
        ? p.flat(y * Math.cos(theta), y * Math.sin(theta), rng.range(-0.3, 0.3))
        : p.frame(theta, 0, y, rng.range(-0.3, 0.3))
    miniSpray({ ...c, rng: rng.fork() }, frame, s)
    placed++
  }
  placed = 0
  for (let t = 0; t < opts.rosettes * 30 && placed < opts.rosettes; t++) {
    const r = opts.size * rng.range(0.28, 0.38)
    const y = rng.range(from + r * 1.5, to - r * 1.5)
    const theta = rng.range(0, TAU)
    if (!probe.empty(theta, y, r * 1.5)) continue
    probe.mark(theta, y, r * 1.6)
    const f = p.frame(theta, 0, y)
    rosette(c, f.child(0, 0, 0, r), rng.chance(0.5) ? pal.blue : pal.pale, pal.field ? pal.turq : pal.cobalt, rng.pick([5, 6]))
    if (pal.contour === 'gold') f.fill('gold', circle(0, 0, r * 0.14, 10), GOLD)
    placed++
  }
  goldDust(c, from, to, Math.round(opts.sprays * 3), probe)
}

export function paintIkaros(p: Painter, zones: Zone[], paletteId: IkarosPaletteId, seed: number) {
  const pal = IKAROS_PALETTES[paletteId]
  const rng = new Rng(seed)
  const c: Ctx = { p, pal, rng }
  p.ground(pal.ground, 'rgba(214, 205, 186, 1)', 0.28, 0.008)

  const zone = (role: Zone['role']) => zones.find((z) => z.role === role)

  if (p.mode === 'disc') {
    paintPlate(c, zone)
    return p.finish(IKAROS_MATERIAL)
  }

  // midnight grounds the painted fields in cobalt
  if (pal.field) {
    for (const z of zones) {
      if (z.role === 'body' || z.role === 'neck' || z.role === 'base') p.band('paint', z.from, z.to, pal.field, 1)
    }
    // soft cobalt between the bands and the fields too
    const body = zone('body')
    const shoulder = zone('shoulder')
    if (body && shoulder) p.band('paint', body.to, shoulder.from, pal.field, 1)
  }

  const body = zone('body')
  if (body) {
    p.clip(body.from, body.to + 0.004)
    const full = body.to - body.from
    // bouquets stay at a natural size; a tall body gets a scrolling vine above them
    const H = Math.min(full, 0.37)
    const mid = body.from + H * 0.5
    const circ = p.circumference(mid)
    const n = Math.max(2, Math.round(circ / (H * 1.55)))
    const W = circ / n
    const offset = rng.range(0, TAU)
    for (let i = 0; i < n; i++) {
      const theta = offset + (i / n) * TAU
      fitIn(c, (cc, k) => bouquet(cc, p.frame(theta, 0, body.from, 0, k), W, H), under(body.to - 0.006, body.from))
    }
    for (let i = 0; i < n; i++) {
      const theta = offset + ((i + 0.5) / n) * TAU
      fitIn(c, (cc, k) => sprig(cc, p.frame(theta, 0, body.from, 0, k), H, Math.min(W, H)), under(body.to - 0.006, body.from))
    }
    if (full - H > 0.07) vine({ ...c, rng: rng.fork() }, body.from + H + 0.01, body.to - 0.008)
    p.unclip()
    fillGaps(c, body.from + 0.005, body.to - 0.004, { sprays: 14, rosettes: 16, size: 0.07 })
  }

  const neck = zone('neck')
  if (neck && neck.to - neck.from < 0.1) {
    rosetteChain(c, neck)
  } else if (neck) {
    p.clip(neck.from - 0.004, neck.to + 0.002)
    const H = neck.to - neck.from
    const circ = p.circumference(neck.from + H * 0.6)
    const n = Math.max(3, Math.round(circ / 0.2))
    const W = circ / n
    const offset = rng.range(0, TAU)
    for (let i = 0; i < n; i++) {
      const theta = offset + (i / n) * TAU
      fitIn(c, (cc, k) => neckSpray(cc, p.frame(theta, 0, neck.from, 0, k), W, H), under(neck.to - 0.005, neck.from))
    }
    fillGaps(c, neck.from + 0.004, neck.to - 0.004, { sprays: 6, rosettes: 9, size: 0.052 })
    p.unclip()
  }

  const base = zone('base')
  if (base) arcadeBand(c, base)
  const shoulder = zone('shoulder')
  if (shoulder) medallionBand(c, shoulder)
  const collar = zone('collar')
  if (collar) latticeBand(c, collar)

  // gold foot and rim
  const foot = zone('foot')
  if (foot) p.band('gold', foot.from, foot.to, GOLD)
  const rim = zone('rim')
  if (rim) p.band('gold', rim.from, 1, GOLD)
  if (pal.contour !== 'gold') {
    // Lindos pieces keep gold to the edges only; add a cobalt line under the rim
    if (rim) p.ring('paint', rim.from - 0.004, pal.cobalt, 0.003, rng)
  }

  return p.finish(IKAROS_MATERIAL)

}
