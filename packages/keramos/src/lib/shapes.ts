// Vessel profiles. Every vessel is a surface of revolution around the y axis,
// with height normalised to 1. Radii use the same unit.
//
// Zones split the outer wall into horizontal regions that a paint style can
// decorate. `field` zones take compositions (florals, figure friezes). `band`
// zones take repeating borders. `rim` and `foot` are the finishing edges.

export type ZoneRole = 'foot' | 'base' | 'body' | 'shoulder' | 'neck' | 'collar' | 'rim'

export type Zone = {
  role: ZoneRole
  from: number
  to: number
}

export type Handle = {
  /** Start (on the body), control point, end (on the neck). Local (radius, height). */
  a: [number, number]
  c: [number, number]
  b: [number, number]
  /** Angle around the vessel, radians. */
  angle: number
  /** Tube radius. */
  radius: number
  /** Flattening of the tube cross-section (1 = round, >1 = strap). */
  flat: number
}

export type ShapeId = 'rhodos' | 'baluster' | 'jug' | 'mug' | 'plate' | 'amphora' | 'lekythos'

export type Shape = {
  id: ShapeId
  /** Vessels turn on their axis; a plate hangs face-on and spins in place. */
  kind: 'vessel' | 'plate'
  /** Real-world height (or plate diameter) in millimetres, so brushwork is painted at true scale. */
  sizeMm: number
  label: string
  note: string
  /** Control points (height, radius), bottom to top. */
  points: [number, number][]
  wall: number
  floor: number
  zones: Zone[]
  handles: Handle[]
}

