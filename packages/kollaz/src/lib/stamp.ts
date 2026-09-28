import { createRng } from './rng.js'

/** A fresh inking gives about five good impressions before the stamp runs dry. */
export const INK_PER_STAMP = 0.22

export const inkAfterStamp = (level: number) => Math.max(0, level - INK_PER_STAMP)

/**
 * How much ink lands at a point on the impression, given the stamp's ink level and a
 * blotchy noise value in [0, 1]. Full ink prints solid; as it runs out, the print
 * breaks up into the patchy texture of a dry stamp.
 */
export function inkCoverage(level: number, noise: number) {
  if (level <= 0) return 0
  const threshold = 1.15 - level * 1.25
  const t = (noise - (threshold - 0.12)) / 0.24
  const s = Math.min(1, Math.max(0, t))
  return s * s * (3 - 2 * s)
}

/**
 * Deterministic blotchy noise over the stamp face, u and v in [0, 1].
 * Low-frequency patches from uneven pressure, plus paper tooth.
 */
export function stampNoise(seed: number) {
  const grid = (n: number) => {
    const rng = createRng(seed * 7 + n)
    const values = Array.from({ length: (n + 1) * (n + 1) }, () => rng())
    return (u: number, v: number) => {
      const x = Math.min(Math.max(u, 0), 1) * n
      const y = Math.min(Math.max(v, 0), 1) * n
      const i = Math.min(Math.floor(x), n - 1)
      const j = Math.min(Math.floor(y), n - 1)
      const fx = x - i
      const fy = y - j
      const a = values[j * (n + 1) + i]
      const b = values[j * (n + 1) + i + 1]
      const c = values[(j + 1) * (n + 1) + i]
      const d = values[(j + 1) * (n + 1) + i + 1]
      return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
    }
  }
  const low = grid(5)
  const mid = grid(17)
  const tooth = grid(61)
  return (u: number, v: number) => 0.55 * low(u, v) + 0.28 * mid(u, v) + 0.17 * tooth(u, v)
}
