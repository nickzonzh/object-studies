// The painter works the way a potter's painter does: motifs are drawn at
// their true physical size on the curved wall, placed by angle around the
// vessel. Every point is mapped from wall space (arc length, height) into the
// unrolled texture (angle, height), so a flower on the narrow neck is painted
// at the same size as one on the belly, and simply takes up more of the turn.

import { seededRandom } from 'object-studies-core'
import { radiusAt, sampleProfile, type Shape } from './shapes.js'

export type Pt = [number, number]
export const TAU = Math.PI * 2

// ---------------------------------------------------------------- randomness

export class Rng {
  readonly next: () => number
  constructor(seed: number) {
    this.next = seededRandom(seed >>> 0 || 1)
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next()
  }
  /** Value around v, varied by +/- amt (fraction). */
  vary(v: number, amt: number) {
    return v * (1 + (this.next() * 2 - 1) * amt)
  }
  int(a: number, b: number) {
    return Math.floor(this.range(a, b + 1))
  }
  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)]
  }
  chance(p: number) {
    return this.next() < p
  }
  fork() {
    return new Rng(Math.floor(this.next() * 4294967296))
  }
}

/** Smooth 1D noise, used to make a painted edge wobble like a real brush. */
export function wobble(rng: Rng, n = 8) {
  const knots = Array.from({ length: n + 1 }, () => rng.next() * 2 - 1)
  return (t: number) => {
    const f = Math.min(0.9999, Math.max(0, t)) * n
    const i = Math.floor(f)
    const k = f - i
    const s = k * k * (3 - 2 * k)
    return knots[i] * (1 - s) + knots[i + 1] * s
  }
}

// ------------------------------------------------------------------ geometry

export function catmull(points: Pt[], segs = 10, closed = false): Pt[] {
  const out: Pt[] = []
  const n = points.length
  if (n < 2) return points.slice()
  const get = (i: number) => {
    if (closed) return points[((i % n) + n) % n]
    return points[Math.max(0, Math.min(n - 1, i))]
  }
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1)
    const p1 = get(i)
    const p2 = get(i + 1)
    const p3 = get(i + 2)
    for (let s = 0; s < segs; s++) {
      const t = s / segs
      const t2 = t * t
      const t3 = t2 * t
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ])
    }
  }
  if (!closed) out.push(points[n - 1])
  return out
}

export function quad(a: Pt, c: Pt, b: Pt, n = 24): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]])
  }
  return out
}

export function cubic(a: Pt, c1: Pt, c2: Pt, b: Pt, n = 32): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1],
    ])
  }
  return out
}

export function lengths(pts: Pt[]) {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  return acc
}

/** Point and unit tangent at fraction t along a polyline. */
export function along(pts: Pt[], t: number): { p: Pt; d: Pt } {
  const acc = lengths(pts)
  const total = acc[acc.length - 1]
  const target = Math.min(1, Math.max(0, t)) * total
  let i = 1
  while (i < acc.length - 1 && acc[i] < target) i++
  const seg = acc[i] - acc[i - 1] || 1
  const k = (target - acc[i - 1]) / seg
  const a = pts[i - 1]
  const b = pts[i]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  return { p: [a[0] + dx * k, a[1] + dy * k], d: [dx / l, dy / l] }
}

/**
 * A brush stroke as a filled outline: offset the centre line by a width
 * profile. Rounded ends are added so strokes read as loaded brush marks.
 */
export function ribbon(center: Pt[], width: (t: number) => number, roundEnds = true): Pt[] {
  const acc = lengths(center)
  const total = acc[acc.length - 1] || 1
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i < center.length; i++) {
    const a = center[Math.max(0, i - 1)]
    const b = center[Math.min(center.length - 1, i + 1)]
    let dx = b[0] - a[0]
    let dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    dx /= l
    dy /= l
    const w = Math.max(0, width(acc[i] / total)) / 2
    left.push([center[i][0] - dy * w, center[i][1] + dx * w])
    right.push([center[i][0] + dy * w, center[i][1] - dx * w])
  }
  const out: Pt[] = [...left]
  if (roundEnds) {
    const e = center[center.length - 1]
    const w = width(1) / 2
    if (w > 0) out.push(...arcCap(e, left[left.length - 1], right[right.length - 1], w))
  }
  out.push(...right.reverse())
  if (roundEnds) {
    const s = center[0]
    const w = width(0) / 2
    if (w > 0) out.push(...arcCap(s, right[right.length - 1], left[0], w))
  }
  return out
}

