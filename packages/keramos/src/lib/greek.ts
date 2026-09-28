// Attic black-figure and red-figure.
//
// Black-figure: figures painted in black gloss on the orange clay, details
// scratched through the slip (incision), with added red and white.
// Red-figure: the reverse. The background is painted black and figures are
// left in the clay, with details drawn on in fine black relief lines.
//
// Both techniques share the same drawing code. `solid` paints black in
// black-figure and reserves clay in red-figure; `detail` incises in
// black-figure and draws black in red-figure.

import { type Frame, type Pt, Painter, Rng, TAU, along, catmull, circle, cubic, ribbon, transform, ellipse, wobble } from './painter.js'
import type { Shape, Zone } from './shapes.js'

export type GreekPaletteId = 'attic' | 'corinthian'

export type GreekPalette = {
  id: GreekPaletteId
  label: string
  clay: string
  clayMottle: string
  slip: string
  red: string
  white: string
}

export const GREEK_PALETTES: Record<GreekPaletteId, GreekPalette> = {
  attic: {
    id: 'attic',
    label: 'Attic',
    clay: '#8f4623',
    clayMottle: 'rgba(96, 40, 16, 1)',
    slip: '#120d0b',
    red: '#6a1f19',
    white: '#e9dfca',
  },
  corinthian: {
    id: 'corinthian',
    label: 'Corinthian',
    clay: '#c39360',
    clayMottle: 'rgba(160, 108, 60, 1)',
    slip: '#21150f',
    red: '#7a261d',
    white: '#efe6d2',
  },
}

type Mode = 'black' | 'red'

type G = {
  p: Painter
  pal: GreekPalette
  rng: Rng
  mode: Mode
}

// --------------------------------------------------------------- primitives

const INCISE = 0.0011
const RELIEF = 0.0012

/** The main figure colour: black gloss (BF) or reserved clay (RF). */
function solid(g: G, f: Frame, pts: Pt[]) {
  if (g.mode === 'black') f.fill('paint', pts, g.pal.slip)
  else f.fill('paint', pts, '#000', { erase: true })
}

/** Interior line: incised (BF) or relief line (RF). */
function detail(g: G, f: Frame, pts: Pt[], width = 1, dilute = false) {
  if (g.mode === 'black') f.line('paint', pts, '#000', (INCISE * width) / f.scale, { erase: true })
  else f.line('paint', pts, dilute ? '#5a3018' : g.pal.slip, (RELIEF * width) / f.scale, { alpha: dilute ? 0.55 : 1 })
}

/** Always black: hair, spears, patterns. */
function black(g: G, f: Frame, pts: Pt[]) {
  f.fill('paint', pts, g.pal.slip)
}

function blackLine(g: G, f: Frame, pts: Pt[], width: number) {
  f.line('paint', pts, g.pal.slip, width / f.scale)
}

function added(g: G, f: Frame, pts: Pt[], color: 'red' | 'white') {
  f.fill('over', pts, color === 'red' ? g.pal.red : g.pal.white, { alpha: 0.95 })
}

function limb(pts: Pt[], w0: number, w1: number, w2?: number): Pt[] {
  const c = catmull(pts, 8)
  const mid = w2 ?? (w0 + w1) / 2
  return ribbon(c, (t) => (t < 0.5 ? w0 + (mid - w0) * t * 2 : mid + (w1 - mid) * (t - 0.5) * 2))
}

// ------------------------------------------------------------------ figures
// Local units: feet at y = 0, top of head near y = 1, facing +x.

type Figure = (g: G, f: Frame) => void

const DILUTE = '#7b4a25'

/**
 * A figure part. Black-figure paints it black and, when it lies over another
 * part, scratches its outline through the slip. Red-figure reserves it and
 * draws a relief contour round it; because reserving erases what was there,
 * the contours of parts behind are cut away cleanly.
 */
function part(g: G, f: Frame, pts: Pt[], over = false) {
  solid(g, f, pts)
  if (g.mode === 'red') detail(g, f, [...pts, pts[0], pts[1]], 0.85)
  else if (over) detail(g, f, [...pts, pts[0], pts[1]], 0.8)
}

/** Diluted glaze line: the soft brown wash red-figure painters used for muscles and fine folds. */
function soft(g: G, f: Frame, pts: Pt[], width = 0.7) {
  if (g.mode === 'red') f.line('paint', pts, DILUTE, (RELIEF * width) / f.scale, { alpha: 0.55 })
  else detail(g, f, pts, width * 0.9)
}

/** Skin: white on black-figure women, clay on red-figure. */
function skin(g: G, f: Frame, pts: Pt[], female: boolean, over = false) {
  if (g.mode === 'black' && female) {
    added(g, f, pts, 'white')
    f.outline('over', pts, g.pal.slip, (INCISE * 0.8) / f.scale, 0.9)
  } else part(g, f, pts, over)
}

type HeadOpts = { female?: boolean; helmet?: boolean; beard?: boolean }

