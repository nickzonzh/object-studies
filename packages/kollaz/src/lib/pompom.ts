import { tackiness, type GlueField } from './glitter.js'
import type { Rng } from './rng.js'

export type Pompom = {
  id: number
  x: number
  y: number
  r: number
  color: number
  vx: number
  vy: number
  spin: number
  stuck: boolean
}

export type Bounds = { width: number; height: number }

/** A pom pom lands with a little skid, as if dropped from a few centimetres up. */
export function dropPompom(rng: Rng, id: number, x: number, y: number, color: number, r: number): Pompom {
  const a = rng() * Math.PI * 2
  const speed = 40 + rng() * 90
  return { id, x, y, r, color, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, spin: rng() * Math.PI * 2, stuck: false }
}

/** Pressed into tacky glue, a pom pom stays. Anywhere else it is free to roll. */
export function settlePompom(p: Pompom, field: GlueField, now: number) {
  const reach = p.r * 0.45
  const samples = [[0, 0], [reach, 0], [-reach, 0], [0, reach], [0, -reach]]
  p.stuck = samples.some(([dx, dy]) => tackiness(field, p.x + dx, p.y + dy, now) > 0)
  if (p.stuck) { p.vx = 0; p.vy = 0 }
}

/** Knock the table: loose pom poms skitter. */
export function nudgePompoms(list: Pompom[], rng: Rng, strength = 1) {
  for (const p of list) {
    if (p.stuck) continue
    p.vx += (rng() - 0.5) * 160 * strength
    p.vy += (rng() - 0.5) * 160 * strength
  }
}

/**
 * Roll, collide and come to rest. `tilt` is a downhill acceleration used while the
 * mat is tipped; with tilt, pom poms may roll off the bottom edge and are removed.
 */
export function stepPompoms(list: Pompom[], dt: number, bounds: Bounds, tilt = 0): Pompom[] {
  const friction = tilt ? 0.35 : 2.6
  for (const p of list) {
    if (p.stuck) continue
    p.vy += tilt * dt
    const damp = Math.exp(-friction * dt)
    p.vx *= damp
    p.vy *= damp
    if (Math.hypot(p.vx, p.vy) < 2 && !tilt) { p.vx = 0; p.vy = 0 }
    p.x += p.vx * dt
    p.y += p.vy * dt
    // Rolling: fibres turn with the distance travelled.
    p.spin += ((p.vx >= 0 ? 1 : -1) * Math.hypot(p.vx, p.vy) * dt) / p.r
    if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.4 }
    if (p.x > bounds.width - p.r) { p.x = bounds.width - p.r; p.vx = -Math.abs(p.vx) * 0.4 }
    if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy) * 0.4 }
    if (!tilt && p.y > bounds.height - p.r) { p.y = bounds.height - p.r; p.vy = -Math.abs(p.vy) * 0.4 }
  }
  // Soft collisions. Stuck pom poms act as fixed posts.
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      if (a.stuck && b.stuck) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 0.001
      const overlap = a.r + b.r - d
      if (overlap <= 0) continue
      const nx = dx / d
      const ny = dy / d
      const share = a.stuck ? 0 : b.stuck ? 1 : 0.5
      a.x -= nx * overlap * share
      a.y -= ny * overlap * share
      b.x += nx * overlap * (1 - share)
      b.y += ny * overlap * (1 - share)
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (closing < 0) {
        const impulse = -closing * 0.65
        if (!a.stuck) { a.vx -= nx * impulse * (b.stuck ? 2 : 1); a.vy -= ny * impulse * (b.stuck ? 2 : 1) }
        if (!b.stuck) { b.vx += nx * impulse * (a.stuck ? 2 : 1); b.vy += ny * impulse * (a.stuck ? 2 : 1) }
      }
    }
  }
  return list.filter((p) => p.y - p.r <= bounds.height)
}

export const isRolling = (list: Pompom[]) => list.some((p) => !p.stuck && (p.vx !== 0 || p.vy !== 0))
