// Ikaros folk ware: the everyday Rhodian pottery with black outlines.
// Leaping deer with yellow antlers, galleys on turquoise water, brick-red
// flowers with blue hearts, green leaf sprays and red dots scattered through
// every gap. Borders of green dashes and red dots, blue wave scrolls on rims.
//
// Everything here is drawn in millimetres at the piece's real size, so a mug
// and a plate get the same brush weight.

import {
  type Frame,
  type Pt,
  Painter,
  Rng,
  TAU,
  along,
  lengths,
  catmull,
  circle,
  cubic,
  ribbon,
  transform,
  jitterPts,
  shade,
} from './painter.js'
import type { Shape, Zone } from './shapes.js'

export const FOLK = {
  ground: '#f5f2ea',
  ink: '#191816',
  red: '#a8432b',
  redDeep: '#8c3321',
  green: '#2f7f55',
  greenLight: '#4c9a6a',
  blue: '#4058bd',
  blueDeep: '#243a9a',
  lilac: '#6e76cf',
  sea: '#58b8c0',
  seaDeep: '#2f8f9c',
  grey: '#9a9b96',
  greyDeep: '#5a5b57',
  yellow: '#d8c24a',
  hull: '#8a4a2b',
}

type C = {
  p: Painter
  rng: Rng
  /** Wall units per millimetre. */
  U: number
  /** Ornament size: bigger pieces carry bigger flowers, though not proportionally. */
  k: number
}

const INK = 0.62 // mm, the black contour

// ---------------------------------------------------------------- brush kit

function wash(f: Frame, pts: Pt[], color: string, alpha = 0.95) {
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
  const size = Math.min(maxX - minX, maxY - minY)
  f.fill('paint', pts, color, {
    alpha,
    edge: '#2a2a28',
    edgeWidth: 0.0008,
    edgeAlpha: 0.12,
    pool: { color: shade(color, -0.32), width: Math.min(0.0026, size * 0.14), alpha: 0.4 },
    grain: { angle: NaN, color: shade(color, 0.3), alpha: 0.16 },
  })
}

function ink(f: Frame, pts: Pt[], w = INK) {
  f.outline('paint', pts, FOLK.ink, w, 0.95)
}

function inkLine(f: Frame, pts: Pt[], w = INK, alpha = 0.95) {
  f.line('paint', pts, FOLK.ink, w, { alpha })
}

function shape(f: Frame, pts: Pt[], color: string, w = INK) {
  wash(f, pts, color)
  ink(f, pts, w)
}

function dot(f: Frame, x: number, y: number, r: number, color: string, outline = false) {
  const d = circle(x, y, r, 14)
  f.fill('paint', d, color, { alpha: 0.95 })
  if (outline) ink(f, d, INK * 0.7)
}

/** A leaf with a black midrib: the basic unit of every spray. */
function leaf(c: C, f: Frame, len: number, width: number, bend = 0.25, color = FOLK.green) {
  const { rng } = c
  const center = catmull([[0, 0], [bend * len * 0.3, len * 0.5], [bend * len * 0.05 + rng.range(-0.3, 0.3), len]], 8)
  const poly = ribbon(center, (t) => width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.85), false)
  shape(f, poly, color)
  inkLine(f, center.slice(1, -3), INK * 0.6)
}

function stem(f: Frame, pts: Pt[], w = 1.1) {
  const c = catmull(pts, 10)
  f.fill('paint', ribbon(c, (t) => w * (1 - t * 0.35)), FOLK.green, { alpha: 0.95 })
  inkLine(f, c, INK * 0.55, 0.8)
}

// ----------------------------------------------------------------- flowers

/** Round red flower with a blue heart, face on. Radius in mm. */
function redFlower(c: C, f: Frame, r: number) {
  const { rng } = c
  const n = rng.pick([6, 7, 8])
  const rot = rng.range(0, TAU)
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    const w = (TAU * r * 0.55) / n
    const petal: Pt[] = transform(
      [...catmull([[-w * 0.35, r * 0.25], [-w * 0.75, r * 0.7], [0, r * 1.02], [w * 0.75, r * 0.7], [w * 0.35, r * 0.25]], 5)],
      0,
      0,
      a - Math.PI / 2,
    )
    shape(f, jitterPts(petal, rng, r * 0.03), rng.chance(0.8) ? FOLK.red : FOLK.redDeep, INK * 0.8)
    inkLine(f, transform([[0, r * 0.35], [0, r * 0.62]], 0, 0, a - Math.PI / 2), INK * 0.5, 0.7)
  }
  const heart = circle(0, 0, r * 0.33, 18, rng, 0.06)
  shape(f, heart, rng.chance(0.7) ? FOLK.blue : FOLK.lilac, INK * 0.8)
  dot(f, 0, 0, r * 0.1, FOLK.ink)
}

/** Small blue floret: four or five round petals. */
function floret(c: C, f: Frame, r: number, color = FOLK.lilac) {
  const { rng } = c
  const n = rng.pick([4, 5])
  const rot = rng.range(0, TAU)
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    const pp = circle(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.45, 12, rng, 0.08)
    shape(f, pp, color, INK * 0.6)
  }
  dot(f, 0, 0, r * 0.2, FOLK.red)
}

/** Side-view carnation in blue with a red tongue, the way the jug handle side shows it. */
function carnation(c: C, f: Frame, h: number) {
  const { rng } = c
  const lobes = 5
  const pivot: Pt = [0, h * 0.3]
  const order = [0, 4, 1, 3, 2]
  for (const i of order) {
    const k = i / (lobes - 1) - 0.5
    const ang = k * 2.1
    const len = h * (0.66 - Math.abs(k) * 0.24)
    const w = h * (0.14 + (0.5 - Math.abs(k)) * 0.05)
    const lobe: Pt[] = [[-h * 0.03, 0], ...catmull([[-h * 0.04, h * 0.05], [-w * 0.8, len * 0.55], [-w, len * 0.86]], 5)]
    for (let j = 0; j <= 6; j++) {
      const x = -w + (2 * w * j) / 6
      lobe.push([x, len * 0.86 + (j % 2 ? len * 0.13 * rng.vary(1, 0.2) : len * 0.02)])
    }
    lobe.push(...catmull([[w, len * 0.86], [w * 0.8, len * 0.55], [h * 0.04, h * 0.05]], 5), [h * 0.03, 0])
    const poly = transform(lobe, pivot[0], pivot[1], -ang)
    shape(f, poly, i === 2 ? FOLK.blueDeep : FOLK.blue, INK * 0.8)
    inkLine(f, transform([[0, h * 0.08], [0, len * 0.7]], pivot[0], pivot[1], -ang), INK * 0.5, 0.75)
  }
  // red tongue in the middle
  const tongue = transform(catmull([[-h * 0.06, h * 0.05], [-h * 0.07, h * 0.3], [0, h * 0.5], [h * 0.07, h * 0.3], [h * 0.06, h * 0.05]], 5), pivot[0], pivot[1])
  shape(f, tongue, FOLK.red, INK * 0.7)
  const cal: Pt[] = catmull([[-h * 0.1, 0], [-h * 0.16, h * 0.18], [-h * 0.2, h * 0.34], [0, h * 0.28], [h * 0.2, h * 0.34], [h * 0.16, h * 0.18], [h * 0.1, 0]], 4)
  shape(f, cal, FOLK.green, INK * 0.8)
}

