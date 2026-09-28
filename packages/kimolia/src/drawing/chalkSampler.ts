import { seededRandom } from 'object-studies-core'
import type { ChalkPoint, ChalkStamp } from './types.js'

/** The stick's width follows the slate's size between these bounds. */
export const CHALK_WIDTH = { min: 4.5, max: 7.5 }
/** Distance between stamps, as a share of the stick's width. */
export const CHALK_SPACING = 0.14

export function pressureFor(pointerType: string, pressure: number) {
  return pointerType === 'pen' && Number.isFinite(pressure)
    ? Math.max(0, Math.min(1, pressure))
    : 0.5
}

/**
 * Arc-length sampling carries the unused distance across input events. A fast
 * two-point line and the same line in many input packets leave the same marks,
 * and every property of a stamp derives from the stroke seed and how far along
 * the stroke it sits — so a replay is identical to the live drawing.
 *
 * The stick is worn to a flat facet held at a fixed angle, which is what makes
 * a chalk line change weight as it turns. Its density wanders slowly, and where
 * a low patch meets the slate's grain the chalk misses the surface entirely.
 */
export function createChalkSampler(
  width: number,
  seed: number,
  emit: (stamp: ChalkStamp) => void,
) {
  const next = seededRandom(seed)
  const spacing = width * CHALK_SPACING
  // Per-stroke character, taken before any stamp consumes the sequence.
  const facet = ((34 + next() * 28) * Math.PI) / 180
  const squash = 0.66 + next() * 0.18
  const slowPhase = next() * Math.PI * 2
  const fastPhase = next() * Math.PI * 2
  let previous: ChalkPoint | null = null
  let remaining = spacing
  let distanceSinceStamp = 0
  let travelled = 0
  let skipped = 0
  let ended = false

  const stamp = (point: ChalkPoint, tip: boolean) => {
    // Two slow waves: long stretches of full chalk, occasional starved patches.
    const density =
      0.55 +
      0.45 *
        (0.5 + 0.5 * Math.sin(travelled * 0.055 + fastPhase)) *
        (0.62 + 0.38 * Math.sin(travelled * 0.017 + slowPhase))
    // Starved chalk misses the grain, but never skids over a long gap: two
    // missed stamps in a row and the next one lands whatever happens.
    if (!tip && skipped < 2 && next() < (1 - density) ** 1.9 * 0.7) {
      skipped++
      return
    }
    skipped = 0
    const pressure = Math.max(0, Math.min(1, point.pressure))
    // Widened against the facet, so a stroke keeps its weight while the tip's
    // flat still thins it in one direction.
    const size =
      (width / Math.sqrt(squash)) *
      (0.85 + pressure * 0.3) *
      (0.94 + next() * 0.12) *
      (0.9 + density * 0.13)
    const x = point.x + (next() - 0.5) * 0.45
    const y = point.y + (next() - 0.5) * 0.45
    const angle = facet + (next() - 0.5) * 0.12
    const opacity =
      (0.82 + pressure * 0.36) * (0.9 + next() * 0.2) * (0.66 + density * 0.34)
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
      squash,
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
        stamp(point, true)
        return
      }
      const length = Math.hypot(point.x - previous.x, point.y - previous.y)
      if (length < 1e-6) return
      let walked = remaining
      for (; walked <= length + 1e-8; walked += spacing) {
        const t = Math.min(1, walked / length)
        travelled += spacing
        stamp(
          {
            x: previous.x + (point.x - previous.x) * t,
            y: previous.y + (point.y - previous.y) * t,
            pressure:
              previous.pressure + (point.pressure - previous.pressure) * t,
          },
          false,
        )
      }
      remaining = walked - length
      distanceSinceStamp = spacing - remaining
      previous = point
    },
    end() {
      if (ended) return
      ended = true
      // The tip of a stroke always lands, however starved the chalk had become.
      // Its density is read at the last full step, so a stroke drawn in one
      // packet and the same stroke in many leave the same final mark.
      if (previous && distanceSinceStamp > spacing * 0.35) stamp(previous, true)
    },
  }
}