/** Profile head facing +x. (cx, cy) is the centre of the face, s the head height. */
function head(g: G, f: Frame, cx: number, cy: number, s: number, o: HeadOpts = {}) {
  const P = (pts: Pt[]) => pts.map(([x, y]) => [cx + x * s, cy + y * s] as Pt)
  const face = P(
    catmull(
      [
        [-0.2, -0.62], [-0.38, -0.2], [-0.4, 0.15], [-0.22, 0.44], [0.06, 0.52], [0.26, 0.38],
        [0.32, 0.16], [0.35, 0.08], [0.47, -0.07], [0.36, -0.1], [0.38, -0.17], [0.33, -0.21],
        [0.36, -0.27], [0.3, -0.33], [0.29, -0.43], [0.12, -0.47], [0.12, -0.66],
      ],
      4,
    ),
  )
  const neck: Pt[] = P([[0.14, -0.5], [0.12, -0.9], [-0.22, -0.9], [-0.2, -0.55]])
  if (o.helmet) {
    // Corinthian helmet: cranium, nose guard, cheek piece, eye opening
    const helm = P(catmull([[-0.24, -0.62], [-0.44, -0.15], [-0.36, 0.34], [0.02, 0.56], [0.3, 0.38], [0.36, 0.06], [0.48, -0.1], [0.38, -0.16], [0.34, -0.48], [0.1, -0.58]], 5, true))
    part(g, f, helm)
    part(g, f, neck)
    // eye hole and cheek-piece edge
    const hole = P(catmull([[0.12, 0.08], [0.3, 0.12], [0.33, 0.0], [0.2, -0.03]], 4, true))
    if (g.mode === 'red') black(g, f, hole)
    else f.fill('paint', hole, '#000', { erase: true })
    detail(g, f, P(catmull([[0.36, -0.14], [0.2, -0.2], [0.06, -0.5]], 5)), 0.8)
    detail(g, f, P(catmull([[-0.38, -0.05], [-0.1, -0.06], [0.1, 0.02]], 5)), 0.7)
    return
  }
  // the neck: filled, with contour lines down its sides only so it flows into the body
  if (g.mode === 'black' && o.female) added(g, f, neck, 'white')
  else solid(g, f, neck)
  if (g.mode === 'red' || o.female) {
    blackLine(g, f, P([[0.14, -0.5], [0.12, -0.88]]), RELIEF * 0.8)
    blackLine(g, f, P([[-0.2, -0.55], [-0.22, -0.88]]), RELIEF * 0.8)
  }
  skin(g, f, face, !!o.female)
  // hair: a black mass over the crown, with a reserved line where it meets the ground
  const hair = P(
    o.female
      ? catmull([[0.26, 0.4], [0.02, 0.58], [-0.34, 0.44], [-0.5, 0.05], [-0.62, -0.08], [-0.5, -0.3], [-0.28, -0.3], [-0.2, 0.02], [0.02, 0.2], [0.2, 0.26]], 5, true)
      : catmull([[0.26, 0.4], [0.0, 0.58], [-0.36, 0.42], [-0.44, 0.04], [-0.34, -0.38], [-0.18, -0.2], [-0.16, 0.08], [0.04, 0.22], [0.2, 0.26]], 5, true),
  )
  black(g, f, hair)
  if (g.mode === 'red') {
    f.line('paint', [...hair, hair[0]], '#000', (RELIEF * 0.4) / f.scale, { erase: true })
    // curls along the brow
    for (let i = 0; i < 4; i++) {
      const x = 0.16 - i * 0.1
      f.fill('paint', circle(cx + x * s, cy + (0.28 + i * 0.03) * s, 0.035 * s, 8), g.pal.slip)
    }
  } else {
    detail(g, f, P(catmull([[0.2, 0.3], [-0.05, 0.25], [-0.25, 0.05], [-0.28, -0.25]], 5)), 0.7)
  }
  if (!o.female && g.mode === 'black') {
    f.line('over', P(catmull([[0.22, 0.36], [0.0, 0.47], [-0.3, 0.32]], 5)), g.pal.red, (0.05 * s) / f.scale)
  }
  if (o.female) {
    // fillet band and a bun at the nape
    const band = P(catmull([[0.24, 0.34], [0.0, 0.46], [-0.3, 0.3]], 5))
    if (g.mode === 'black') f.line('over', band, g.pal.red, (0.05 * s) / f.scale)
    else f.line('paint', band, '#000', (0.045 * s) / f.scale, { erase: true })
  }
  if (o.beard) {
    const beard = P(catmull([[-0.1, -0.02], [-0.02, -0.3], [0.12, -0.44], [0.3, -0.52], [0.26, -0.36], [0.22, -0.24], [0.04, -0.2], [-0.04, -0.06]], 5, true))
    black(g, f, beard)
    if (g.mode === 'red') f.line('paint', [...beard, beard[0]], '#000', (RELIEF * 0.4) / f.scale, { erase: true })
  }
  // almond eye, pupil, ear, mouth
  const ink = (pts: Pt[], w = 0.8) => (g.mode === 'black' && !o.female ? detail(g, f, pts, w) : blackLine(g, f, pts, RELIEF * w))
  ink(P(catmull([[0.12, 0.1], [0.2, 0.15], [0.29, 0.1], [0.2, 0.06], [0.12, 0.1]], 4)))
  const pupil = circle(cx + 0.21 * s, cy + 0.1 * s, 0.028 * s, 8)
  if (g.mode === 'black' && !o.female) f.fill('paint', pupil, '#000', { erase: true })
  else black(g, f, pupil)
  ink(P(catmull([[0.26, 0.2], [0.18, 0.24], [0.1, 0.21]], 4)), 0.6)
  if (!o.female || g.mode === 'red') ink(P(catmull([[-0.08, 0.06], [-0.14, -0.02], [-0.1, -0.12], [-0.04, -0.08]], 4)), 0.6)
  ink(P([[0.36, -0.2], [0.29, -0.2]]), 0.6)
}

/** Nude torso with anatomy: collarbone, pectorals, the pack of the abdomen, the hip line. */
function torsoAnatomy(g: G, f: Frame, x0: number, y0: number, s: number) {
  const P = (pts: Pt[]) => catmull(pts.map(([x, y]) => [x0 + x * s, y0 + y * s] as Pt), 5)
  soft(g, f, P([[-0.5, 0.95], [-0.1, 0.9], [0.4, 0.95]]))
  soft(g, f, P([[-0.4, 0.8], [-0.2, 0.62], [0.05, 0.66]]))
  soft(g, f, P([[0.05, 0.66], [0.3, 0.6], [0.5, 0.78]]))
  soft(g, f, P([[0.02, 0.62], [0.0, 0.3], [0.02, 0.05]]))
  for (const y of [0.48, 0.33, 0.19]) soft(g, f, P([[-0.26, y + 0.02], [0.02, y], [0.28, y + 0.02]]), 0.55)
  soft(g, f, P([[-0.48, 0.1], [-0.2, -0.05], [0.0, -0.1]]))
  soft(g, f, P([[0.48, 0.1], [0.2, -0.05], [0.0, -0.1]]))
}