/**
 * Big red carnation, face on, as the plates show it: a ring of long toothed
 * petals over a shorter inner ring, round a blue heart. Radius in mm.
 */
function carnationHead(c: C, f: Frame, r: number) {
  const { rng } = c
  // blue sepals often peek out from behind one side of the head
  if (rng.chance(0.45)) {
    const a = rng.range(0, TAU)
    for (const s of [-0.45, 0, 0.45]) {
      const g = f.child(0, 0, a + s * rng.vary(1, 0.2))
      shape(g, catmull([[-r * 0.16, 0], [-r * 0.2, r * 0.7], [0, r * rng.range(1.12, 1.25)], [r * 0.2, r * 0.7], [r * 0.16, 0]], 4), FOLK.blue, INK * 0.7)
    }
  }
  const n = rng.int(8, 10)
  const rot = rng.range(0, TAU)
  for (const [ring, len] of [[0, 1], [0.5, 0.64]] as const) {
    for (let i = 0; i < n; i++) {
      const a = rot + ((i + ring) / n) * TAU - Math.PI / 2
      const l = r * len * rng.vary(1, 0.07)
      // broad enough that neighbours overlap into one solid red disc
      const w = ((TAU * l * 0.65) / n) * 1.3
      const petal: Pt[] = [
        ...catmull([[-w * 0.18, r * 0.1], [-w * 0.5, l * 0.5], [-w * 0.5, l * 0.84]], 4),
        [-w * 0.36, l * 0.97],
        [-w * 0.2, l * 0.9],
        [-w * 0.08, l * 1.01],
        [w * 0.06, l * 0.92],
        [w * 0.2, l * 1.0],
        [w * 0.34, l * 0.9],
        [w * 0.46, l * 0.95],
        ...catmull([[w * 0.5, l * 0.84], [w * 0.5, l * 0.5], [w * 0.18, r * 0.1]], 4),
      ]
      const g = f.child(0, 0, a)
      shape(g, jitterPts(petal, rng, r * 0.02), ring ? FOLK.redDeep : rng.chance(0.8) ? FOLK.red : FOLK.redDeep, INK * 0.75)
      g.line('paint', [[0, l * 0.35], [rng.range(-0.15, 0.15) * w, l * 0.8]], shade(FOLK.redDeep, -0.3), 0.55, { alpha: 0.45 })
    }
  }
  shape(f, circle(0, 0, r * 0.24, 18, rng, 0.08), rng.chance(0.75) ? FOLK.blue : FOLK.redDeep, INK * 0.8)
  dot(f, 0, 0, r * 0.08, FOLK.ink)
}

/** Blue flower of five pointed petals round a red eye, the small flower of the plates. */
function blueFlower(c: C, f: Frame, r: number) {
  const { rng } = c
  const n = 5
  const rot = rng.range(0, TAU)
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU * rng.vary(1, 0.04)
    const l = r * rng.vary(1, 0.12)
    const petal = catmull([[-r * 0.1, r * 0.1], [-r * 0.36, l * 0.55], [-r * 0.12, l * 0.94], [0, l], [r * 0.24, l * 0.86], [r * 0.32, l * 0.45], [r * 0.1, r * 0.1]], 3)
    shape(f.child(0, 0, a), petal, rng.chance(0.8) ? FOLK.blue : FOLK.blueDeep, INK * 0.6)
  }
  dot(f, 0, 0, r * 0.24, FOLK.red, true)
}

/** Red tulip, side view. */
function tulip(c: C, f: Frame, h: number) {
  const { rng } = c
  const fl = rng.range(0.3, 0.4)
  const side = (s: number): Pt[] => [
    ...cubic([0.02 * s * h, 0.04 * h], [0.3 * s * h, 0.12 * h], [fl * s * h, 0.5 * h], [fl * 1.05 * s * h, 0.98 * h], 14),
    ...cubic([fl * 1.05 * s * h, 0.98 * h], [0.2 * s * h, 0.72 * h], [0.12 * s * h, 0.4 * h], [0.02 * s * h, 0.2 * h], 12),
  ]
  shape(f, side(-1), FOLK.red, INK * 0.8)
  shape(f, side(1), FOLK.red, INK * 0.8)
  const centre: Pt[] = [
    ...cubic([0, 0.02 * h], [-0.24 * h, 0.05 * h], [-0.26 * h, 0.5 * h], [0, rng.range(0.9, 1.0) * h], 16),
    ...cubic([0, 0.95 * h], [0.26 * h, 0.5 * h], [0.24 * h, 0.05 * h], [0, 0.02 * h], 16).slice(1),
  ]
  shape(f, centre, rng.chance(0.5) ? FOLK.blue : FOLK.redDeep, INK * 0.8)
  inkLine(f, cubic([0, 0.12 * h], [-0.05 * h, 0.4 * h], [-0.04 * h, 0.6 * h], [0, 0.8 * h], 8), INK * 0.5, 0.7)
}

/** Feathery green leaf spray with a black spine. */
function leafSpray(c: C, f: Frame, len: number) {
  const { rng } = c
  const spine = catmull([[0, 0], [rng.range(-0.1, 0.1) * len, len * 0.5], [rng.range(-0.15, 0.15) * len, len]], 10)
  stem(f, spine, 1)
  const n = rng.int(4, 6)
  for (let i = 0; i < n; i++) {
    const t = 0.2 + (i / n) * 0.75
    const { p, d } = along(spine, t)
    for (const s of [-1, 1]) {
      if (i === n - 1 && s === 1) continue
      const ang = Math.atan2(d[1], d[0]) - Math.PI / 2 + s * rng.range(0.6, 0.9)
      leaf(c, f.child(p[0], p[1], ang), len * 0.34 * (1 - t * 0.4), len * 0.1, s * 0.3, rng.chance(0.3) ? FOLK.greenLight : FOLK.green)
    }
  }
  const tip = along(spine, 1)
  leaf(c, f.child(tip.p[0], tip.p[1], Math.atan2(tip.d[1], tip.d[0]) - Math.PI / 2), len * 0.3, len * 0.1, 0)
}

