import { seededRandom } from 'object-studies-core'
import { type Hsl, type Material, type MaterialId, MATERIALS } from './materials.js'

export type Bead = {
  /** Millimetres along the cord. */
  length: number
  /** Millimetres across the cord. */
  width: number
  /** Grams. */
  mass: number
  hsl: Hsl
  /** Seeds the pattern painted inside this one bead. */
  seed: number
  /** Which way a mati bead's eye is turned, from -1 to 1. */
  turn: number
}

export type Strand = {
  material: Material
  beads: Bead[]
  /** The larger head bead, the papas, that gathers both ends of the loop. */
  papas: Bead
  shield: { length: number; width: number; kind: Material['shield'] }
  tassel: { colour: string; length: number; width: number; threads: number }
  cordColour: string
  /** Total loop length in millimetres. */
  cordLength: number
  /** Cord kept clear of beads either side of the papas. */
  clearance: number
}

export type StrandOptions = {
  material?: MaterialId
  beads?: number
  seed?: number
  tassel?: string
}

export const DEFAULT_BEADS = 21

/** Whole beads between 9 and 45. Anything unusable falls back to 21. */
export function clampBeadCount(beads: number | undefined): number {
  return beads === undefined || !Number.isFinite(beads)
    ? DEFAULT_BEADS
    : Math.min(45, Math.max(9, Math.round(beads)))
}

/** Grams for an ellipsoid bead of the given size (mm) and density (g/cm³). */
export function beadMass(length: number, width: number, density: number): number {
  return ((Math.PI / 6) * length * width * width * density) / 1e3
}

const wrapHue = (hue: number) => ((hue % 360) + 360) % 360
const clampPercent = (value: number) => Math.min(100, Math.max(0, value))

/**
 * Every bead on a strand varies a little in size and colour, and neighbours
 * drift together the way beads cut from one piece of material do. The same
 * material, count and seed always strings the same strand.
 */
export function buildStrand({ material = 'amber', beads, seed = 7, tassel }: StrandOptions): Strand {
  const spec = MATERIALS[material] ?? MATERIALS.amber
  const count = clampBeadCount(beads)
  const random = seededRandom(Math.trunc(seed) * 7919 + count * 104729 + material.length)
  const jitter = (amount: number) => (random() * 2 - 1) * amount
  let drift = [0, 0, 0]

  const cut = (scale: number): Bead => {
    const size = 1 + jitter(0.035)
    const length = spec.length * scale * size
    const width = spec.width * scale * (1 + jitter(0.03)) * size
    drift = [
      drift[0] * 0.8 + jitter(spec.wander[0] * 0.5),
      drift[1] * 0.8 + jitter(spec.wander[1] * 0.5),
      drift[2] * 0.8 + jitter(spec.wander[2] * 0.5),
    ]
    const hsl: Hsl = [
      wrapHue(spec.body[0] + drift[0] + jitter(spec.wander[0] * 0.5)),
      clampPercent(spec.body[1] + drift[1] + jitter(spec.wander[1] * 0.5)),
      clampPercent(spec.body[2] + drift[2] + jitter(spec.wander[2] * 0.5)),
    ]
    return {
      length,
      width,
      mass: beadMass(length, width, spec.density),
      hsl,
      seed: Math.floor(random() * 4294967295) >>> 0,
      turn: jitter(1),
    }
  }

  const strung = Array.from({ length: count }, () => cut(1))
  const head = cut(1.32)
  // The papas is round whatever the material's shape, in the material's own colour.
  const papas: Bead = { ...head, length: head.width, hsl: spec.body, turn: 0 }
  const shield = {
    length: Math.max(3, spec.width * 0.32),
    width: papas.width * 0.82,
    kind: spec.shield,
  }
  const clearance = papas.width / 2 + 0.8
  const cordLength = strung.reduce((sum, bead) => sum + bead.length, 0) * 1.24 + clearance * 2
  const colour = tassel ?? spec.tassels[0].colour

  return {
    material: spec,
    beads: strung,
    papas,
    shield,
    tassel: {
      colour,
      length: Math.min(72, Math.max(50, spec.length * 4.6)),
      width: papas.width * 0.9,
      threads: 34,
    },
    cordColour: colour,
    cordLength,
    clearance,
  }
}