const hoplite: Figure = (g, f) => {
  const { rng } = g
  const lunge = rng.range(0.9, 1.1)
  // spear behind everything
  blackLine(g, f, [[-0.34, 0.9], [0.5, 0.66 * lunge]], 0.004 * f.scale)
  black(g, f, transform([[0, -0.018], [0.07, 0], [0, 0.018], [-0.01, 0]], 0.5, 0.66 * lunge, Math.atan2(0.66 * lunge - 0.9, 0.84)))
  const back = limb([[-0.02, 0.5], [-0.12, 0.27], [-0.21 * lunge, 0.035]], 0.085, 0.034, 0.055)
  const front = limb([[0.04, 0.5], [0.15 * lunge, 0.28], [0.19 * lunge, 0.035]], 0.085, 0.034, 0.055)
  part(g, f, back)
  part(g, f, [[-0.21 * lunge - 0.02, 0.0], [-0.21 * lunge + 0.07, 0.0], [-0.21 * lunge + 0.02, 0.05]])
  // short chiton, pleated
  const skirt: Pt[] = catmull([[-0.11, 0.56], [-0.13, 0.41], [0.0, 0.39], [0.13, 0.41], [0.11, 0.56]], 5)
  part(g, f, skirt, true)
  for (let i = 0; i < 6; i++) soft(g, f, [[-0.09 + i * 0.036, 0.54], [-0.1 + i * 0.04, 0.415]], 0.6)
  if (g.mode === 'red') blackLine(g, f, catmull([[-0.13, 0.41], [-0.08, 0.395], [-0.03, 0.41], [0.02, 0.395], [0.07, 0.41], [0.13, 0.41]], 3), RELIEF * 1.1)
  part(g, f, front, true)
  part(g, f, [[0.19 * lunge - 0.02, 0.0], [0.19 * lunge + 0.08, 0.0], [0.19 * lunge + 0.02, 0.05]])
  // knee and greave
  soft(g, f, catmull([[0.12 * lunge, 0.3], [0.16 * lunge, 0.28], [0.15 * lunge, 0.25]], 4))
  detail(g, f, [[0.13 * lunge, 0.24], [0.17 * lunge, 0.09]], 0.8)
  detail(g, f, [[-0.1, 0.24], [-0.17 * lunge, 0.1]], 0.8)
  // torso behind the shield
  const torso: Pt[] = catmull([[-0.08, 0.55], [-0.09, 0.66], [-0.06, 0.8], [0.06, 0.82], [0.1, 0.66], [0.08, 0.55]], 6, true)
  part(g, f, torso)
  // helmet with a crest
  head(g, f, 0.03, 0.88, 0.13, { helmet: true })
  const crestPath = cubic([0.06, 0.95], [0.04, 1.06], [-0.11, 1.05], [-0.17, 0.87], 16)
  const crest = ribbon(crestPath, (t) => 0.046 * (1 - t * 0.55))
  if (g.mode === 'black') {
    black(g, f, crest)
    added(g, f, ribbon(crestPath, (t) => 0.02 * (1 - t * 0.6)), 'red')
  } else {
    // reserved crest with the horsehair drawn in fine black strokes
    part(g, f, crest)
    for (let i = 1; i < 16; i++) {
      const { p: q, d } = along(crestPath, i / 16)
      const w = 0.02 * (1 - (i / 16) * 0.55)
      blackLine(g, f, [[q[0] - d[1] * w, q[1] + d[0] * w], [q[0] + d[1] * w * 0.6, q[1] - d[0] * w * 0.6]], RELIEF * 0.6)
    }
  }
  // shield covers the body
  const sx = 0.13
  const sy = 0.62
  const sr = 0.21
  const shield = circle(sx, sy, sr, 56)
  part(g, f, shield, true)
  const rim = circle(sx, sy, sr * 0.84, 56)
  detail(g, f, [...rim, rim[0]], 1.1)
  const device = rng.int(0, 2)
  if (device === 0) {
    const d = circle(sx, sy, sr * 0.28, 24)
    if (g.mode === 'black') added(g, f, d, 'white')
    else black(g, f, d)
  } else if (device === 1) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU
      const d = circle(sx + Math.cos(a) * sr * 0.46, sy + Math.sin(a) * sr * 0.46, sr * 0.075, 12)
      if (g.mode === 'black') added(g, f, d, 'white')
      else black(g, f, d)
    }
  } else {
    const pts: Pt[] = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU
      const rr = i % 2 ? sr * 0.14 : sr * 0.4
      pts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr])
    }
    if (g.mode === 'black') added(g, f, pts, 'red')
    else black(g, f, pts)
  }
  if (g.mode === 'red') {
    // the shield's inner band, dotted
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU
      f.fill('paint', circle(sx + Math.cos(a) * sr * 0.92, sy + Math.sin(a) * sr * 0.92, sr * 0.025, 6), g.pal.slip)
    }
  }
}

const runner: Figure = (g, f) => {
  const { rng } = g
  const k = rng.range(0.92, 1.08)
  const backArm = limb([[0.0, 0.77], [-0.14, 0.7], [-0.22, 0.82]], 0.04, 0.024)
  const backLeg = limb([[-0.01, 0.5], [-0.06, 0.18], [-0.27 * k, 0.22]], 0.08, 0.032, 0.052)
  part(g, f, backArm)
  part(g, f, backLeg)
  part(g, f, [[-0.27 * k, 0.2], [-0.33 * k, 0.24], [-0.26 * k, 0.26]])
  const torso: Pt[] = catmull([[-0.065, 0.47], [-0.075, 0.64], [-0.045, 0.8], [0.075, 0.8], [0.085, 0.64], [0.075, 0.47]], 6, true)
  part(g, f, torso, true)
  torsoAnatomy(g, f, 0.005, 0.5, 0.15)
  const frontLeg = limb([[0.03, 0.5], [0.22 * k, 0.42], [0.18 * k, 0.05]], 0.085, 0.032, 0.058)
  part(g, f, frontLeg, true)
  part(g, f, [[0.16 * k, 0.0], [0.26 * k, 0.0], [0.19 * k, 0.05]])
  soft(g, f, catmull([[0.2 * k, 0.44], [0.225 * k, 0.41], [0.2 * k, 0.39]], 4))
  soft(g, f, catmull([[0.19 * k, 0.33], [0.2 * k, 0.24], [0.185 * k, 0.14]], 4))
  soft(g, f, catmull([[-0.05, 0.2], [-0.03, 0.17], [-0.06, 0.15]], 4))
  const frontArm = limb([[0.03, 0.77], [0.18, 0.7], [0.25, 0.83]], 0.044, 0.026)
  part(g, f, frontArm, true)
  head(g, f, 0.03, 0.885, 0.13, {})
}

const maiden: Figure = (g, f) => {
  const { rng } = g
  const sway = rng.range(-0.02, 0.02)
  // feet first; the hem falls over them
  skin(g, f, [[0.1, 0.0], [0.2, 0.0], [0.12, 0.045]], true)
  skin(g, f, [[-0.02, 0.0], [0.08, 0.0], [0.0, 0.045]], true)
  const dress: Pt[] = catmull(
    [[-0.07, 0.8], [-0.09, 0.6], [-0.14, 0.3], [-0.17, 0.03], [0.15, 0.03], [0.12, 0.3], [0.09 + sway, 0.6], [0.07, 0.8]],
    6,
    true,
  )
  part(g, f, dress)
  // many fine folds of the chiton, gathered at the waist
  const folds = g.mode === 'red' ? 11 : 5
  for (let i = 0; i < folds; i++) {
    const t = i / (folds - 1)
    const x0 = -0.075 + t * 0.15
    const x1 = -0.15 + t * 0.29
    const line = catmull([[x0, 0.5], [x0 + (x1 - x0) * 0.5 + rng.range(-0.006, 0.006), 0.26], [x1, 0.05]], 6)
    if (g.mode === 'red') {
      if (i % 2) soft(g, f, line, 0.7)
      else blackLine(g, f, line, RELIEF * 0.75)
    } else detail(g, f, line, 0.8)
  }
  // overfold (apoptygma) with a zigzag hem
  const over: Pt[] = catmull([[-0.085, 0.78], [-0.11, 0.62], [-0.12, 0.5], [0.1, 0.5], [0.09, 0.62], [0.075, 0.78]], 5, true)
  part(g, f, over, true)
  if (g.mode === 'red') {
    const zz: Pt[] = []
    for (let i = 0; i <= 10; i++) zz.push([-0.12 + i * 0.022, i % 2 ? 0.51 : 0.495])
    blackLine(g, f, zz, RELIEF * 0.9)
    for (let i = 0; i < 5; i++) soft(g, f, [[-0.06 + i * 0.03, 0.76], [-0.075 + i * 0.037, 0.52]], 0.6)
    // a woven border just above the hem
    const hem: Pt[] = []
    for (let i = 0; i <= 12; i++) hem.push([-0.15 + i * 0.024, 0.07 + (i % 2 ? 0.01 : 0)])
    blackLine(g, f, hem, RELIEF * 0.8)
  } else {
    for (let i = 0; i < 5; i++) added(g, f, circle(-0.1 + i * 0.05, 0.14, 0.012, 8), 'red')
    added(g, f, ribbon([[-0.13, 0.08], [0.12, 0.08]], () => 0.018, false), 'red')
  }
  // arm holding a flower forward
  const armF = limb([[0.05, 0.76], [0.14, 0.64], [0.24, 0.72]], 0.036, 0.022)
  skin(g, f, armF, true, true)
  head(g, f, 0.02, 0.885, 0.125, { female: true })
  blackLine(g, f, [[0.24, 0.72], [0.29, 0.82]], 0.003 * f.scale)
  const bloom = circle(0.295, 0.84, 0.022, 12)
  if (g.mode === 'black') added(g, f, bloom, 'red')
  else {
    part(g, f, bloom)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU
      blackLine(g, f, [[0.295, 0.84], [0.295 + Math.cos(a) * 0.02, 0.84 + Math.sin(a) * 0.02]], RELIEF * 0.5)
    }
  }
}