/** A flower on its stem with a pair of leaves. `h` is the sprig height in mm. */
function flowerSprig(c: C, f: Frame, h: number) {
  const { rng } = c
  const kind = rng.pick(['red', 'red', 'red', 'carnation', 'tulip', 'floret'] as const)
  const top: Pt = [rng.range(-0.08, 0.08) * h, h * 0.62]
  const path: Pt[] = [[0, 0], [rng.range(-0.1, 0.1) * h, h * 0.3], top]
  stem(f, path)
  const sp = catmull(path, 8)
  for (const [t, s] of [[0.35, -1], [0.5, 1]] as const) {
    const { p, d } = along(sp, t)
    leaf(c, f.child(p[0], p[1], Math.atan2(d[1], d[0]) - Math.PI / 2 + s * 0.85), h * 0.32, h * 0.11, s * 0.3)
  }
  if (kind === 'red') redFlower(c, f.child(top[0], top[1] + h * 0.14), h * 0.2)
  else if (kind === 'carnation') carnation(c, f.child(top[0], top[1] - h * 0.02), h * 0.42)
  else if (kind === 'tulip') tulip(c, f.child(top[0], top[1] - h * 0.02), h * 0.4)
  else floret(c, f.child(top[0], top[1] + h * 0.08), h * 0.12)
}

// ------------------------------------------------------------------- figures

/** A leg with a knee: widths taper through the joint like a real limb. */
function jointed(pts: Pt[], widths: number[]) {
  const c = catmull(pts, 10)
  return ribbon(c, (t) => {
    const f = t * (widths.length - 1)
    const i = Math.min(widths.length - 2, Math.floor(f))
    const k = f - i
    return widths[i] + (widths[i + 1] - widths[i]) * k
  })
}

function hoof(f: Frame, pts: Pt[]) {
  const a = pts[pts.length - 2]
  const b = pts[pts.length - 1]
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  f.fill('paint', transform([[-0.6, -1.1], [2.4, -0.3], [2.1, 1.0], [-0.6, 1.1]], b[0], b[1], ang), FOLK.ink)
}

/**
 * Leaping deer, facing +x, about 88 mm from hind hoof to nose.
 * Built as one flowing silhouette for the body, neck and head, with jointed
 * legs slipped under it, a long ear and a holly-leaf antler behind.
 */
function deer(c: C, f: Frame) {
  const { rng } = c
  const g = FOLK.grey
  const gFar = shade(FOLK.grey, -0.2)
  const kick = rng.range(-1.5, 1.5)

  // far legs, darker, behind everything
  const farHind: Pt[] = [[-13, 21.5], [-24, 16], [-31, 14 + kick * 0.4], [-41, 11.5 + kick]]
  const farFront: Pt[] = [[10.5, 19.5], [18.5, 12.5], [24, 9], [30, 3.5]]
  shape(f, jointed(farHind, [7, 3.4, 2.5, 1.6]), gFar)
  shape(f, jointed(farFront, [4.8, 2.7, 2.2, 1.6]), gFar)
  hoof(f, farHind)
  hoof(f, farFront)

  // antler: a broad yellow blade with three holly points along its leading edge
  const antPath = catmull([[26.5, 45.5], [28.8, 52.5], [27.4, 59], [22, 64.5]], 12)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const { p, d } = along(antPath, t)
    const w = 3.3 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.05)), 0.75)
    const k = (t * 3.2 + 0.35) % 1
    const tooth = t > 0.14 && t < 0.92 ? 4.2 * Math.pow(k, 3) * (1 - t * 0.35) : 0
    left.push([p[0] - d[1] * w * 0.8, p[1] + d[0] * w * 0.8])
    right.push([p[0] + d[1] * (w + tooth), p[1] - d[0] * (w + tooth)])
  }
  shape(f, [...left, ...right.reverse()], FOLK.yellow, INK * 0.8)
  f.line('paint', antPath.slice(3, -4), shade(FOLK.yellow, -0.35), 0.5, { alpha: 0.8 })

  // near legs, stretched in the leap
  const nearHind: Pt[] = [[-14.5, 24], [-26.5, 19.5], [-33.5, 18.8 + kick * 0.3], [-44.5, 17.2 + kick * 0.6]]
  const nearFront: Pt[] = [[12, 21.5], [21, 15], [27, 11.5], [35.5, 7]]
  shape(f, jointed(nearHind, [8.6, 3.8, 2.7, 1.7]), g)
  shape(f, jointed(nearFront, [5.8, 3, 2.4, 1.7]), g)
  hoof(f, nearHind)
  hoof(f, nearFront)

  // tail flicked up from a high rump
  shape(f, catmull([[-18.8, 32], [-23.5, 36.2], [-21.8, 37.6], [-17.2, 33.6]], 5, true), g)

  // body, neck and head as one silhouette: compact, rump and shoulders raised for the leap
  const body = catmull(
    [
      [36, 40], [34, 42.3], [29.5, 45], [25.5, 46.2], [22, 44], [18.5, 39], [13.5, 33.6], [4, 31.4],
      [-5, 31.6], [-13.5, 33.6], [-19.5, 32.2], [-21.6, 27], [-19.6, 21.6], [-14.5, 18.6], [-5, 17.3],
      [5, 17.7], [12, 19.6], [16.5, 23.6], [21.5, 30], [25.5, 35.5], [28.8, 37.3], [33.2, 38.2],
    ],
    6,
    true,
  )
  shape(f, body, g)

  // the ear, long and laid back
  const ear = catmull([[24.2, 45.6], [19.5, 49.8], [15.4, 51.8], [18, 48.2], [21.8, 44.4]], 5, true)
  shape(f, ear, g, INK * 0.85)
  f.line('paint', catmull([[22.8, 45.4], [19.2, 48.6], [17, 50.2]], 5), FOLK.greyDeep, 0.5, { alpha: 0.8 })

  // pale belly and throat
  const belly: Pt[] = catmull([[-14, 19.4], [-5, 18.5], [5, 18.9], [11.6, 20.6], [6, 21.6], [-5, 21.2], [-12.5, 21.8]], 5, true)
  f.fill('paint', belly, '#e9e6de', { alpha: 0.75 })
  f.line('paint', catmull([[-15, 21.8], [-5, 21.3], [7, 21.8], [13.5, 22.8]], 6), FOLK.greyDeep, 0.45, { alpha: 0.7 })
  f.fill('paint', catmull([[17, 25], [21, 31], [25, 35.6], [22.6, 35], [18.6, 30], [15.6, 25.6]], 5, true), '#e9e6de', { alpha: 0.55 })

  // grey brush hatching: the painter's shading along the neck, flank and haunch
  const hatchLine = (pts: Pt[], w = 0.5, a = 0.72) => f.line('paint', catmull(pts, 5), FOLK.greyDeep, w, { alpha: a })
  for (let i = 0; i < 4; i++) {
    const t = i / 3
    const x = 15.5 + t * 6.5
    const y = 31 + t * 7.5
    hatchLine([[x - 1.6, y + 1.2], [x, y], [x + 1.2, y - 1.8]], 0.45, 0.6)
  }
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 3.6
    hatchLine([[x + 0.8, 29.6], [x - 0.4, 26.4], [x + 0.6, 23.2]], 0.5, 0.6)
  }
  hatchLine([[-11.5, 30.8], [-9, 25.5], [-12.4, 20.8]], 0.6, 0.8)
  hatchLine([[-16.5, 31], [-18.8, 26.5], [-17.2, 22]], 0.45, 0.55)
  hatchLine([[10.5, 31.5], [13, 26.5], [11, 21.2]], 0.55, 0.75)
  hatchLine([[-19.5, 21.8], [-26, 18.8], [-32.5, 18.4]], 0.4, 0.55)
  hatchLine([[15, 19.8], [21, 14.8], [26, 12]], 0.4, 0.55)

  // face: almond eye with a bright catchlight, brow, nostril, mouth
  const eye = catmull([[27, 41.6], [29.2, 43], [31.4, 41.8], [29.2, 40.4]], 5, true)
  f.fill('paint', eye, '#fbf8f1')
  ink(f, eye, INK * 0.6)
  dot(f, 29.4, 41.7, 0.95, FOLK.ink)
  dot(f, 29.75, 42.1, 0.28, '#fbf8f1')
  f.line('paint', catmull([[26.6, 43.4], [29, 44.6], [31.6, 43.4]], 4), FOLK.ink, 0.45, { alpha: 0.85 })
  dot(f, 34.9, 40.2, 0.55, FOLK.ink)
  inkLine(f, catmull([[35.3, 38.8], [33.6, 38.3], [32, 38.5]], 4), INK * 0.5)
  // white spots along the flank, as painted on the Ikaros mugs
  for (let i = 0; i < 4; i++) {
    f.fill('paint', circle(-6 + i * 4.8 + rng.range(-0.8, 0.8), 27.2 + rng.range(-0.8, 0.8), 0.75, 8), '#efece5', { alpha: 0.85 })
  }
}

