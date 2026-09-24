import { random } from './random.ts'
import type { ChalkPoint, ChalkStamp } from './types.ts'

export function pressureFor(pointerType: string, pressure: number) {
  return pointerType === 'pen' && Number.isFinite(pressure)
    ? Math.max(0, Math.min(1, pressure))
    : 0.5
}

// Arc-length sampling carries the unused distance across input events. A fast
// two-point line and the same line in many input packets leave the same marks.
export function createChalkSampler(
  width: number,
  seed: number,
  emit: (stamp: ChalkStamp) => void,
) {
  const next = random(seed)
  const spacing = width * 0.18
  let previous: ChalkPoint | null = null
  let remaining = spacing
  let distanceSinceStamp = 0
  let ended = false
  const stamp = (point: ChalkPoint) => {
    const pressure = Math.max(0, Math.min(1, point.pressure))
    const size = width * (0.85 + pressure * 0.3) * (0.94 + next() * 0.12)
    const x = point.x + (next() - 0.5) * 0.45
    const y = point.y + (next() - 0.5) * 0.45
    const angle = (next() - 0.5) * 0.14
    const opacity = (0.82 + pressure * 0.36) * (0.9 + next() * 0.2)
    const hasDust = next() < 0.14
    const dustAngle = next() * Math.PI * 2
    const dustDistance = size / 2 + 1 + next() * 3
    const dust = {
      x: point.x + Math.cos(dustAngle) * dustDistance,
      y: point.y + Math.sin(dustAngle) * dustDistance,
      radius: 0.2 + next() * 0.4,
      opacity: 0.02 + next() * 0.05,
    }
    emit({
      ...point,
      x,
      y,
      pressure,
      size,
      angle,
      opacity,
      dust: hasDust ? dust : null,
    })
  }
  return {
    add(point: ChalkPoint) {
      if (ended) return
      if (!previous) {
        previous = point
        stamp(point)
        return
      }
      const length = Math.hypot(point.x - previous.x, point.y - previous.y)
      if (length < 1e-6) return
      let walked = remaining
      for (; walked <= length + 1e-8; walked += spacing) {
        const t = Math.min(1, walked / length)
        stamp({
          x: previous.x + (point.x - previous.x) * t,
          y: previous.y + (point.y - previous.y) * t,
          pressure:
            previous.pressure + (point.pressure - previous.pressure) * t,
        })
      }
      remaining = walked - length
      distanceSinceStamp = spacing - remaining
      previous = point
    },
    end() {
      if (ended) return
      ended = true
      if (previous && distanceSinceStamp > spacing * 0.35) stamp(previous)
    },
  }
}