export const SHAPES: Record<ShapeId, Shape> = {
  rhodos: {
    id: 'rhodos',
    kind: 'vessel',
    sizeMm: 300,
    label: 'Rhodos bottle',
    note: 'Round belly, tall flared neck',
    points: [
      [0, 0.158], [0.022, 0.1635], [0.042, 0.1555], [0.06, 0.164],
      [0.1, 0.222], [0.17, 0.27], [0.25, 0.288], [0.33, 0.283],
      [0.41, 0.25], [0.48, 0.19], [0.53, 0.14], [0.58, 0.113],
      [0.66, 0.101], [0.75, 0.104], [0.83, 0.121], [0.9, 0.148],
      [0.955, 0.172], [0.985, 0.182], [1, 0.184],
    ],
    wall: 0.012,
    floor: 0.06,
    zones: [
      { role: 'foot', from: 0, to: 0.05 },
      { role: 'base', from: 0.05, to: 0.09 },
      { role: 'body', from: 0.09, to: 0.455 },
      { role: 'shoulder', from: 0.455, to: 0.545 },
      { role: 'neck', from: 0.545, to: 0.865 },
      { role: 'collar', from: 0.865, to: 0.968 },
      { role: 'rim', from: 0.968, to: 1 },
    ],
    handles: [],
  },
  baluster: {
    id: 'baluster',
    kind: 'vessel',
    sizeMm: 320,
    label: 'Baluster vase',
    note: 'Tall ovoid body, short neck',
    points: [
      [0, 0.128], [0.025, 0.1335], [0.047, 0.1255], [0.07, 0.138],
      [0.14, 0.19], [0.26, 0.24], [0.4, 0.262], [0.52, 0.258],
      [0.64, 0.228], [0.74, 0.18], [0.8, 0.14], [0.845, 0.118],
      [0.89, 0.112], [0.935, 0.118], [0.97, 0.132], [1, 0.138],
    ],
    wall: 0.012,
    floor: 0.07,
    zones: [
      { role: 'foot', from: 0, to: 0.055 },
      { role: 'base', from: 0.055, to: 0.11 },
      { role: 'body', from: 0.11, to: 0.7 },
      { role: 'shoulder', from: 0.7, to: 0.79 },
      { role: 'neck', from: 0.795, to: 0.845 },
      { role: 'collar', from: 0.85, to: 0.968 },
      { role: 'rim', from: 0.968, to: 1 },
    ],
    handles: [],
  },
  jug: {
    id: 'jug',
    kind: 'vessel',
    sizeMm: 260,
    label: 'Oinochoe jug',
    note: 'Wine jug with a looped handle',
    points: [
      [0, 0.15], [0.025, 0.1555], [0.047, 0.1475], [0.07, 0.16],
      [0.12, 0.215], [0.22, 0.268], [0.33, 0.285], [0.44, 0.272],
      [0.54, 0.228], [0.62, 0.17], [0.68, 0.126], [0.74, 0.104],
      [0.82, 0.098], [0.9, 0.108], [0.96, 0.128], [1, 0.136],
    ],
    wall: 0.011,
    floor: 0.07,
    zones: [
      { role: 'foot', from: 0, to: 0.05 },
      { role: 'base', from: 0.05, to: 0.1 },
      { role: 'body', from: 0.1, to: 0.52 },
      { role: 'shoulder', from: 0.52, to: 0.62 },
      { role: 'neck', from: 0.62, to: 0.87 },
      { role: 'collar', from: 0.87, to: 0.968 },
      { role: 'rim', from: 0.968, to: 1 },
    ],
    handles: [
      { a: [0.262, 0.5], c: [0.4, 0.97], b: [0.118, 0.935], angle: Math.PI, radius: 0.019, flat: 1.5 },
    ],
  },
  mug: {
    id: 'mug',
    kind: 'vessel',
    sizeMm: 95,
    label: 'Tankard mug',
    note: 'Wide-based mug with a spurred handle',
    points: [
      [0, 0.395], [0.012, 0.41], [0.03, 0.418], [0.12, 0.424],
      [0.3, 0.42], [0.5, 0.405], [0.7, 0.383], [0.86, 0.365],
      [0.95, 0.357], [0.985, 0.356], [1, 0.352],
    ],
    wall: 0.032,
    floor: 0.07,
    zones: [
      { role: 'base', from: 0.02, to: 0.11 },
      { role: 'body', from: 0.11, to: 0.8 },
      { role: 'collar', from: 0.8, to: 0.955 },
      { role: 'rim', from: 0.955, to: 1 },
    ],
    handles: [
      { a: [0.405, 0.18], c: [0.9, 0.46], b: [0.37, 0.85], angle: Math.PI, radius: 0.046, flat: 1.35 },
      { a: [0.5, 0.8], c: [0.57, 0.9], b: [0.585, 1.0], angle: Math.PI, radius: 0.036, flat: 1.3 },
    ],
  },
  plate: {
    id: 'plate',
    kind: 'plate',
    sizeMm: 300,
    label: 'Wall plate',
    note: 'A hanging plate with a painted well and rim',
    // A plate's zones are radii from the centre (the face spans radius 0 to 0.5).
    points: [[0, 0.5], [1, 0.5]],
    wall: 0,
    floor: 0,
    zones: [
      { role: 'body', from: 0, to: 0.27 },
      { role: 'shoulder', from: 0.275, to: 0.335 },
      { role: 'collar', from: 0.345, to: 0.478 },
      { role: 'rim', from: 0.482, to: 0.5 },
    ],
    handles: [],
  },
  amphora: {
    id: 'amphora',
    kind: 'vessel',
    sizeMm: 400,
    label: 'Neck amphora',
    note: 'Two handles, egg body, flared foot',
    points: [
      [0, 0.148], [0.018, 0.15], [0.03, 0.132], [0.05, 0.098],
      [0.075, 0.09], [0.11, 0.122], [0.2, 0.2], [0.33, 0.262],
      [0.47, 0.285], [0.59, 0.27], [0.67, 0.232], [0.72, 0.18],
      [0.755, 0.13], [0.79, 0.112], [0.86, 0.108], [0.905, 0.114],
      [0.935, 0.14], [0.975, 0.152], [1, 0.146],
    ],
    wall: 0.012,
    floor: 0.1,
    zones: [
      { role: 'foot', from: 0, to: 0.075 },
      { role: 'base', from: 0.075, to: 0.24 },
      { role: 'body', from: 0.29, to: 0.6 },
      { role: 'shoulder', from: 0.63, to: 0.75 },
      { role: 'neck', from: 0.775, to: 0.915 },
      { role: 'collar', from: 0.925, to: 0.975 },
      { role: 'rim', from: 0.975, to: 1 },
    ],
    handles: [
      { a: [0.235, 0.66], c: [0.34, 0.95], b: [0.106, 0.87], angle: 0, radius: 0.021, flat: 1.25 },
      { a: [0.235, 0.66], c: [0.34, 0.95], b: [0.106, 0.87], angle: Math.PI, radius: 0.021, flat: 1.25 },
    ],
  },
  lekythos: {
    id: 'lekythos',
    kind: 'vessel',
    sizeMm: 320,
    label: 'Lekythos',
    note: 'Slender oil flask, one handle',
    points: [
      [0, 0.1], [0.018, 0.102], [0.034, 0.086], [0.05, 0.066],
      [0.07, 0.072], [0.1, 0.118], [0.14, 0.138], [0.3, 0.146],
      [0.5, 0.152], [0.61, 0.152], [0.645, 0.146], [0.672, 0.118],
      [0.7, 0.07], [0.72, 0.046], [0.76, 0.04], [0.82, 0.042],
      [0.86, 0.052], [0.92, 0.068], [0.97, 0.074], [1, 0.07],
    ],
    wall: 0.01,
    floor: 0.1,
    zones: [
      { role: 'foot', from: 0, to: 0.07 },
      { role: 'base', from: 0.07, to: 0.14 },
      { role: 'body', from: 0.2, to: 0.585 },
      { role: 'shoulder', from: 0.645, to: 0.705 },
      { role: 'neck', from: 0.72, to: 0.84 },
      { role: 'collar', from: 0.86, to: 0.975 },
      { role: 'rim', from: 0.975, to: 1 },
    ],
    handles: [
      { a: [0.125, 0.668], c: [0.2, 0.86], b: [0.04, 0.8], angle: Math.PI, radius: 0.0135, flat: 1.4 },
    ],
  },
}