/** A youth wrapped in a himation, leaning on a staff. */
const youth: Figure = (g, f) => {
  const { rng } = g
  // staff behind
  blackLine(g, f, [[0.2, 0.0], [0.13, 0.74]], 0.0035 * f.scale)
  // feet
  part(g, f, [[0.02, 0.0], [0.13, 0.0], [0.05, 0.045]])
  part(g, f, [[-0.1, 0.0], [0.0, 0.0], [-0.08, 0.045]])
  // the cloak: one big draped mass from shoulders to shins
  const cloak: Pt[] = catmull(
    [[-0.1, 0.8], [-0.14, 0.62], [-0.16, 0.36], [-0.14, 0.12], [0.02, 0.1], [0.14, 0.13], [0.15, 0.4], [0.13, 0.62], [0.08, 0.79]],
    6,
    true,
  )
  // shins showing below the cloak
  part(g, f, limb([[0.05, 0.14], [0.06, 0.03]], 0.04, 0.03))
  part(g, f, limb([[-0.07, 0.14], [-0.07, 0.03]], 0.04, 0.03))
  part(g, f, cloak, true)
  // drapery: sweeping folds from the shoulder, a heavy roll at the chest, a weighted hem
  const sweeps = g.mode === 'red' ? 9 : 5
  for (let i = 0; i < sweeps; i++) {
    const t = i / (sweeps - 1)
    const line = catmull([[0.07 - t * 0.02, 0.77], [0.02 - t * 0.12, 0.52 - t * 0.05], [-0.12 + t * 0.2, 0.16 + t * 0.02]], 6)
    if (g.mode === 'red' && i % 2) soft(g, f, line, 0.7)
    else detail(g, f, line, 0.8)
  }
  detail(g, f, catmull([[-0.12, 0.66], [0.0, 0.6], [0.12, 0.62]], 6), 1)
  detail(g, f, catmull([[-0.12, 0.62], [0.0, 0.56], [0.12, 0.58]], 6), 0.7)
  if (g.mode === 'red') {
    const zz: Pt[] = []
    for (let i = 0; i <= 12; i++) zz.push([-0.14 + i * 0.024, 0.12 + (i % 2 ? 0.014 : 0)])
    blackLine(g, f, zz, RELIEF)
    black(g, f, circle(0.02, 0.13, 0.008, 6))
  }
  // hand resting on the staff
  const hand = limb([[0.08, 0.7], [0.12, 0.66], [0.14, 0.68]], 0.034, 0.024)
  part(g, f, hand, true)
  head(g, f, 0.03, 0.885, 0.13, { beard: rng.chance(0.4) })
}

/** Filler rosette, in the Corinthian manner. */
function dotRosette(g: G, f: Frame, r: number) {
  const disc = circle(0, 0, r, 20, g.rng, 0.05)
  black(g, f, disc)
  if (g.mode === 'black') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4
      f.line('paint', [[0, 0], [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9]], '#000', INCISE / f.scale, { erase: true })
    }
    f.line('paint', [...circle(0, 0, r * 0.45, 16), [r * 0.45, 0]], '#000', INCISE / f.scale, { erase: true })
  }
}

// ------------------------------------------------------------ inscriptions
// Painters wrote in the field between figures: KALOS ("beautiful"), a name,
// or EPOIESEN ("made it"). Letters are brush strokes on a unit box.

const GLYPHS: Record<string, { w: number; strokes: Pt[][] }> = {
  Α: { w: 0.7, strokes: [[[0, 0], [0.35, 1], [0.7, 0]], [[0.16, 0.4], [0.54, 0.4]]] },
  Ε: { w: 0.6, strokes: [[[0.6, 1], [0, 1], [0, 0], [0.6, 0]], [[0, 0.5], [0.45, 0.5]]] },
  Η: { w: 0.6, strokes: [[[0, 0], [0, 1]], [[0.6, 0], [0.6, 1]], [[0, 0.5], [0.6, 0.5]]] },
  Ι: { w: 0.1, strokes: [[[0.05, 0], [0.05, 1]]] },
  Κ: { w: 0.6, strokes: [[[0, 0], [0, 1]], [[0.6, 1], [0, 0.48], [0.6, 0]]] },
  Λ: { w: 0.7, strokes: [[[0, 0], [0.35, 1], [0.7, 0]]] },
  Ν: { w: 0.62, strokes: [[[0, 0], [0, 1], [0.62, 0], [0.62, 1]]] },
  Ο: { w: 0.62, strokes: [[...circle(0.31, 0.5, 0.31, 18), [0.62, 0.5]]] },
  Π: { w: 0.6, strokes: [[[0, 0], [0, 1], [0.6, 1], [0.6, 0]]] },
  Ρ: { w: 0.55, strokes: [[[0, 0], [0, 1], [0.38, 0.96], [0.52, 0.78], [0.38, 0.58], [0, 0.55]]] },
  Σ: { w: 0.6, strokes: [[[0.6, 1], [0, 1], [0.34, 0.5], [0, 0], [0.6, 0]]] },
  Τ: { w: 0.62, strokes: [[[0, 1], [0.62, 1]], [[0.31, 1], [0.31, 0]]] },
  ' ': { w: 0.35, strokes: [] },
}

function textWidth(text: string) {
  let w = 0
  for (const ch of text) w += (GLYPHS[ch]?.w ?? 0.5) + 0.3
  return w - 0.3
}