/** A galley under sail on turquoise water. About 70 mm wide. */
function ship(c: C, f: Frame) {
  const { rng } = c
  // sea: a turquoise swell with rows of wave crests, little fish and foam flowers
  const sea: Pt[] = []
  for (let i = 0; i <= 48; i++) {
    const t = i / 48
    sea.push([-38 + t * 76, 1.5 + Math.sin(t * TAU * 3.5 + 0.4) * 1.4])
  }
  sea.push(...catmull([[38, 1.5], [35, -8], [18, -13.5], [0, -14.5], [-18, -13.5], [-35, -8], [-38, 1.5]], 8))
  f.fill('paint', sea, FOLK.sea, { alpha: 0.9, pool: { color: FOLK.seaDeep, width: 0.0012, alpha: 0.35 } })
  f.line('paint', sea.slice(0, 49), FOLK.seaDeep, 0.8, { alpha: 0.95 })
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 7; i++) {
      const x = -30 + i * 10 + (row ? 5 : 0) + rng.range(-1, 1)
      const y = -4 - row * 4.5
      f.line('paint', catmull([[x - 3, y], [x - 1, y + 1.6], [x + 1.2, y + 1.3], [x + 1.6, y + 0.2]], 5), FOLK.seaDeep, 0.6, { alpha: 0.85 })
    }
  }
  for (let i = 0; i < 3; i++) {
    const x = -22 + i * 20 + rng.range(-3, 3)
    const y = -9.5 + rng.range(-1, 1)
    const fish = catmull([[x - 3, y], [x, y + 1.3], [x + 2.6, y + 0.2], [x, y - 1.2]], 5, true)
    f.fill('paint', fish, '#fbf8f1', { alpha: 0.95 })
    f.fill('paint', [[x - 2.8, y], [x - 4.6, y + 1.2], [x - 4.6, y - 1.2]], '#fbf8f1', { alpha: 0.95 })
    dot(f, x + 1.3, y + 0.25, 0.3, FOLK.seaDeep)
  }
  for (let i = 0; i < 5; i++) {
    const x = -28 + i * 13 + rng.range(-2, 2)
    const y = -2.5 + rng.range(-1, 1)
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + 0.3
      f.fill('paint', circle(x + Math.cos(a) * 0.9, y + Math.sin(a) * 0.9, 0.75, 10), '#fbf8f1', { alpha: 0.95 })
    }
  }
  // oars
  for (let i = 0; i < 8; i++) {
    const x = -18 + i * 5.2
    const oar = jointed([[x, 7], [x - 2.4, 0.5], [x - 3.2, -2.5], [x - 4.2, -6.5]], [1, 1, 1.6, 2])
    shape(f, oar, FOLK.yellow, INK * 0.45)
  }
  // hull, rising to a curled stern and a beaked prow
  const hull: Pt[] = [
    ...cubic([-31, 16], [-26, 10], [-20, 11], [-14, 11], 8),
    ...cubic([-14, 11], [0, 11], [14, 11], [22, 11.5], 8),
    ...cubic([22, 11.5], [27, 12], [30, 15], [33, 19], 8),
    ...cubic([33, 19], [31, 12], [28, 7.5], [36, 5.5], 8),
    ...cubic([36, 5.5], [26, 3.5], [16, 3], [4, 3], 8),
    ...cubic([4, 3], [-12, 3], [-24, 5], [-31, 16], 10),
  ]
  shape(f, hull, FOLK.hull)
  // planking and a red wale
  f.line('paint', cubic([-27, 10], [-10, 7.8], [12, 7.8], [29, 11.5], 16), FOLK.red, 1.3, { alpha: 0.9 })
  f.line('paint', cubic([-24, 6.8], [-8, 5.2], [12, 5.2], [26, 7.5], 16), shade(FOLK.hull, -0.35), 0.45, { alpha: 0.8 })
  for (let i = 0; i < 8; i++) dot(f, -18 + i * 5.2, 7.2, 0.55, FOLK.ink)
  // shields along the rail
  for (let i = 0; i < 7; i++) {
    const x = -16 + i * 5.4
    const sh = circle(x, 12.8, 1.7, 14)
    f.fill('paint', sh, i % 2 ? FOLK.red : FOLK.blue, { alpha: 0.95 })
    ink(f, sh, INK * 0.5)
    dot(f, x, 12.8, 0.4, '#fbf8f1')
  }
  // the painted eye on the prow
  const pe = catmull([[26.5, 9], [28.2, 10.2], [30, 9.2], [28.2, 8.2]], 5, true)
  f.fill('paint', pe, '#fbf8f1')
  ink(f, pe, INK * 0.5)
  dot(f, 28.3, 9.2, 0.55, FOLK.ink)
  // stern curl in blue
  const curl: Pt[] = []
  for (let k = 0; k <= 28; k++) {
    const a = (k / 28) * TAU * 0.95
    const r = 4.2 * (1 - k / 34)
    curl.push([-29 - Math.cos(a) * r, 20 + Math.sin(a) * r])
  }
  f.line('paint', curl, FOLK.blue, 1.7)
  inkLine(f, curl, INK * 0.4, 0.6)
  // mast, yard, stays, crow's nest
  inkLine(f, [[1, 11], [1, 57]], 1.2)
  inkLine(f, [[1, 56], [-29, 16]], 0.4, 0.8)
  inkLine(f, [[1, 56], [33, 19]], 0.4, 0.8)
  shape(f, [[-1.6, 55], [3.6, 55], [3, 58], [-1, 58]], FOLK.hull, INK * 0.5)
  // square sail in bellied grey and white panels
  const top = (t: number): Pt => [-21 + t * 43, 51 + Math.sin(Math.PI * t) * 1.6]
  const bot = (t: number): Pt => [-18.5 + t * 41, 18 + Math.sin(Math.PI * t) * 2.2]
  const bulge = (y: number) => Math.sin(Math.PI * y) * 2.4
  const panels = 6
  for (let i = 0; i < panels; i++) {
    const t0 = i / panels
    const t1 = (i + 1) / panels
    const edge = (t: number): Pt[] => {
      const pts: Pt[] = []
      for (let k = 0; k <= 10; k++) {
        const y = k / 10
        const a = top(t)
        const b = bot(t)
        pts.push([a[0] + (b[0] - a[0]) * y + bulge(y) * (t - 0.5) * 2, a[1] + (b[1] - a[1]) * y])
      }
      return pts
    }
    const panel = [...edge(t0), ...edge(t1).reverse()]
    f.fill('paint', panel, i % 2 ? '#ebe8e0' : FOLK.grey, { alpha: 0.95 })
  }
  const outline: Pt[] = []
  for (let k = 0; k <= 12; k++) outline.push(top(k / 12))
  for (let k = 0; k <= 10; k++) {
    const y = k / 10
    const a = top(1)
    const b = bot(1)
    outline.push([a[0] + (b[0] - a[0]) * y + bulge(y), a[1] + (b[1] - a[1]) * y])
  }
  for (let k = 12; k >= 0; k--) outline.push(bot(k / 12))
  for (let k = 10; k >= 0; k--) {
    const y = k / 10
    const a = top(0)
    const b = bot(0)
    outline.push([a[0] + (b[0] - a[0]) * y - bulge(y), a[1] + (b[1] - a[1]) * y])
  }
  ink(f, outline, INK * 0.9)
  // reef lines across the sail
  for (const y of [0.33, 0.66]) {
    const pts: Pt[] = []
    for (let k = 0; k <= 12; k++) {
      const t = k / 12
      const a = top(t)
      const b = bot(t)
      pts.push([a[0] + (b[0] - a[0]) * y + bulge(y) * (t - 0.5) * 2, a[1] + (b[1] - a[1]) * y])
    }
    inkLine(f, pts, INK * 0.45, 0.7)
  }
  // swallow-tailed pennant
  shape(f, [[1, 58], [12, 60.5], [8.5, 61.4], [12, 62.6], [1, 62]], FOLK.red, INK * 0.6)
}

