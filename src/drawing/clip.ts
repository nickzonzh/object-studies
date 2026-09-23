import type { ChalkPoint } from './types.ts'

// Clip the travelled segment, rather than pinning outside motion to an edge.
export function clipSegment(
  from: ChalkPoint,
  to: ChalkPoint,
  width: number,
  height: number,
) {
  let enter = 0
  let leave = 1
  const dx = to.x - from.x
  const dy = to.y - from.y
  for (const [p, q] of [
    [-dx, from.x],
    [dx, width - from.x],
    [-dy, from.y],
    [dy, height - from.y],
  ]) {
    if (p === 0) {
      if (q < 0) return null
      continue
    }
    const ratio = q / p
    if (p < 0) enter = Math.max(enter, ratio)
    else leave = Math.min(leave, ratio)
    if (enter > leave) return null
  }
  const point = (t: number): ChalkPoint => ({
    x: from.x + dx * t,
    y: from.y + dy * t,
    pressure: from.pressure + (to.pressure - from.pressure) * t,
  })
  return { from: point(enter), to: point(leave), enter, leave }
}