/** Paint a word along a frame's x axis, letters `size` tall, centred on the origin. */
function inscribe(g: G, f: Frame, text: string, size: number) {
  const color = g.mode === 'red' ? g.pal.red : g.pal.slip
  const layer = g.mode === 'red' ? 'over' : 'paint'
  let x = -textWidth(text) / 2
  for (const ch of text) {
    const gl = GLYPHS[ch] ?? GLYPHS[' ']
    for (const st of gl.strokes) {
      const pts = st.map(([px, py]) => [(x + px) * size, (py - 0.5) * size] as Pt)
      f.line(layer, pts, color, (size * 0.11) / 1, { alpha: 0.95, cap: 'round', join: 'round' })
    }
    x += gl.w + 0.3
  }
}

/** A word running round a circle on a plate, reading clockwise over the top. */
function inscribeArc(g: G, text: string, radius: number, centre: number, size: number) {
  const { p } = g
  const color = g.mode === 'red' ? g.pal.red : g.pal.slip
  const layer = g.mode === 'red' ? 'over' : 'paint'
  const total = textWidth(text) * size
  let s = -total / 2
  for (const ch of text) {
    const gl = GLYPHS[ch] ?? GLYPHS[' ']
    const mid = s + (gl.w * size) / 2
    const theta = centre - mid / radius
    // flipped so the letters read left to right from outside the circle
    const f = p.frame(theta, 0, radius, 0, 1, true)
    for (const st of gl.strokes) {
      const pts = st.map(([px, py]) => [(px - gl.w / 2) * size, (py - 0.5) * size] as Pt)
      f.line(layer, pts, color, size * 0.11, { alpha: 0.95, cap: 'round', join: 'round' })
    }
    s += (gl.w + 0.3) * size
  }
}

const WORDS = ['ΚΑΛΟΣ', 'ΗΟ ΠΑΙΣ ΚΑΛΟΣ', 'ΚΑΛΕ', 'ΕΠΟΙΕΣΕΝ', 'ΛΕΑΓΡΟΣ ΚΑΛΟΣ', 'ΚΑΛΟΣ ΝΑΙΧΙ']

// ------------------------------------------------------------------ animals
// Corinthian friezes: stags, goats and water birds walking in procession,
// every gap filled with incised rosettes.

type Animal = (g: G, f: Frame) => void

function purple(g: G, f: Frame, pts: Pt[]) {
  if (g.mode === 'black') f.fill('over', pts, g.pal.red, { alpha: 0.9 })
  else detail(g, f, [...pts, pts[0]], 0.7)
}

const stag: Animal = (g, f) => {
  const { rng } = g
  const stride = rng.range(-0.03, 0.03)
  const legs: [Pt[], number][] = [
    [[[-0.22, 0.44], [-0.19, 0.24], [-0.25 + stride, 0.0]], 0],
    [[[0.24, 0.42], [0.27, 0.2], [0.3 - stride, 0.0]], 0],
  ]
  for (const [l] of legs) part(g, f, limb(l, 0.05, 0.02, 0.03))
  // antlers behind the head: beam and tines
  const beam = catmull([[0.43, 0.83], [0.4, 0.95], [0.3, 1.04], [0.2, 1.06]], 8)
  blackLine(g, f, beam, 0.016 * f.scale)
  for (const [t, len, a] of [[0.25, 0.08, 0.6], [0.5, 0.09, 0.9], [0.75, 0.07, 1.2]] as const) {
    const { p, d } = along(beam, t)
    const ang = Math.atan2(d[1], d[0]) + a
    blackLine(g, f, [p, [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len]], 0.012 * f.scale)
  }
  const body = catmull(
    [[-0.44, 0.52], [-0.34, 0.63], [-0.1, 0.6], [0.14, 0.62], [0.3, 0.6], [0.36, 0.5], [0.3, 0.4], [0.1, 0.37], [-0.16, 0.38], [-0.38, 0.41]],
    6,
    true,
  )
  part(g, f, body, true)
  const neck = ribbon(catmull([[0.26, 0.54], [0.34, 0.66], [0.41, 0.78]], 6), (t) => 0.13 - t * 0.06)
  part(g, f, neck, true)
  const head = catmull([[0.37, 0.8], [0.43, 0.86], [0.52, 0.8], [0.59, 0.74], [0.56, 0.71], [0.45, 0.73], [0.39, 0.75]], 5, true)
  part(g, f, head, true)
  part(g, f, catmull([[0.41, 0.84], [0.36, 0.93], [0.39, 0.92], [0.44, 0.85]], 4, true))
  part(g, f, catmull([[-0.42, 0.52], [-0.49, 0.6], [-0.46, 0.49]], 4, true))
  const near: Pt[][] = [
    [[-0.32, 0.44], [-0.38, 0.24], [-0.33 - stride, 0.0]],
    [[0.3, 0.42], [0.36, 0.22], [0.4 + stride, 0.02]],
  ]
  for (const l of near) part(g, f, limb(l, 0.058, 0.022, 0.034), true)
  // incised anatomy and the painter's purple stripe down the neck and belly
  detail(g, f, catmull([[0.2, 0.6], [0.26, 0.5], [0.22, 0.4]], 5), 0.9)
  detail(g, f, catmull([[-0.24, 0.6], [-0.3, 0.5], [-0.26, 0.41]], 5), 0.9)
  detail(g, f, catmull([[-0.3, 0.42], [0, 0.4], [0.24, 0.42]], 5), 0.8)
  purple(g, f, ribbon(catmull([[0.3, 0.57], [0.36, 0.67], [0.41, 0.76]], 5), () => 0.03, false))
  purple(g, f, ribbon(catmull([[-0.28, 0.44], [0, 0.42], [0.24, 0.44]], 5), () => 0.03, false))
  const eye = circle(0.47, 0.8, 0.016, 10)
  if (g.mode === 'black') f.fill('paint', eye, '#000', { erase: true })
  else black(g, f, eye)
}