function arcCap(c: Pt, from: Pt, to: Pt, r: number): Pt[] {
  const a0 = Math.atan2(from[1] - c[1], from[0] - c[0])
  let a1 = Math.atan2(to[1] - c[1], to[0] - c[0])
  if (a1 > a0) a1 -= TAU
  const out: Pt[] = []
  for (let i = 1; i < 6; i++) {
    const a = a0 + ((a1 - a0) * i) / 6
    out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r])
  }
  return out
}

export function circle(cx: number, cy: number, r: number, n = 28, rng?: Rng, rough = 0): Pt[] {
  const w = rng ? wobble(rng, 6) : () => 0
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const rr = r * (1 + w(i / n) * rough)
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  return out
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): Pt[] {
  const out: Pt[] = []
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU
    const x = Math.cos(a) * rx
    const y = Math.sin(a) * ry
    out.push([cx + c * x - s * y, cy + s * x + c * y])
  }
  return out
}

/** Darken (amt < 0) or lighten (amt > 0) a hex colour. */
export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt),
  )
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}

export function transform(pts: Pt[], x: number, y: number, rot = 0, scale = 1, flip = false): Pt[] {
  const c = Math.cos(rot) * scale
  const s = Math.sin(rot) * scale
  const f = flip ? -1 : 1
  return pts.map(([px, py]) => [x + c * px * f - s * py, y + s * px * f + c * py])
}

export function jitterPts(pts: Pt[], rng: Rng, amt: number): Pt[] {
  const wx = wobble(rng, Math.max(4, Math.floor(pts.length / 6)))
  const wy = wobble(rng, Math.max(4, Math.floor(pts.length / 6)))
  return pts.map(([x, y], i) => [x + wx(i / pts.length) * amt, y + wy(i / pts.length) * amt])
}

// ------------------------------------------------------------------- surface

export type LayerName = 'paint' | 'gold' | 'over'

/** Space a drawing covers, in wall units. maxR is the distance from a plate's centre. */
export type Extent = { minX: number; maxX: number; minY: number; maxY: number; maxR: number }

/**
 * Draw something at the largest scale (up to 1) that keeps it inside its
 * bounds. `draw(k)` must be repeatable: give it a fresh copy of the same
 * random seed each time. `room(extent)` returns how much it would need to
 * shrink (1 or more means it fits).
 */
export function fit(p: Painter, draw: (k: number) => void, room: (e: Extent) => number) {
  let k = 1
  for (let i = 0; i < 4; i++) {
    const e = p.measure(() => draw(k))
    if (!Number.isFinite(e.maxY)) break
    const r = room(e)
    if (r >= 1) break
    k *= Math.max(0.3, r * 0.985)
  }
  draw(k)
  return k
}

type Affine = [number, number, number, number, number, number]

function mul(m: Affine, n: Affine): Affine {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ]
}

/**
 * A placement on the wall. Local coordinates are in wall units (vessel height
 * = 1) before the frame's own scale. `theta` anchors the frame around the
 * vessel; x offsets are arc length along the wall at each point's height.
 */
export class Frame {
  readonly painter: Painter
  /** Anchor angle around the piece, or null for a flat placement on a plate's face. */
  readonly theta: number | null
  readonly m: Affine

  constructor(painter: Painter, theta: number | null, m: Affine) {
    this.painter = painter
    this.theta = theta
    this.m = m
  }

  get scale() {
    return Math.hypot(this.m[0], this.m[1])
  }