// -------------------------------------------------------------------- bands

/** Two black rules with green dashes and red dots between: the mug rim band. */
function dashBand(c: C, from: number, to: number) {
  const { p, rng, U } = c
  const h = to - from
  const mid = (from + to) / 2
  p.ring('paint', from + INK * U * 0.6, FOLK.ink, INK * 1.3 * U, rng)
  p.ring('paint', to - INK * U * 0.6, FOLK.ink, INK * 1.3 * U, rng)
  const hMm = h / U
  const circ = p.circumference(mid)
  const unit = Math.max(7, hMm * 0.95) * U
  const n = Math.max(12, Math.round(circ / unit))
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, mid, 0, U)
    const dh = hMm * 0.62
    const dash = transform(ribbon(catmull([[0, -dh / 2], [0.4, 0], [0, dh / 2]], 6), (t) => 2.1 * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.04))), 0, 0, -0.5)
    shape(f, dash, FOLK.green, INK * 0.55)
    const d = p.frame(((i + 0.5) / n) * TAU, 0, mid, 0, U)
    dot(d, 0, rng.range(-0.3, 0.3), Math.min(1.9, hMm * 0.16), FOLK.red)
  }
}

/** Blue scrolling waves with little white flowers, for rims and mug tops. */
function waveBand(c: C, from: number, to: number) {
  const { p, rng, U } = c
  const h = to - from
  const mid = (from + to) / 2
  const hMm = h / U
  const circ = p.circumference(mid)
  const n = Math.max(8, Math.round(circ / (h * 1.25)))
  const wMm = circ / n / U
  p.ring('paint', from + INK * U * 0.6, FOLK.ink, INK * 1.2 * U, rng)
  p.ring('paint', to - INK * U * 0.6, FOLK.ink, INK * 1.2 * U, rng)
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, from, 0, U)
    // a breaking wave: rises from the lower left, crests, and curls over
    const crest: Pt[] = [
      ...cubic([-wMm * 0.5, hMm * 0.08], [-wMm * 0.25, hMm * 0.2], [0, hMm * 0.95], [wMm * 0.32, hMm * 0.86], 14),
      ...cubic([wMm * 0.32, hMm * 0.86], [wMm * 0.5, hMm * 0.8], [wMm * 0.5, hMm * 0.5], [wMm * 0.3, hMm * 0.5], 10),
      ...cubic([wMm * 0.3, hMm * 0.5], [wMm * 0.2, hMm * 0.52], [wMm * 0.18, hMm * 0.66], [wMm * 0.08, hMm * 0.6], 8),
      ...cubic([wMm * 0.08, hMm * 0.6], [-wMm * 0.05, hMm * 0.4], [0, hMm * 0.15], [wMm * 0.2, hMm * 0.08], 10),
    ]
    shape(f, crest, rng.chance(0.2) ? FOLK.blueDeep : FOLK.blue, INK * 0.8)
    inkLine(f, cubic([-wMm * 0.35, hMm * 0.14], [-wMm * 0.15, hMm * 0.3], [0, hMm * 0.72], [wMm * 0.25, hMm * 0.78], 10), INK * 0.45, 0.55)
    // little white flower with a red heart in the trough
    const fl = f.child(-wMm * 0.3, hMm * 0.66, 0, 1)
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU
      const pp = circle(Math.cos(a) * hMm * 0.1, Math.sin(a) * hMm * 0.1, hMm * 0.075, 10)
      fl.fill('paint', pp, '#fbf8f1')
      ink(fl, pp, INK * 0.5)
    }
    dot(fl, 0, 0, hMm * 0.05, FOLK.red)
    // green sprig in the lower trough
    leaf(c, f.child(wMm * 0.36, hMm * 0.1, -0.5), hMm * 0.36, hMm * 0.13, 0.3)
  }
}