const goat: Animal = (g, f) => {
  const { rng } = g
  const s = rng.range(-0.02, 0.02)
  for (const l of [[[-0.22, 0.4], [-0.2, 0.2], [-0.25, 0.0]], [[0.2, 0.38], [0.23, 0.18], [0.25, 0.0]]] as Pt[][]) {
    part(g, f, limb(l, 0.05, 0.022, 0.032))
  }
  // horns sweep back in a crescent
  const horn = ribbon(catmull([[0.36, 0.7], [0.32, 0.84], [0.16, 0.9], [0.06, 0.84]], 8), (t) => 0.05 * (1 - t * 0.85))
  part(g, f, horn)
  for (let i = 1; i < 5; i++) {
    const { p, d } = along(catmull([[0.36, 0.7], [0.32, 0.84], [0.16, 0.9], [0.06, 0.84]], 8), i / 5)
    detail(g, f, [[p[0] - d[1] * 0.02, p[1] + d[0] * 0.02], [p[0] + d[1] * 0.02, p[1] - d[0] * 0.02]], 0.6)
  }
  const body = catmull([[-0.4, 0.46], [-0.3, 0.56], [0, 0.55], [0.22, 0.56], [0.3, 0.46], [0.24, 0.35], [0, 0.33], [-0.3, 0.36]], 6, true)
  part(g, f, body, true)
  const neckHead = catmull([[0.2, 0.52], [0.3, 0.66], [0.38, 0.73], [0.48, 0.66], [0.5, 0.58], [0.44, 0.58], [0.34, 0.55], [0.28, 0.44]], 6, true)
  part(g, f, neckHead, true)
  // beard
  part(g, f, [[0.44, 0.59], [0.47, 0.5], [0.49, 0.59]])
  part(g, f, catmull([[-0.38, 0.5], [-0.46, 0.58], [-0.42, 0.48]], 4, true))
  for (const l of [[[-0.3, 0.4], [-0.35, 0.2], [-0.3 + s, 0.0]], [[0.25, 0.38], [0.3, 0.18], [0.33 - s, 0.0]]] as Pt[][]) {
    part(g, f, limb(l, 0.056, 0.022, 0.034), true)
  }
  detail(g, f, catmull([[0.16, 0.55], [0.22, 0.46], [0.18, 0.36]], 5), 0.9)
  detail(g, f, catmull([[-0.22, 0.54], [-0.28, 0.45], [-0.24, 0.37]], 5), 0.9)
  purple(g, f, ribbon(catmull([[-0.26, 0.4], [0, 0.37], [0.2, 0.39]], 5), () => 0.028, false))
  const eye = circle(0.42, 0.66, 0.014, 10)
  if (g.mode === 'black') f.fill('paint', eye, '#000', { erase: true })
  else black(g, f, eye)
}

const bird: Animal = (g, f) => {
  const { rng } = g
  const lift = rng.range(-0.02, 0.02)
  // a plump water bird on short legs, neck curved back like a swan's
  part(g, f, limb([[-0.02, 0.16], [0.0, 0.07], [0.03, 0.0]], 0.024, 0.014))
  part(g, f, limb([[0.06, 0.16], [0.09, 0.07], [0.1, 0.0]], 0.024, 0.014))
  f.fill('paint', [[0.03, 0.0], [0.09, 0.0], [0.05, 0.02]], g.pal.slip)
  const body = catmull([[-0.44, 0.42 + lift], [-0.26, 0.44], [0.02, 0.4], [0.2, 0.33], [0.2, 0.2], [0.02, 0.13], [-0.2, 0.17], [-0.36, 0.28]], 6, true)
  part(g, f, body, true)
  const neck = ribbon(catmull([[0.14, 0.3], [0.24, 0.42], [0.2, 0.54], [0.26, 0.64]], 10), (t) => 0.075 - t * 0.03)
  part(g, f, neck, true)
  part(g, f, catmull([[0.23, 0.65], [0.28, 0.7], [0.37, 0.66], [0.43, 0.62], [0.3, 0.61]], 4, true), true)
  // wing: purple coverts, incised long feathers sweeping back to the tail
  const wing = catmull([[-0.36, 0.4], [-0.08, 0.41], [0.12, 0.33], [-0.04, 0.26], [-0.3, 0.3]], 6, true)
  purple(g, f, wing)
  detail(g, f, [...wing, wing[0]], 0.8)
  for (let i = 0; i < 5; i++) detail(g, f, [[-0.26 + i * 0.07, 0.39], [-0.34 + i * 0.07, 0.3]], 0.6)
  detail(g, f, catmull([[-0.1, 0.2], [0.05, 0.18], [0.16, 0.24]], 5), 0.6)
  const eye = circle(0.3, 0.66, 0.012, 8)
  if (g.mode === 'black') f.fill('paint', eye, '#000', { erase: true })
  else black(g, f, eye)
}

/** A procession of animals round the body, rosettes filling every gap. */
function animalFrieze(g: G, z: Zone) {
  const { p, rng } = g
  const h = z.to - z.from
  const figH = h * 0.78
  const mid = z.from + h * 0.5
  const circ = p.circumference(mid)
  const n = Math.max(4, Math.round(circ / (figH * 1.05)))
  const offset = rng.range(0, TAU)
  const cast: Animal[] = []
  for (let i = 0; i < n; i++) cast.push(i % 3 === 2 ? bird : rng.chance(0.55) ? stag : goat)
  for (let i = 0; i < n; i++) {
    const a = cast[i]
    const f = p.frame(offset + (i / n) * TAU, 0, z.from + h * 0.06, 0, figH * (a === bird ? 0.95 : 1), false)
    a({ ...g, rng: rng.fork() }, f)
  }
  // Corinthian horror vacui: rosettes of every size above, below and between
  for (let i = 0; i < n; i++) {
    const t0 = offset + (i / n) * TAU
    const step = TAU / n
    const spots: [number, number, number][] = [
      [0.5, 0.8, 0.07], [0.5, 0.45, 0.06], [0.5, 0.15, 0.05], [0.0, 0.18, 0.04], [0.25, 0.86, 0.04], [0.75, 0.86, 0.04],
    ]
    for (const [dt, yy, r] of spots) {
      const rf = p.frame(t0 + dt * step + rng.range(-0.05, 0.05) * step, 0, z.from + h * yy)
      dotRosette(g, rf, h * r * rng.range(0.8, 1.15))
    }
  }
  p.ring('paint', z.from + 0.003, g.pal.slip, 0.003, rng)
}

// -------------------------------------------------------------------- bands

/** Red-figure paints the ground black, so a pattern band is first reserved. */
function reserve(g: G, from: number, to: number) {
  if (g.mode !== 'red') return
  g.p.eraseZone('paint', from, to)
}

function edgeLines(g: G, from: number, to: number, w = 0.0028) {
  g.p.ring('paint', from + w / 2, g.pal.slip, w, g.rng)
  g.p.ring('paint', to - w / 2, g.pal.slip, w, g.rng)
}

/** Stopped meander: squared keys alternating with saltire squares. */
function meanderBand(g: G, from: number, to: number) {
  const { p } = g
  reserve(g, from, to)
  const h = to - from
  const inner = h * 0.72
  const mid = (from + to) / 2
  const circ = p.circumference(mid)
  const unit = inner * 2.25
  const n = Math.max(6, Math.round(circ / unit))
  const lw = inner * 0.12
  const s = inner / 6
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, mid - inner / 2)
    const key: Pt[] = [[0, 0], [0, 6], [6, 6], [6, 1.5], [1.5 + 1.5, 1.5], [3, 3.75], [4.5, 3.75]].map(([x, y]) => [x * s - inner * 0.5, y * s * 0.97])
    f.line('paint', key, g.pal.slip, lw, { cap: 'square', join: 'miter' })
    // saltire square
    const x0 = inner * 0.72
    const sq: Pt[] = [[x0, 0], [x0 + inner * 0.8, 0], [x0 + inner * 0.8, inner], [x0, inner]]
    f.line('paint', [...sq, sq[0]], g.pal.slip, lw * 0.8, { join: 'miter' })
    f.line('paint', [sq[0], sq[2]], g.pal.slip, lw * 0.6)
    f.line('paint', [sq[1], sq[3]], g.pal.slip, lw * 0.6)
  }
  edgeLines(g, from, to, h * 0.07)
}

