import { gaussian, type Rng } from './rng.js'

// Disappearing purple glue: goes on purple, dries clear. It is tacky while purple.
export const GLUE_DRY_MS = 16000

export type GlueField = { cols: number; rows: number; cell: number; wetAt: Float64Array }

export function createGlueField(width: number, height: number, cell = 4): GlueField {
  const cols = Math.ceil(width / cell)
  const rows = Math.ceil(height / cell)
  return { cols, rows, cell, wetAt: new Float64Array(cols * rows).fill(-Infinity) }
}

export function clearGlue(field: GlueField) {
  field.wetAt.fill(-Infinity)
}

/** Stamp glue along a segment. `now` is when the glue was applied. */
export function paintGlue(field: GlueField, x0: number, y0: number, x1: number, y1: number, radius: number, now: number) {
  const { cols, rows, cell, wetAt } = field
  const length = Math.hypot(x1 - x0, y1 - y0)
  const stamps = Math.max(1, Math.ceil(length / (cell * 0.5)))
  const reach = Math.ceil(radius / cell)
  for (let s = 0; s <= stamps; s++) {
    const t = s / stamps
    const cx = x0 + (x1 - x0) * t
    const cy = y0 + (y1 - y0) * t
    const col = Math.floor(cx / cell)
    const row = Math.floor(cy / cell)
    for (let r = row - reach; r <= row + reach; r++) {
      if (r < 0 || r >= rows) continue
      for (let c = col - reach; c <= col + reach; c++) {
        if (c < 0 || c >= cols) continue
        const dx = (c + 0.5) * cell - cx
        const dy = (r + 0.5) * cell - cy
        if (dx * dx + dy * dy <= radius * radius) {
          const i = r * cols + c
          if (now > wetAt[i]) wetAt[i] = now
        }
      }
    }
  }
}

/** 1 when freshly applied, 0 once dry (or where there is no glue). */
export function tackiness(field: GlueField, x: number, y: number, now: number) {
  const c = Math.floor(x / field.cell)
  const r = Math.floor(y / field.cell)
  if (c < 0 || r < 0 || c >= field.cols || r >= field.rows) return 0
  const age = now - field.wetAt[r * field.cols + c]
  return age < 0 ? 1 : Math.max(0, 1 - age / GLUE_DRY_MS)
}

export type Flake = {
  x: number
  y: number
  size: number
  angle: number
  nx: number
  ny: number
  nz: number
  color: number
  landAt: number
  stuck: boolean
  vx: number
  vy: number
  /** Stacking order when it landed: a piece laid over it later hides it. */
  order: number
  /** Lying under a piece laid on top of it since, so not drawn. */
  hidden: boolean
}

/** Pour flakes around a point. Each flake gets a random facet normal so it glints on its own. */
export function pourFlakes(
  rng: Rng, x: number, y: number, count: number, color: number, now: number, spread = 20, sizeMin = 1.05, sizeRange = 1.45,
): Flake[] {
  const flakes: Flake[] = []
  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2
    const tilt = Math.pow(rng(), 0.7) * 0.95
    flakes.push({
      x: x + gaussian(rng) * spread,
      y: y + gaussian(rng) * spread,
      size: sizeMin + rng() * sizeRange,
      angle: rng() * Math.PI,
      nx: Math.sin(tilt) * Math.cos(theta),
      ny: Math.sin(tilt) * Math.sin(theta),
      nz: Math.cos(tilt),
      color,
      landAt: now + rng() * 140,
      stuck: false,
      vx: 0,
      vy: 0,
      order: 0,
      hidden: false,
    })
  }
  return flakes
}

/** A flake sticks if it lands on tacky glue. Decided once, at landing. */
export function settleFlake(flake: Flake, field: GlueField) {
  flake.stuck = tackiness(field, flake.x, flake.y, flake.landAt) > 0
}

/** Cosine between a flake's facet and the half vector from light (lx, ly, lz) to a viewer straight above. */
export function facing(flake: Pick<Flake, 'x' | 'y' | 'nx' | 'ny' | 'nz'>, lx: number, ly: number, lz: number) {
  let dx = lx - flake.x
  let dy = ly - flake.y
  let dz = lz
  const l = Math.hypot(dx, dy, dz) || 1
  dx /= l; dy /= l; dz /= l
  const hz = dz + 1
  const h = Math.hypot(dx, dy, hz) || 1
  return (flake.nx * dx + flake.ny * dy + flake.nz * hz) / h
}

/** Blinn-Phong highlight for a flake lit from (lx, ly, lz), viewed from straight above. */
export function glint(flake: Pick<Flake, 'x' | 'y' | 'nx' | 'ny' | 'nz'>, lx: number, ly: number, lz: number, shininess = 70) {
  const d = facing(flake, lx, ly, lz)
  return d > 0 ? Math.pow(d, shininess) : 0
}

/**
 * Holographic sequin film: the reflected hue swings as the viewing angle changes,
 * sweeping through the spectrum the way a thin coating does.
 */
export function filmHue(cosine: number) {
  const c = Math.min(1, Math.max(0, cosine))
  return (((190 + (1 - c) * 1100) % 360) + 360) % 360
}

/**
 * One step of tipping the sheet: loose flakes slide off the bottom edge, stuck ones stay put.
 * Returns the flakes that are still on the table.
 */
export function tipStep(flakes: Flake[], dt: number, height: number, rng: Rng) {
  const kept: Flake[] = []
  for (const f of flakes) {
    if (!f.stuck) {
      f.vy += (1400 + rng() * 900) * dt
      f.vx += (rng() - 0.5) * 120 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      if (f.y > height + 24) continue
    }
    kept.push(f)
  }
  return kept
}