  child(x: number, y: number, rot = 0, scale = 1, flip = false): Frame {
    const c = Math.cos(rot) * scale
    const s = Math.sin(rot) * scale
    const f = flip ? -1 : 1
    return new Frame(this.painter, this.theta, mul(this.m, [c * f, s * f, -s, c, x, y]))
  }

  phys([x, y]: Pt): Pt {
    const m = this.m
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
  }

  fill(layer: LayerName, pts: Pt[], color: string, opts: FillOpts = {}) {
    this.painter.fillPhys(layer, this.theta, pts.map((p) => this.phys(p)), color, opts)
  }

  line(layer: LayerName, pts: Pt[], color: string, width: number, opts: LineOpts = {}) {
    this.painter.linePhys(layer, this.theta, pts.map((p) => this.phys(p)), color, width * this.scale, opts)
  }

  /** Gold (or dark) contour around a shape, drawn on top of the paint. */
  outline(layer: LayerName, pts: Pt[], color: string, width: number, alpha = 1) {
    this.line(layer, [...pts, pts[0], pts[1]], color, width, { alpha, join: 'round' })
  }
}

export type FillOpts = {
  alpha?: number
  /** Pigment pooling at the edge of a wash. */
  edge?: string
  edgeWidth?: number
  edgeAlpha?: number
  evenOdd?: boolean
  /** Scrape paint away (reserves the ground, or incises through slip). */
  erase?: boolean
  /** Pigment settling inside the edge of a wash: a soft darker band just inside the outline. */
  pool?: { color: string; width: number; alpha: number }
  /** Brush grain: faint streaks across the wash in the direction the brush travelled (radians, wall space). */
  grain?: { angle: number; color: string; alpha: number; count?: number }
}

export type LineOpts = {
  alpha?: number
  cap?: CanvasLineCap
  join?: CanvasLineJoin
  dash?: number[]
  closed?: boolean
  erase?: boolean
}

/**
 * Painting is thousands of small paths, clips and composites. A software
 * canvas does that far faster than a GPU-backed one, and the result is read
 * back for the probe and the texture upload anyway.
 */
const CPU: CanvasRenderingContext2DSettings = { willReadFrequently: true }

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export type SurfaceMaterial = {
  groundGloss: number
  paintGloss: number
  paintRelief: number
  goldGloss: number
  goldRelief: number
  overGloss: number
  overRelief: number
  /** Soft blur applied to underglaze paint, in texture pixels. */
  paintBlur: number
  /** Strength of uneven pigment density in the underglaze. */
  pigmentNoise: number
}

export class Painter {
  readonly r: Float32Array
  readonly color: HTMLCanvasElement
  readonly layers: Record<LayerName, HTMLCanvasElement>
  readonly ctx: Record<LayerName, CanvasRenderingContext2D>
  readonly base: CanvasRenderingContext2D

  /** 'wall' paints the unrolled side of a vessel; 'disc' paints the face of a plate. */
  readonly mode: 'wall' | 'disc'

  readonly width: number
  readonly height: number
  /** Texture pixels per unit relative to the standard size; blur radii follow it. */
  readonly detail: number

  readonly shape: Shape

  constructor(shape: Shape, detail = 1) {
    this.shape = shape
    const snap = (v: number) => Math.max(512, Math.round(v / 256) * 256)
    this.detail = detail
    this.width = snap((shape.kind === 'plate' ? 2560 : 3072) * detail)
    this.height = snap((shape.kind === 'plate' ? 2560 : 1536) * detail)
    const width = this.width
    const height = this.height
    this.mode = shape.kind === 'plate' ? 'disc' : 'wall'
    this.r = sampleProfile(shape.points).r
    this.color = makeCanvas(width, height)
    this.base = this.color.getContext('2d', CPU)!
    this.layers = {
      paint: makeCanvas(width, height),
      gold: makeCanvas(width, height),
      over: makeCanvas(width, height),
    }
    this.ctx = {
      paint: this.layers.paint.getContext('2d', CPU)!,
      gold: this.layers.gold.getContext('2d', CPU)!,
      over: this.layers.over.getContext('2d', CPU)!,
    }
  }