/** Row of red half-flowers sitting on the base line. */
function fanBand(c: C, from: number, to: number) {
  const { p, rng, U } = c
  const h = to - from
  const hMm = h / U
  const circ = p.circumference(from + h * 0.4)
  const n = Math.max(10, Math.round(circ / (h * 1.4)))
  p.ring('paint', from + INK * U, FOLK.ink, INK * 1.4 * U, rng)
  p.ring('paint', to - INK * U * 0.6, FOLK.ink, INK * 1.1 * U, rng)
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, from + INK * U * 1.6, 0, U)
    const r = hMm * 0.62
    const petals = 5
    for (let k = 0; k < petals; k++) {
      const a = Math.PI * (0.1 + (k / (petals - 1)) * 0.8)
      const pp = transform(catmull([[-r * 0.14, r * 0.1], [-r * 0.2, r * 0.75], [0, r], [r * 0.2, r * 0.75], [r * 0.14, r * 0.1]], 4), 0, 0, a - Math.PI / 2)
      shape(f, pp, k % 2 ? FOLK.redDeep : FOLK.red, INK * 0.6)
    }
    const heart: Pt[] = catmull([[-r * 0.3, 0], [-r * 0.25, r * 0.25], [0, r * 0.34], [r * 0.25, r * 0.25], [r * 0.3, 0]], 5)
    shape(f, heart, FOLK.blue, INK * 0.6)
    // leaves between the fans
    const g = p.frame(((i + 0.5) / n) * TAU, 0, from + INK * U * 1.6, 0, U)
    leaf(c, g.child(0, 0, 0.45), hMm * 0.55, hMm * 0.18, 0.3)
    leaf(c, g.child(0, 0, -0.45), hMm * 0.55, hMm * 0.18, -0.3)
  }
}

// Circles (mm, figure-local) that cover each figure, so fillers stay clear of it.
const DEER_SPACE: [number, number, number][] = [
  [-14, 25.5, 8], [-3, 25, 8], [8, 26, 8], [16, 30, 6.5], [21, 37.5, 6.5], [29, 42, 6.5], [35, 40, 3.5],
  [18, 50, 4], [24, 52, 5], [24, 59, 6], [28.5, 56, 5], [-28, 19, 5.5], [-38, 16.5, 4.5], [-45, 15.5, 3], [22, 14, 5.5],
  [30, 8.5, 4.5], [36, 6, 3], [-21, 35, 3.5],
]
const SHIP_SPACE: [number, number, number][] = [
  [-26, -4, 10], [-10, -5, 10], [8, -5, 10], [26, -4, 10], [-28, 16, 6], [-18, 10, 6.5], [-6, 10, 6.5],
  [6, 10, 6.5], [18, 10, 6.5], [30, 12, 6.5], [-12, 26, 9], [2, 26, 9], [15, 26, 9], [-12, 43, 9],
  [2, 43, 9], [15, 43, 9], [2, 57, 5], [9, 60, 3.5],
]

// ------------------------------------------------------------------ filling

type Spot = { x: number; y: number; z: number; r: number; hard: boolean }

/**
 * Places ornaments into the gaps of a field until it is full, like a folk
 * painter working around the main figure. Positions are tested in 3D so the
 * wrap-around seam and the plate's round well both just work.
 */
class Field {
  spots: Spot[] = []
  readonly c: C
  constructor(c: C) {
    this.c = c
  }
  pos(theta: number | null, x: number, y: number): [number, number, number] {
    const { p } = this.c
    if (theta === null) return [x, y, 0]
    if (p.mode === 'disc') {
      const a = theta + x / Math.max(0.002, y)
      return [y * Math.cos(a), y * Math.sin(a), 0]
    }
    const R = p.R(y)
    const a = theta + x / R
    return [R * Math.cos(a), y, R * Math.sin(a)]
  }
  free(theta: number | null, x: number, y: number, r: number, gap = 0) {
    const [px, py, pz] = this.pos(theta, x, y)
    for (const s of this.spots) {
      const d = Math.hypot(px - s.x, py - s.y, pz - s.z)
      // fillers may tuck under each other a little, never under the main figure
      if (d < r + s.r + (s.hard ? r * 0.05 : gap)) return false
    }
    return true
  }
  take(theta: number | null, x: number, y: number, r: number, hard = false) {
    const [px, py, pz] = this.pos(theta, x, y)
    this.spots.push({ x: px, y: py, z: pz, r, hard })
  }
  /** Reserve the space a figure occupies, given its frame. */
  reserve(f: Frame, circles: [number, number, number][]) {
    for (const [x, y, r] of circles) {
      const [px, py] = f.phys([x, y])
      this.take(f.theta, px, py, r * f.scale, true)
    }
  }
}

type Region =
  | { kind: 'band'; from: number; to: number }
  | { kind: 'disc'; radius: number }

function scatter(c: C, field: Field, region: Region, items: { r: number; tries: number; draw: (f: Frame, rMm: number) => void }[]) {
  const { p, rng, U, k } = c
  for (const item of items) {
    const rMm = item.r * k
    const r = rMm * U
    for (let t = 0; t < item.tries; t++) {
      let theta: number | null
      let y: number
      let x = 0
      if (region.kind === 'band') {
        if (region.to - region.from < r * 1.6) break
        theta = rng.range(0, TAU)
        y = rng.range(region.from + r * 1.0, region.to - r * 1.25)
      } else {
        theta = null
        const a = rng.range(0, TAU)
        const d = Math.sqrt(rng.next()) * (region.radius - r * 0.9)
        x = Math.cos(a) * d
        y = Math.sin(a) * d
      }
      // allow a little overlap: folk painters tuck leaves under flowers
      if (!field.free(theta, x, y, r, -r * 0.3)) continue
      field.take(theta, x, y, r)
      const f = theta === null ? p.flat(x, y, 0, U) : p.frame(theta, 0, y, 0, U)
      item.draw(f, rMm)
    }
  }
}

/** Fillers for the gaps round a figure. `density` multiplies how hard each is tried. */
function fillers(c: C, density = 1) {
  const { rng } = c
  const items = [
    { r: 13, tries: 200, draw: (f: Frame, r: number) => flowerSprig(c, f.child(0, -r * 0.95, rng.range(-0.35, 0.35)), r * 2.1) },
    { r: 11, tries: 200, draw: (f: Frame, r: number) => leafSpray(c, f.child(0, -r * 0.9, rng.range(-0.6, 0.6)), r * 1.9) },
    { r: 8.5, tries: 260, draw: (f: Frame, r: number) => redFlower(c, f, r * 0.85) },
    { r: 8, tries: 260, draw: (f: Frame, r: number) => flowerSprig(c, f.child(0, -r * 0.95, rng.range(-0.5, 0.5)), r * 2.1) },
    { r: 5.5, tries: 420, draw: (f: Frame, r: number) => (rng.chance(0.5) ? floret(c, f, r * 0.9) : leaf(c, f.child(0, -r * 0.8, rng.range(-1, 1)), r * 1.7, r * 0.6, 0.3)) },
    { r: 4, tries: 420, draw: (f: Frame, r: number) => {
      const a = rng.range(-0.6, 0.6)
      leaf(c, f.child(0, -r * 0.7, a - 0.5), r * 1.5, r * 0.55, 0.3)
      leaf(c, f.child(0, -r * 0.7, a + 0.5), r * 1.5, r * 0.55, -0.3)
    } },
    { r: 2.4, tries: 1000, draw: (f: Frame, r: number) => dot(f, 0, 0, r * rng.range(0.6, 0.78), FOLK.red, rng.chance(0.25)) },
  ]
  return items.map((item) => ({ ...item, tries: Math.round(item.tries * density) }))
}