/** A shape as the package describes it publicly; its geometry stays inside. */
export type ShapeInfo = {
  readonly id: ShapeId
  readonly label: string
  readonly note: string
  readonly kind: 'vessel' | 'plate'
}

/** Published copies, so nothing outside can reach the geometry the painter reads. */
export const SHAPE_INFO: Readonly<Record<ShapeId, ShapeInfo>> = Object.freeze(
  Object.fromEntries(
    Object.values(SHAPES).map(({ id, label, note, kind }) => [id, Object.freeze({ id, label, note, kind })]),
  ) as Record<ShapeId, ShapeInfo>,
)

export const PROFILE_SAMPLES = 1024

/** Monotone cubic (Fritsch–Carlson) interpolation keeps the wall free of wobbles. */
export function sampleProfile(points: [number, number][], samples = PROFILE_SAMPLES) {
  const n = points.length
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const d: number[] = []
  const m: number[] = new Array(n).fill(0)
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else {
      const h0 = xs[i] - xs[i - 1]
      const h1 = xs[i + 1] - xs[i]
      const w1 = 2 * h1 + h0
      const w2 = h1 + 2 * h0
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }
  const r = new Float32Array(samples)
  let seg = 0
  for (let s = 0; s < samples; s++) {
    const x = s / (samples - 1)
    while (seg < n - 2 && x > xs[seg + 1]) seg++
    const h = xs[seg + 1] - xs[seg]
    const t = Math.min(1, Math.max(0, (x - xs[seg]) / h))
    const t2 = t * t
    const t3 = t2 * t
    r[s] =
      (2 * t3 - 3 * t2 + 1) * ys[seg] +
      (t3 - 2 * t2 + t) * h * m[seg] +
      (-2 * t3 + 3 * t2) * ys[seg + 1] +
      (t3 - t2) * h * m[seg + 1]
  }
  // A light Gaussian pass takes the tiny kinks out where spline segments
  // meet. Invisible in the silhouette, but a mirror-bright gold foot shows
  // every one of them as a jump in its reflection.
  const smooth = (src: Float32Array, sigma: number) => {
    const out = new Float32Array(src.length)
    const rad = Math.ceil(sigma * 3)
    const w: number[] = []
    for (let k = -rad; k <= rad; k++) w.push(Math.exp(-(k * k) / (2 * sigma * sigma)))
    for (let i = 0; i < src.length; i++) {
      let acc = 0
      let sum = 0
      for (let k = -rad; k <= rad; k++) {
        const j = i + k
        if (j < 0 || j >= src.length) continue
        acc += src[j] * w[k + rad]
        sum += w[k + rad]
      }
      out[i] = acc / sum
    }
    // keep the very ends exact so the rim and the base sit where they should
    out[0] = src[0]
    out[src.length - 1] = src[src.length - 1]
    return out
  }
  const rs = smooth(r, samples / 512)
  const raw = new Float32Array(samples)
  for (let s = 0; s < samples; s++) {
    const a = rs[Math.max(0, s - 1)]
    const b = rs[Math.min(samples - 1, s + 1)]
    const span = (Math.min(samples - 1, s + 1) - Math.max(0, s - 1)) / (samples - 1)
    raw[s] = (b - a) / span
  }
  const dr = smooth(raw, samples / 340)
  return { r: rs, dr }
}

export function radiusAt(r: Float32Array, y: number) {
  const f = Math.min(1, Math.max(0, y)) * (r.length - 1)
  const i = Math.floor(f)
  const j = Math.min(r.length - 1, i + 1)
  return r[i] + (r[j] - r[i]) * (f - i)
}

/** Horizontal extent of the object including handles, for framing. */
export function shapeExtent(shape: Shape) {
  if (shape.kind === 'plate') return 0.5
  let max = 0
  for (const p of shape.points) max = Math.max(max, p[1])
  for (const h of shape.handles) {
    for (let t = 0; t <= 1; t += 0.05) {
      const x = (1 - t) * (1 - t) * h.a[0] + 2 * (1 - t) * t * h.c[0] + t * t * h.b[0]
      max = Math.max(max, x + h.radius * h.flat)
    }
  }
  return max
}

/** Highest point of the object, including handles that rise above the rim. */
export function shapeTop(shape: Shape) {
  let top = 1
  for (const h of shape.handles) top = Math.max(top, h.b[1] + h.radius, h.c[1] * 0.5 + h.b[1] * 0.5 + h.radius)
  return top
}