  /** Radius of the circle a height sits on. On a plate the 'height' is the distance from the centre. */
  R(y: number) {
    if (this.mode === 'disc') return Math.max(0.002, y)
    return Math.max(0.01, radiusAt(this.r, y))
  }

  circumference(y: number) {
    return TAU * this.R(y)
  }

  /** Texture row for a wall height. */
  v(y: number) {
    return (1 - y) * this.height
  }

  frame(theta: number, x = 0, y = 0, rot = 0, scale = 1, flip = false) {
    return new Frame(this, theta, [1, 0, 0, 1, 0, 0]).child(x, y, rot, scale, flip)
  }

  /** Flat placement on a plate's face: x right, y up, centre at the origin. */
  flat(x = 0, y = 0, rot = 0, scale = 1, flip = false) {
    return new Frame(this, null, [1, 0, 0, 1, 0, 0]).child(x, y, rot, scale, flip)
  }

  private toTex(theta: number | null, [x, y]: Pt): Pt {
    if (this.mode === 'disc') {
      // plate face spans [-0.5, 0.5]
      if (theta === null) return [(0.5 + x) * this.width, (0.5 - y) * this.height]
      const r = Math.max(0, y)
      const ang = theta + x / this.R(r)
      return [(0.5 + r * Math.cos(ang)) * this.width, (0.5 - r * Math.sin(ang)) * this.height]
    }
    const yy = Math.min(1, Math.max(0, y))
    const ang = (theta ?? 0) + x / this.R(yy)
    return [(ang / TAU) * this.width, (1 - y) * this.height]
  }

  private copies(pts: Pt[]) {
    if (this.mode === 'disc') return [0]
    let min = Infinity
    let max = -Infinity
    for (const p of pts) {
      if (p[0] < min) min = p[0]
      if (p[0] > max) max = p[0]
    }
    const shifts: number[] = []
    const kMin = Math.floor(min / this.width)
    const kMax = Math.floor(max / this.width)
    for (let k = kMin; k <= kMax; k++) shifts.push(-k * this.width)
    return shifts
  }

  // ------------------------------------------------------------- measuring

  private measuring: Extent | null = null