/**
 * A plate's well, filled the way the Ikaros painters fill it: big red
 * carnations spread through the space, each on a long leafy stem, more stems
 * curling through what is left, then small flowers and red dots in every gap.
 * Stems grow a step at a time and turn aside when they meet the figure or
 * another motif, so they curl round whatever is already painted.
 * Works in millimetres from the plate's centre.
 */
function fillWell(c: C, field: Field, radiusMm: number) {
  const { p, rng, U, k } = c
  const f = p.flat(0, 0, 0, U)
  const step = 3.6 * k
  const clear = 2.8 * k
  const take = (x: number, y: number, r: number) => field.take(null, x * U, y * U, r * U)
  const room = (x: number, y: number, r: number, own: Pt[] = []) =>
    Math.hypot(x, y) + r < radiusMm &&
    field.free(null, x * U, y * U, r * U, 0) &&
    own.slice(0, -3).every(([ox, oy]) => Math.hypot(x - ox, y - oy) > r + clear)

  const grow = (start: Pt, dir: number, steps: number) => {
    const bend = curvature(rng)
    const turn = rng.chance(0.5) ? 1 : -1
    const path: Pt[] = [start]
    for (let i = 0; i < steps; i++) {
      dir += bend(i / steps) * 0.22
      const [x, y] = path[path.length - 1]
      let moved = false
      for (const t of [0, 1, -1, 2, -2, 3, -3]) {
        const d = dir + t * turn * 0.4
        const nx = x + Math.cos(d) * step
        const ny = y + Math.sin(d) * step
        if (room(nx, ny, clear, path)) {
          path.push([nx, ny])
          dir = d
          moved = true
          break
        }
      }
      if (!moved) break
    }
    return path
  }

  /** The stem and its leaves, reaching forward; leaves start `bare` mm along, clear of a flower at the root. */
  const stemWithLeaves = (path: Pt[], bare = 0) => {
    for (const [x, y] of path) take(x, y, 2.4 * k)
    const line = catmull(path, 6)
    const acc = lengths(line)
    const L = acc[acc.length - 1]
    shape(f, ribbon(line, (t) => (2.3 - t * 0.9) * k), FOLK.green, INK * 0.6)
    let side = rng.chance(0.5) ? 1 : -1
    for (let s = Math.max(bare, step * 0.8); s < L - step * 0.5; s += step * rng.range(1.5, 2.2)) {
      const { p: q, d } = along(line, s / L)
      const ang = Math.atan2(d[1], d[0]) - Math.PI / 2
      for (const sd of rng.chance(0.35) ? [-1, 1] : [side]) {
        const len = rng.range(9.5, 13) * k
        const g = f.child(q[0], q[1], ang + sd * rng.range(0.55, 0.9))
        leaf(c, g, len, len * 0.32, -sd * 0.4, rng.chance(0.25) ? FOLK.greenLight : FOLK.green)
        // keep just the leaf's own space, so dots can still fill in beside it
        for (const t of [0.35, 0.72]) {
          const [lx, ly] = g.phys([0, len * t])
          field.take(null, lx, ly, len * 0.2 * U)
        }
      }
      side = -side
    }
    return line
  }

  // big carnations first, spread through the well with room between for stems
  const big = 9.5 * k
  const heads: Pt[] = []
  for (let t = 0; t < 300; t++) {
    const a = rng.range(0, TAU)
    const d = Math.sqrt(rng.next()) * (radiusMm - big * 0.9)
    const x = Math.cos(a) * d
    const y = Math.sin(a) * d
    if (!field.free(null, x * U, y * U, big * U, clear * 4.2 * U)) continue
    heads.push([x, y])
    take(x, y, big)
  }
  // each on its own stem, painted before the flower so the head sits on top
  for (const [x, y] of heads) {
    let path: Pt[] = []
    for (let tries = 0; tries < 4 && path.length < 4; tries++) {
      const a = rng.range(0, TAU)
      const start: Pt = [x + Math.cos(a) * (big + clear + 0.5), y + Math.sin(a) * (big + clear + 0.5)]
      if (room(start[0], start[1], clear)) path = grow(start, a, rng.int(10, 26))
    }
    const up = path.length >= 4 ? Math.atan2(y - path[0][1], x - path[0][0]) - Math.PI / 2 : rng.range(0, TAU)
    if (path.length >= 4) stemWithLeaves([[x, y], ...path], big * 1.1)
    carnationHead(c, f.child(x, y, up), big * rng.vary(1, 0.06))
  }

  // free stems through what is left, each ending in a flower if there is room
  for (let v = 0; v < 60; v++) {
    const a0 = rng.range(0, TAU)
    const d0 = radiusMm * rng.range(0.4, 0.95)
    const start: Pt = [Math.cos(a0) * d0, Math.sin(a0) * d0]
    const dir = a0 + Math.PI + rng.range(-1.2, 1.2)
    const steps = rng.int(10, 28)
    if (!room(start[0], start[1], clear * 1.4)) continue
    const path = grow(start, dir, steps)
    if (path.length < 4) continue
    const line = catmull(path, 6)
    const tip = along(line, 1)
    const tipAng = Math.atan2(tip.d[1], tip.d[0]) - Math.PI / 2
    const small = 5.5 * k
    const hx = tip.p[0] + tip.d[0] * small * 0.85
    const hy = tip.p[1] + tip.d[1] * small * 0.85
    const flower = room(hx, hy, small * 0.8, path.slice(0, -2))
    if (flower) take(hx, hy, small)
    stemWithLeaves(path)
    const g = f.child(hx, hy, tipAng)
    if (!flower) leaf(c, f.child(tip.p[0], tip.p[1], tipAng), 8 * k, 2.6 * k, 0.2)
    else if (rng.chance(0.55)) blueFlower(c, g, small)
    else if (rng.chance(0.6)) carnation(c, g.child(0, -small * 0.8), small * 1.7)
    else redFlower(c, g, small * 0.9)
  }

  scatter(c, field, { kind: 'disc', radius: radiusMm * U }, [
    { r: 6, tries: 300, draw: (g: Frame, r: number) => (rng.chance(0.3) ? redFlower(c, g, r * 0.85) : carnation(c, g.child(0, -r * 0.8, rng.range(-0.6, 0.6)), r * 1.7)) },
    { r: 4.5, tries: 500, draw: (g: Frame, r: number) => blueFlower(c, g, r * 0.95) },
    { r: 3.4, tries: 150, draw: (g: Frame, r: number) => blueFlower(c, g, r) },
    { r: 4, tries: 400, draw: (g: Frame, r: number) => {
      const a = rng.range(0, TAU)
      leaf(c, g.child(0, 0, a - 0.4), r * 1.9, r * 0.6, 0.3)
      leaf(c, g.child(0, 0, a + 0.4), r * 1.9, r * 0.6, -0.3)
    } },
    { r: 1.9, tries: 2500, draw: (g: Frame, r: number) => dot(g, 0, 0, r * rng.range(0.85, 1.05), FOLK.red, rng.chance(0.2)) },
    { r: 1.4, tries: 1500, draw: (g: Frame, r: number) => dot(g, 0, 0, r * 0.95, FOLK.red) },
  ])
}

