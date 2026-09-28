// Pupil physics for a googly eye. Units are eye radii, so the same tuning
// works for a 20px eye and a 200px eye. The pupil centre lives inside a disc
// of radius `limit` (1 minus the pupil's own radius).
export type Pupil = { x: number; y: number; vx: number; vy: number }

export type PupilOptions = {
  limit: number
  gravity?: number
  drag?: number
  restitution?: number
  rimFriction?: number
}

export const restingPupil = (limit: number): Pupil => ({ x: 0, y: limit, vx: 0, vy: 0 })

/**
 * Advance the pupil by `dt` seconds under an external acceleration (ax, ay).
 * Pass the NEGATIVE of the eye's own acceleration: when the eye lurches right,
 * the pupil is left behind.
 */
export function stepPupil(p: Pupil, dt: number, ax: number, ay: number, options: PupilOptions): Pupil {
  const { limit, gravity = 34, drag = 1.6, restitution = 0.42, rimFriction = 0.9 } = options
  let vx = p.vx + ax * dt
  let vy = p.vy + (ay + gravity) * dt
  const damp = Math.exp(-drag * dt)
  vx *= damp
  vy *= damp
  let x = p.x + vx * dt
  let y = p.y + vy * dt

  const r = Math.hypot(x, y)
  if (r > limit) {
    const nx = x / r
    const ny = y / r
    x = nx * limit
    y = ny * limit
    const normal = vx * nx + vy * ny
    if (normal > 0) {
      // Bounce off the rim, and let the tangential part roll with some friction.
      // Slow contacts don't bounce at all, so a resting pupil sits still.
      const bounce = normal > 0.6 ? restitution : 0
      const tx = vx - normal * nx
      const ty = vy - normal * ny
      vx = tx * rimFriction - normal * bounce * nx
      vy = ty * rimFriction - normal * bounce * ny
    }
  }
  return { x, y, vx, vy }
}

export const isSettled = (p: Pupil, limit: number) =>
  Math.hypot(p.vx, p.vy) < 0.02 && Math.abs(p.y - limit) < 0.01