/** Rays rising from the foot (black-figure). */
function rayBand(g: G, from: number, to: number) {
  const { p, rng } = g
  const h = to - from
  const circ = p.circumference(from + h * 0.3)
  const n = Math.max(12, Math.round(circ / (h * 0.32)))
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, from)
    const w = (circ / n) * 0.34
    const tip = h * rng.range(0.9, 0.97)
    f.fill('paint', [[-w, 0.004], [0, tip], [w, 0.004]], g.pal.slip)
  }
  p.band('paint', from, from + 0.008, g.pal.slip)
  p.ring('paint', to + 0.004, g.pal.slip, 0.003, rng)
}

/** Tongues hanging from the shoulder, alternating black and red. */
function tongueBand(g: G, from: number, to: number) {
  const { p, rng } = g
  reserve(g, from, to)
  const h = to - from
  const circ = p.circumference(to - h * 0.3)
  const n = Math.max(12, Math.round(circ / (h * 0.36)))
  p.band('paint', to - h * 0.12, to, g.pal.slip)
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, to - h * 0.12)
    const w = (circ / n) * 0.4
    const len = h * 0.72
    const t: Pt[] = [[-w, 0.002], ...cubic([-w, 0], [-w, -len], [w, -len], [w, 0], 16), [w, 0.002]]
    if (g.mode === 'black' && i % 2) f.fill('over', t, g.pal.red, { alpha: 0.95 })
    else f.fill('paint', t, g.pal.slip)
    // incised outline so neighbouring tongues read apart
    if (g.mode === 'black') {
      const inner = t.map(([x, y]) => [x * 0.72, y * 0.84] as Pt)
      f.line(i % 2 ? 'over' : 'paint', inner, '#000', INCISE * 0.8, { erase: true })
    }
  }
  p.ring('paint', from + 0.003, g.pal.slip, 0.0028, rng)
}

/** Palmettes and lotus buds linked by tendrils. */
function palmetteBand(g: G, from: number, to: number) {
  const { p, rng } = g
  reserve(g, from, to)
  const h = to - from
  const mid = (from + to) / 2
  const circ = p.circumference(mid)
  const n = Math.max(4, Math.round(circ / (h * 1.3)))
  const step = circ / n
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, from + h * 0.12)
    const ph = h * 0.74
    // tendril arcs linking to the neighbours
    const arc = cubic([0, ph * 0.12], [step * 0.2, -ph * 0.05], [step * 0.35, ph * 0.12], [step * 0.5, ph * 0.3], 18)
    f.line('paint', arc, g.pal.slip, h * 0.03)
    f.line('paint', arc.map(([x, y]) => [-x, y] as Pt), g.pal.slip, h * 0.03)
    // volutes
    for (const s of [-1, 1]) {
      const spiral: Pt[] = []
      for (let k = 0; k <= 30; k++) {
        const a = (k / 30) * TAU * 1.1
        const r = ph * 0.11 * (1 - k / 36)
        spiral.push([s * (ph * 0.1 + Math.cos(a) * r), ph * 0.12 + Math.sin(a) * r])
      }
      f.line('paint', spiral, g.pal.slip, h * 0.028)
    }
    // heart and fan of leaves
    black(g, f, ellipse(0, ph * 0.2, ph * 0.07, ph * 0.08))
    const leaves = rng.pick([7, 9])
    for (let k = 0; k < leaves; k++) {
      const a = (k / (leaves - 1) - 0.5) * 2.4
      const len = ph * (0.8 - Math.abs(a) * 0.12)
      const lf = transform(
        ribbon(catmull([[0, 0], [0, len * 0.5], [0, len]], 6), (t) => ph * 0.07 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05))),
        0,
        ph * 0.24,
        -a * 0.5,
      )
      if (g.mode === 'black' && k % 2 === 1) f.fill('over', lf, g.pal.red)
      else black(g, f, lf)
      // a fine rib down each leaf
      const rib = transform([[0, len * 0.18], [0, len * 0.82]], 0, ph * 0.24, -a * 0.5)
      if (g.mode === 'black') f.line('paint', rib, '#000', INCISE * 0.8, { erase: true })
    }
    // the heart in purple, and a dot at the eye of each volute
    if (g.mode === 'black') f.fill('over', ellipse(0, ph * 0.2, ph * 0.05, ph * 0.06), g.pal.red)
    for (const sx of [-1, 1]) black(g, f, circle(sx * ph * 0.1, ph * 0.12, ph * 0.025, 8))
    // lotus bud between palmettes
    const lb = p.frame(((i + 0.5) / n) * TAU, 0, from + h * 0.3)
    const bud: Pt[] = [[0, 0], ...cubic([0, 0], [-ph * 0.18, ph * 0.2], [-ph * 0.08, ph * 0.5], [0, ph * 0.62], 10), ...cubic([0, ph * 0.62], [ph * 0.08, ph * 0.5], [ph * 0.18, ph * 0.2], [0, 0], 10)]
    black(g, lb, bud)
    black(g, lb, [[-ph * 0.14, ph * 0.02], [0, ph * 0.3], [ph * 0.14, ph * 0.02]])
  }
  edgeLines(g, from, to, 0.0024)
}

/** Continuous frieze of figures around the body. */
/** Egg-and-dart moulding, reserved: frames the top of a red-figure frieze. */
function eggBand(g: G, from: number, to: number) {
  const { p } = g
  reserve(g, from, to)
  const h = to - from
  const mid = (from + to) / 2
  const circ = p.circumference(mid)
  const n = Math.max(12, Math.round(circ / (h * 0.9)))
  for (let i = 0; i < n; i++) {
    const f = p.frame((i / n) * TAU, 0, mid)
    const egg = ellipse(0, -h * 0.05, h * 0.26, h * 0.34, 0, 20)
    f.line('paint', [...egg, egg[0]], g.pal.slip, h * 0.07)
    f.fill('paint', ellipse(0, -h * 0.08, h * 0.12, h * 0.2, 0, 16), g.pal.slip)
    const d = p.frame(((i + 0.5) / n) * TAU, 0, mid)
    d.fill('paint', [[-h * 0.05, h * 0.3], [h * 0.05, h * 0.3], [0, -h * 0.35]], g.pal.slip)
  }
  edgeLines(g, from, to, h * 0.09)
}