/** How hard a stem bends along its length, and which way: smooth, and sometimes changing direction. */
function curvature(rng: Rng) {
  const base = rng.range(-1, 1)
  const knots = [0, 1, 2, 3].map(() => base + rng.range(-0.8, 0.8))
  return (t: number) => {
    const x = Math.min(0.999, t) * 3
    const i = Math.floor(x)
    return knots[i] + (knots[i + 1] - knots[i]) * (x - i)
  }
}


// --------------------------------------------------------------------- main

export function paintFolk(p: Painter, shape: Shape, seed: number) {
  const rng = new Rng(seed * 31 + 7)
  const U = 1 / shape.sizeMm
  const c: C = { p, rng, U, k: Math.max(1, Math.pow(shape.sizeMm / 95, 0.42)) }
  p.ground(FOLK.ground, 'rgba(210, 202, 186, 1)', 0.25, 0.006)
  const zone = (role: Zone['role']) => shape.zones.find((z) => z.role === role)

  if (shape.kind === 'plate') paintPlate(c, shape)
  else paintVessel(c, shape, zone)

  return p.finish({
    groundGloss: 0.95,
    paintGloss: 0.93,
    paintRelief: 0.05,
    goldGloss: 0.8,
    goldRelief: 0.3,
    overGloss: 0.9,
    overRelief: 0.3,
    pigmentNoise: 0.09,
    paintBlur: 0.6,
  })
}

function paintVessel(c: C, shape: Shape, zone: (r: Zone['role']) => Zone | undefined) {
  const { p, rng, U } = c
  const field = new Field(c)
  const body = zone('body')
  if (body) {
    p.clip(body.from, body.to)
    const hMm = (body.to - body.from) / U
    const mid = body.from + (body.to - body.from) * 0.5
    // the main figures: front and back, clear of the handle
    const circ = p.circumference(mid) / U
    const count = Math.max(2, Math.min(4, Math.round(circ / 120)))
    const figScale = Math.min(1.3, (hMm * 0.84) / 64)
    const first = rng.chance(0.65) ? 'deer' : 'ship'
    for (let i = 0; i < count; i++) {
      const theta = Math.PI / 2 + (i / count) * TAU
      const kind = i % 2 === 0 ? first : first === 'deer' ? 'ship' : 'deer'
      const facing = rng.chance(0.5)
      // measure the figure, then size and centre it in the band so nothing is cut off
      const seedF = Math.floor(rng.next() * 4294967296)
      const drawFig = (fr: Frame) => (kind === 'deer' ? deer({ ...c, rng: new Rng(seedF) }, fr) : ship({ ...c, rng: new Rng(seedF) }, fr))
      const e = p.measure(() => drawFig(p.frame(theta, 0, 0, 0, U * figScale, facing)))
      const H = body.to - body.from
      const span = e.maxY - e.minY
      const k = Math.min(1, (H * 0.9) / span)
      const y = body.from + (H - span * k) / 2 - e.minY * k
      const f = p.frame(theta, 0, y, 0, U * figScale * k, facing)
      drawFig(f)
      field.reserve(f, kind === 'deer' ? DEER_SPACE : SHIP_SPACE)
    }
    for (const h of shape.handles) {
      // keep the painting from running under where the handle meets the wall
      field.take(0, 0, h.a[1], 0.05)
      field.take(0, 0, h.b[1], 0.05)
    }
    scatter(c, field, { kind: 'band', from: body.from, to: body.to }, fillers(c))
    p.unclip()
  }
  const neck = zone('neck')
  if (neck) {
    p.clip(neck.from, neck.to)
    scatter(c, new Field(c), { kind: 'band', from: neck.from, to: neck.to }, fillers(c))
    p.unclip()
  }
  const shoulder = zone('shoulder')
  if (shoulder) dashBand(c, shoulder.from, shoulder.to)
  const collar = zone('collar')
  if (collar) {
    if ((collar.to - collar.from) / U > 16) waveBand(c, collar.from, collar.to)
    else dashBand(c, collar.from, collar.to)
  }
  const base = zone('base')
  if (base) fanBand(c, base.from, base.to)
  const foot = zone('foot')
  if (foot) {
    p.ring('paint', foot.from + (foot.to - foot.from) * 0.35, FOLK.ink, INK * 1.6 * U, rng)
    p.ring('paint', foot.to - INK * U, FOLK.ink, INK * 1.2 * U, rng)
  }
  const rim = zone('rim')
  if (rim) {
    p.ring('paint', rim.to - 0.0025, FOLK.ink, INK * 2.6 * U, rng)
  }
}

function paintPlate(c: C, shape: Shape) {
  const { p, rng, U } = c
  // Ikaros deer plates give the picture most of the face: a wide well packed with
  // flowers, a double line, and one band of blue leaves round the rim.
  const well = { from: 0, to: 0.36 }
  const rimBand = { from: 0.372, to: 0.47 }
  const edge = shape.zones.find((z) => z.role === 'rim')!

  // centre: a big leaping deer (or a ship) among flowers
  const field = new Field(c)
  p.clip(0, well.to)
  const kind = rng.chance(0.7) ? 'deer' : 'ship'
  const s = (well.to * (kind === 'deer' ? 1.85 : 1.5)) / (kind === 'deer' ? 84 : 80) / U
  const flip = rng.chance(0.5)
  // centre the figure: the deer spans roughly x -46..38, y 2..64 in its own millimetres
  const f = p.flat(kind === 'deer' ? (flip ? -4 : 4) * s * U : 0, kind === 'deer' ? -32 * s * U : -0.075, 0, U * s, flip)
  const figure = { ...c, rng: rng.fork() }
  field.reserve(f, kind === 'deer' ? DEER_SPACE : SHIP_SPACE)
  fillWell(c, field, (well.to - 0.006) / U)
  // the figure goes on last, so leaves tucked in round it pass behind
  if (kind === 'deer') deer(figure, f)
  else ship(figure, f)
  p.unclip()
  p.ring('paint', well.to, FOLK.ink, INK * 1.6 * U, rng)
  p.ring('paint', well.to - 0.006, FOLK.ink, INK * 0.9 * U, rng)

  waveBand(c, rimBand.from, rimBand.to)
  p.band('paint', edge.from, edge.to, FOLK.blue, 0.95)
  p.ring('paint', edge.from, FOLK.ink, INK * 1.2 * U, rng)
}
