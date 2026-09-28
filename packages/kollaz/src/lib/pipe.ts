import type { Point } from './tornEdge.js'

/** A craft pipe cleaner cut in half: about 15 cm of chenille. */
export const PIPE_LENGTH = 330
/** Chenille radius, about 3 mm. */
export const PIPE_RADIUS = 6.5

export const pathLength = (points: Point[]) =>
  points.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0), 0)

/** Stop the path once it has used up the pipe cleaner's length. */
export function trimToLength(points: Point[], max = PIPE_LENGTH): Point[] {
  if (!points.length) return []
  const out: Point[] = [points[0]]
  let used = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (used + len >= max) {
      const t = (max - used) / (len || 1)
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      return out
    }
    used += len
    out.push(b)
  }
  return out
}

/** Chaikin smoothing: wire bends in curves, never sharp corners. Endpoints stay put. */
export function smoothPath(points: Point[], iterations = 3): Point[] {
  let pts = points
  for (let n = 0; n < iterations && pts.length > 2; n++) {
    const next: Point[] = [pts[0]]
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 })
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 })
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  return pts
}

/** Evenly spaced points along a path, each with the direction of travel there. */
export function resamplePath(points: Point[], spacing: number): (Point & { angle: number })[] {
  const out: (Point & { angle: number })[] = []
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (!len) continue
    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    let d = carry
    while (d <= len) {
      out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len, angle })
      d += spacing
    }
    carry = d - len
  }
  return out
}