function figureFrieze(g: G, zone: Zone) {
  const { p, rng } = g
  let z = zone
  if (g.mode === 'red') {
    // red-figure friezes stand on a meander strip under an egg moulding
    const zh = zone.to - zone.from
    const mh = Math.min(0.03, zh * 0.1)
    meanderBand(g, zone.from, zone.from + mh)
    eggBand(g, zone.to - mh * 0.8, zone.to)
    z = { ...zone, from: zone.from + mh + 0.004, to: zone.to - mh * 0.8 - 0.004 }
  }
  const h = z.to - z.from
  const figH = h * 0.86
  const mid = z.from + h * 0.5
  const circ = p.circumference(mid)
  const n = Math.max(4, Math.round(circ / (figH * 0.62)))
  const cast: Figure[] = []
  // build little scenes: a duel, a procession, a race
  while (cast.length < n) {
    const scene = rng.int(0, 3)
    if (scene === 0) cast.push(hoplite, hoplite)
    else if (scene === 1) cast.push(maiden, youth)
    else if (scene === 2) cast.push(runner, runner)
    else cast.push(youth, maiden)
  }
  const offset = rng.range(0, TAU)
  for (let i = 0; i < n; i++) {
    const fig = cast[i]
    // duellists face each other
    // duellists and conversing pairs face each other; runners race the same way
    const facing = fig === runner ? true : i % 2 === 0
    const f = p.frame(offset + (i / n) * TAU, 0, z.from + h * 0.05, 0, figH * rng.range(0.96, 1.02), !facing)
    fig({ ...g, rng: rng.fork() }, f)
    // a painted word running down the field between each facing pair
    if (i % 2 === 0 && i + 1 < n && fig !== runner) {
      const word = cast[i + 1] === maiden || fig === maiden ? 'ΚΑΛΕ' : 'ΚΑΛΟΣ'
      const wf = p.frame(offset + ((i + 0.5) / n) * TAU, 0, z.from + h * 0.62, -Math.PI / 2, 1)
      inscribe(g, wf, word, h * 0.052)
    }
    if (g.mode === 'black' && (g.pal.id === 'corinthian' || rng.chance(0.4))) {
      const rf = p.frame(offset + ((i + 0.5) / n) * TAU, 0, z.from + h * rng.range(0.55, 0.8))
      dotRosette(g, rf, h * 0.045)
    }
  }
  // ground line
  if (g.mode === 'black') p.ring('paint', z.from + 0.003, g.pal.slip, 0.003, rng)
}

const GREEK_MATERIAL = {
  groundGloss: 0.34,
  paintGloss: 0.86,
  paintRelief: 0.05,
  goldGloss: 0.8,
  goldRelief: 0.3,
  overGloss: 0.4,
  overRelief: 0.12,
  pigmentNoise: 0.05,
  paintBlur: 0.35,
}

/**
 * A plate painted as Attic plates of about 500 BC were: one figure filling a wide
 * tondo in a meander ring, then a plain black rim with a single reserved line.
 */
function tondo(g: G) {
  const { p, pal, rng, mode } = g
  const well = { from: 0, to: 0.36 }
  const ring = { from: 0.365, to: 0.41 }
  if (mode === 'red') p.band('paint', 0, 0.5, pal.slip)
  else p.band('paint', ring.to, 0.5, pal.slip)
  const fig = rng.pick([hoplite, runner, maiden, youth])
  const h = well.to * 1.62
  const base = -well.to * 0.62
  const f = p.flat(fig === runner ? -0.01 : 0.02, base, 0, h, rng.chance(0.5))
  p.clip(0, well.to)
  fig({ ...g, rng: rng.fork() }, f)
  p.unclip()
  // exergue: the ground line the figure stands on
  const half = Math.sqrt(Math.max(0, well.to * well.to - base * base))
  p.flat().line('paint', [[-half, base - 0.003], [half, base - 0.003]], pal.slip, 0.004)
  if (mode === 'black') {
    for (let i = 0; i < 9; i++) {
      const x = -half * 0.8 + (i / 8) * half * 1.6
      p.flat().fill('paint', [[x - 0.012, base - 0.008], [x, base - 0.04], [x + 0.012, base - 0.008]], pal.slip)
    }
  }
  inscribeArc(g, rng.pick(WORDS.filter((w) => w.length > 5)), well.to - 0.026, Math.PI / 2, 0.02)
  meanderBand(g, ring.from, ring.to)
  if (mode === 'black') p.ring('over', (ring.to + 0.5) / 2, pal.red, 0.004, rng, 0.85)
  p.eraseZone('paint', 0.466, 0.469)
}

// --------------------------------------------------------------------- main

export function paintGreek(p: Painter, shape: Shape, style: string, paletteId: GreekPaletteId, seed: number) {
  const pal = GREEK_PALETTES[paletteId]
  const rng = new Rng(seed * 7919 + 13)
  const mode: Mode = style === 'red-figure' ? 'red' : 'black'
  const g: G = { p, pal, rng, mode }
  p.ground(pal.clay, pal.clayMottle, 0.26, 0.01)
  const zone = (role: Zone['role']) => shape.zones.find((z) => z.role === role)
  const zones = shape.zones

  if (p.mode === 'disc') {
    tondo(g)
    return p.finish(GREEK_MATERIAL)
  }

  if (mode === 'red') {
    // everything black; bands and figures are reserved out of it
    p.band('paint', 0, 1, pal.slip)
  } else {
    // black-figure keeps the lower body, collar and lip black
    const foot = zone('foot')
    if (foot) p.band('paint', 0, foot.to, pal.slip)
    const collar = zone('collar')
    if (collar) p.band('paint', collar.from, 1, pal.slip)
    // gaps between decorated zones are glazed black too
    const sorted = [...zones].sort((a, b) => a.from - b.from)
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]
      if (b.from - a.to > 0.004) p.band('paint', a.to, b.from, pal.slip)
    }
  }

  const base = zone('base')
  const body = zone('body')
  const shoulder = zone('shoulder')
  const neck = zone('neck')

  if (base) {
    if (mode === 'black') {
      const h = base.to - base.from
      rayBand(g, base.from, base.from + h * 0.62)
      meanderBand(g, base.from + h * 0.7, base.to)
    } else {
      meanderBand(g, base.to - (base.to - base.from) * 0.34, base.to)
    }
  }
  if (body) {
    p.clip(body.from, body.to)
    if (mode === 'black' && pal.id === 'corinthian') {
      // Corinthian jugs stack their friezes one above another, divided by glazed bands
      const gap = 0.012
      const half = (body.to - body.from - gap) / 2
      animalFrieze(g, { ...body, to: body.from + half })
      p.band('paint', body.from + half, body.from + half + gap, pal.slip)
      animalFrieze(g, { ...body, from: body.from + half + gap })
    } else figureFrieze(g, body)
    p.unclip()
    if (mode === 'black') {
      p.ring('paint', body.to - 0.003, pal.slip, 0.004, rng)
    } else {
      // key band on the upper body
    }
  }
  if (shoulder) tongueBand(g, shoulder.from, shoulder.to)
  if (neck) palmetteBand(g, neck.from, neck.to)

  // wheel-applied lines on the lip and foot edge, like a potter's finishing
  const rim = zone('rim')
  if (rim) {
    const w = wobble(rng, 6)
    void w
    if (mode === 'black') p.ring('over', rim.from + 0.006, pal.red, 0.003, rng, 0.8)
  }

  return p.finish(GREEK_MATERIAL)

}
