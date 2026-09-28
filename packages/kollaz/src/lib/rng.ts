// Seeded randomness so a torn edge or a glitter pour can be replayed exactly.
import { seededRandom } from 'object-studies-core'

export type Rng = () => number

export const createRng: (seed: number) => Rng = seededRandom

export function gaussian(rng: Rng) {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