  /**
   * Run a drawing function without painting anything, and report the space
   * it would cover. Painters size a motif to its band this way before
   * committing, so nothing gets sliced off at a band edge.
   */
  measure(draw: () => void): Extent {
    const prev = this.measuring
    const m: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, maxR: 0 }
    this.measuring = m
    try {
      draw()
    } finally {
      this.measuring = prev
    }
    return m
  }

  private note(phys: Pt[], pad: number) {
    const m = this.measuring!
    for (const [x, y] of phys) {
      if (x - pad < m.minX) m.minX = x - pad
      if (x + pad > m.maxX) m.maxX = x + pad
      if (y - pad < m.minY) m.minY = y - pad
      if (y + pad > m.maxY) m.maxY = y + pad
      const r = Math.hypot(x, y) + pad
      if (r > m.maxR) m.maxR = r
    }
  }

  fillPhys(layer: LayerName, theta: number | null, phys: Pt[], color: string, opts: FillOpts = {}) {
    if (this.measuring) {
      if (!opts.erase) this.note(phys, 0)
      return
    }
    const ctx = this.ctx[layer]
    const tex = phys.map((p) => this.toTex(theta, p))
    const cy = phys.reduce((a, p) => a + p[1], 0) / phys.length
    for (const shift of this.copies(tex)) {
      ctx.save()
      ctx.beginPath()
      tex.forEach(([u, v], i) => (i ? ctx.lineTo(u + shift, v) : ctx.moveTo(u + shift, v)))
      ctx.closePath()
      ctx.globalAlpha = opts.alpha ?? 1
      ctx.fillStyle = color
      if (opts.erase) ctx.globalCompositeOperation = 'destination-out'
      ctx.fill(opts.evenOdd ? 'evenodd' : 'nonzero')
      ctx.restore()
      if ((opts.pool || opts.grain) && !opts.erase) {
        ctx.save()
        ctx.beginPath()
        tex.forEach(([u, v], i) => (i ? ctx.lineTo(u + shift, v) : ctx.moveTo(u + shift, v)))
        ctx.closePath()
        ctx.clip()
        if (opts.pool) {
          const ring = tex.map(([u, v]) => [u + shift, v] as Pt)
          // two soft passes: a wide faint band and a tighter darker one at the very edge
          this.strokeTex(ctx, ring, cy, opts.pool.color, opts.pool.width * 2, { alpha: opts.pool.alpha * 0.55, closed: true })
          this.strokeTex(ctx, ring, cy, opts.pool.color, opts.pool.width * 0.8, { alpha: opts.pool.alpha, closed: true })
        }
        if (opts.grain) this.grainStrokes(ctx, theta, phys, shift, cy, opts.grain)
        ctx.restore()
      }
      if (opts.edge) {
        this.strokeTex(ctx, tex.map(([u, v]) => [u + shift, v] as Pt), cy, opts.edge, opts.edgeWidth ?? 0.0012, {
          alpha: opts.edgeAlpha ?? 0.5,
          closed: true,
          join: 'round',
        })
      }
    }
  }

  /** Streaks laid across a shape (already clipped), following the brush direction. */
  private grainStrokes(
    ctx: CanvasRenderingContext2D,
    theta: number | null,
    phys: Pt[],
    shift: number,
    cy: number,
    g: { angle: number; color: string; alpha: number; count?: number },
  ) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [x, y] of phys) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    const cx = (minX + maxX) / 2
    const cyy = (minY + maxY) / 2
    const span = Math.hypot(maxX - minX, maxY - minY)
    if (span < 1e-5) return
    let angle = g.angle
    if (Number.isNaN(angle)) {
      // follow the shape's long axis, as a brush would
      let mx = 0
      let my = 0
      for (const [x, y] of phys) {
        mx += x
        my += y
      }
      mx /= phys.length
      my /= phys.length
      let sxx = 0
      let syy = 0
      let sxy = 0
      for (const [x, y] of phys) {
        sxx += (x - mx) * (x - mx)
        syy += (y - my) * (y - my)
        sxy += (x - mx) * (y - my)
      }
      angle = 0.5 * Math.atan2(2 * sxy, sxx - syy)
    }
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const n = g.count ?? Math.max(3, Math.min(14, Math.round(span / 0.004)))
    // deterministic per shape so repaints match
    let seed = Math.floor((cx * 9301 + cyy * 49297) * 1e4) >>> 0 || 7
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < n; i++) {
      const off = (rnd() - 0.5) * span
      const ox = cx - dy * off
      const oy = cyy + dx * off
      const pts: Pt[] = []
      for (let k = 0; k <= 8; k++) {
        const t = (k / 8 - 0.5) * span
        pts.push(this.toTex(theta, [ox + dx * t, oy + dy * t]))
      }
      const w = span * (0.03 + rnd() * 0.07)
      this.strokeTex(ctx, pts.map(([u, v]) => [u + shift, v] as Pt), cy, g.color, w, { alpha: g.alpha * (0.5 + rnd()), cap: 'round' })
    }
  }

  linePhys(layer: LayerName, theta: number | null, phys: Pt[], color: string, width: number, opts: LineOpts = {}) {
    if (this.measuring) {
      if (!opts.erase) this.note(phys, width / 2)
      return
    }
    const ctx = this.ctx[layer]
    const tex = phys.map((p) => this.toTex(theta, p))
    const cy = phys.reduce((a, p) => a + p[1], 0) / phys.length
    for (const shift of this.copies(tex)) {
      this.strokeTex(ctx, tex.map(([u, v]) => [u + shift, v] as Pt), cy, color, width, opts)
    }
  }

  /**
   * Stroke in texture space with the wall's local anisotropy, so a line has
   * the same physical thickness in every direction.
   */
  private strokeTex(ctx: CanvasRenderingContext2D, tex: Pt[], y: number, color: string, width: number, opts: LineOpts) {
    const sx = this.mode === 'disc' ? this.width : this.width / (TAU * this.R(Math.min(1, Math.max(0, y))))
    const sy = this.height
    ctx.save()
    ctx.scale(sx, sy)
    ctx.beginPath()
    tex.forEach(([u, v], i) => (i ? ctx.lineTo(u / sx, v / sy) : ctx.moveTo(u / sx, v / sy)))
    if (opts.closed) ctx.closePath()
    ctx.globalAlpha = opts.alpha ?? 1
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = opts.cap ?? 'round'
    ctx.lineJoin = opts.join ?? 'round'
    if (opts.dash) ctx.setLineDash(opts.dash)
    if (opts.erase) ctx.globalCompositeOperation = 'destination-out'
    ctx.stroke()
    ctx.restore()
  }

  /** Keep painting inside a horizontal zone until `unclip`. */
  clip(from: number, to: number) {
    for (const k of Object.keys(this.ctx) as LayerName[]) {
      const ctx = this.ctx[k]
      ctx.save()
      ctx.beginPath()
      this.zonePath(ctx, from, to)
      ctx.clip('evenodd')
    }
  }

  /** Band between two heights (wall) or an annulus between two radii (plate). */
  private zonePath(ctx: CanvasRenderingContext2D, from: number, to: number) {
    if (this.mode === 'disc') {
      const cx = this.width / 2
      const cy = this.height / 2
      ctx.arc(cx, cy, to * this.width, 0, TAU)
      if (from > 0) {
        ctx.moveTo(cx + from * this.width, cy)
        ctx.arc(cx, cy, from * this.width, 0, TAU, true)
      }
    } else {
      ctx.rect(0, this.v(to), this.width, this.v(from) - this.v(to))
    }
  }

  unclip() {
    for (const k of Object.keys(this.ctx) as LayerName[]) this.ctx[k].restore()
  }

  /** Full-circumference band between two heights, straight onto a layer. */
  band(layer: LayerName | 'base', from: number, to: number, color: string, alpha = 1) {
    const ctx = layer === 'base' ? this.base : this.ctx[layer]
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.beginPath()
    this.zonePath(ctx, from, to)
    ctx.fill('evenodd')
    ctx.restore()
  }

  /** Scrape a whole zone back to the ground. */
  eraseZone(layer: LayerName, from: number, to: number) {
    const ctx = this.ctx[layer]
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    this.zonePath(ctx, from, to)
    ctx.fill('evenodd')
    ctx.restore()
  }

  /** A painted ring line, wavering slightly as a hand-held brush does. */
  ring(layer: LayerName, y: number, color: string, width: number, rng?: Rng, alpha = 1) {
    const n = 96
    const w = rng ? wobble(rng, 10) : () => 0
    const pts: Pt[] = []
    const R = this.R(y)
    const circ = TAU * R
    for (let i = 0; i <= n; i++) pts.push([(i / n) * circ, y + w(i / n) * 0.0012])
    this.linePhys(layer, 0, pts, color, width, { alpha, cap: 'butt' })
    // stroke seam overlap so the ring closes cleanly
    this.linePhys(layer, 0, [[-0.004, y + w(0) * 0.0012], [0.004, y + w(0) * 0.0012]], color, width, { alpha, cap: 'butt' })
  }

  /** Wheel-thrown ground: colour with soft mottling and faint throwing rings. */
  ground(color: string, mottle: string, amount: number, rings = 0.0) {
    const ctx = this.base
    ctx.fillStyle = color
    ctx.fillRect(0, 0, this.width, this.height)
    const small = makeCanvas(96, 48)
    const sctx = small.getContext('2d', CPU)!
    const img = sctx.createImageData(96, 48)
    let seed = 1234567
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i + 3] = Math.floor(rand() * 255 * amount)
    }
    sctx.putImageData(img, 0, 0)
    sctx.globalCompositeOperation = 'source-in'
    sctx.fillStyle = mottle
    sctx.fillRect(0, 0, 96, 48)
    ctx.save()
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(small, 0, 0, this.width, this.height)
    ctx.restore()
    if (rings > 0) {
      for (let y = 0; y < this.height; y += 2 + Math.floor(rand() * 5)) {
        ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${rings * rand()})` : `rgba(0,0,0,${rings * rand()})`
        ctx.fillRect(0, y, this.width, 1 + Math.floor(rand() * 2))
      }
    }
  }

  /** Composite layers into the albedo map and derive the material map. */
  finish(mat: SurfaceMaterial) {
    const { width: w, height: h } = this
    const matCanvas = makeCanvas(w, h)
    const m = matCanvas.getContext('2d', CPU)!
    m.fillStyle = `rgb(0, ${Math.round(mat.groundGloss * 255)}, 0)`
    m.fillRect(0, 0, w, h)

    const tmp = makeCanvas(w, h)
    const t = tmp.getContext('2d', CPU)!
    const stamp = (src: HTMLCanvasElement, rgb: string) => {
      t.globalCompositeOperation = 'copy'
      t.drawImage(src, 0, 0)
      t.globalCompositeOperation = 'source-in'
      t.fillStyle = rgb
      t.fillRect(0, 0, w, h)
      m.drawImage(tmp, 0, 0)
    }
    stamp(this.layers.paint, `rgb(0, ${Math.round(mat.paintGloss * 255)}, ${Math.round(mat.paintRelief * 255)})`)
    stamp(this.layers.over, `rgb(0, ${Math.round(mat.overGloss * 255)}, ${Math.round(mat.overRelief * 255)})`)
    stamp(this.layers.gold, `rgb(255, ${Math.round(mat.goldGloss * 255)}, ${Math.round(mat.goldRelief * 255)})`)

    // uneven pigment: a brush never lays down a perfectly flat wash
    if (mat.pigmentNoise > 0) {
      const n = makeCanvas(256, 128)
      const nc = n.getContext('2d', CPU)!
      const img = nc.createImageData(256, 128)
      let seed = 987654
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 16807) % 2147483647
        const v = seed / 2147483647
        const light = v > 0.5
        img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 255 : 0
        img.data[i + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 255 * mat.pigmentNoise)
      }
      nc.putImageData(img, 0, 0)
      const pc = this.ctx.paint
      pc.save()
      pc.globalCompositeOperation = 'source-atop'
      pc.imageSmoothingEnabled = true
      pc.drawImage(n, 0, 0, w, h)
      // finer grain on top
      pc.globalAlpha = 0.6
      pc.drawImage(n, 0, 0, w / 6, h / 6)
      for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) pc.drawImage(n, (x * w) / 6, (y * h) / 6, w / 6, h / 6)
      pc.restore()
    }

    const c = this.base
    c.save()
    if (mat.paintBlur > 0) c.filter = `blur(${mat.paintBlur * this.detail}px)`
    c.drawImage(this.layers.paint, 0, 0)
    c.restore()
    c.drawImage(this.layers.over, 0, 0)
    c.drawImage(this.layers.gold, 0, 0)

    // soften relief so the bump reads as raised enamel, not jaggies
    const relief = makeCanvas(w, h)
    const r = relief.getContext('2d', CPU)!
    r.filter = `blur(${1.2 * this.detail}px)`
    r.drawImage(matCanvas, 0, 0)

    // free the working layers
    for (const k of Object.keys(this.layers) as LayerName[]) {
      this.layers[k].width = 1
      this.layers[k].height = 1
    }
    tmp.width = tmp.height = 1
    matCanvas.width = matCanvas.height = 1
    return { color: this.color, mat: relief }
  }
}
