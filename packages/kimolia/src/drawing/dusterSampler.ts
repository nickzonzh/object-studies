import type { ChalkPoint } from './types.ts'

// A pass is a sweep, not a pointer event. Sampling carries across packets;
// reversing direction after meaningful travel starts another cleaning pass.
export function createDusterSampler(
  height: number,
  emit: (point: ChalkPoint) => void,
  nextPass: () => void,
) {
  const spacing = height * 0.12
  let previous: ChalkPoint | null = null
  let heading: { x: number; y: number } | null = null
  let travelled = 0
  let remaining = spacing
  let ended = false
  const finishTip = () => {
    if (previous && spacing - remaining > spacing * 0.35) emit(previous)
  }
  return {
    add(point: ChalkPoint) {
      if (ended) return
      if (!previous) {
        previous = point
        emit(point)
        return
      }
      const dx = point.x - previous.x
      const dy = point.y - previous.y
      const length = Math.hypot(dx, dy)
      if (length < 1e-6) return
      const direction = { x: dx / length, y: dy / length }
      heading ??= direction
      if (
        travelled >= height * 0.3 &&
        direction.x * heading.x + direction.y * heading.y < -0.25
      ) {
        finishTip()
        nextPass()
        emit(previous)
        travelled = 0
        remaining = spacing
        heading = direction
      }
      let walked = remaining
      for (; walked <= length + 1e-8; walked += spacing) {
        const t = Math.min(1, walked / length)
        emit({ x: previous.x + dx * t, y: previous.y + dy * t, pressure: 0.5 })
      }
      remaining = walked - length
      travelled += length
      previous = point
    },
    end() {
      if (ended) return
      ended = true
      finishTip()
    },
  }
}
