import { seededRandom } from 'object-studies-core'
import { type Hsl, type Material, type MaterialId, MATERIALS } from './materials.js'

/** One bead, as strung: its size, weight and the particular colour it came out. */
export type BeadSpec = {
  /** Along the cord, mm. */
  length: number
  /** Across the cord, mm. */
  width: number
  /** Grams. */
  mass: number
  hsl: Hsl
  /** Seeds the bead's own figure (inclusions, grain, pores). */
  seed: number
  /** How the bead sits turned on the cord, -1 to 1: where its eye or grain faces. */
  turn: number
}

export type Strand = {
  material: Material
  /** The free beads, in order along the cord from one side of the papas to the other. */
  beads: BeadSpec[]
  /** The larger bead both cord ends pass through. */
  papas: BeadSpec
  /** The spacer under the papas. */
  shield: { length: number; width: number; kind: 'silver' | 'brass' | 'self' }
  tassel: { colour: string; length: number; width: number; threads: number }
  cordColour: string
  /** Loop length, mm, measured from the papas round to the papas. */
  cordLength: number
  /** Cord kept clear on each side of the papas: free beads ride between clearance and cordLength - clearance. */
  clearance: number
}

export const MIN_BEADS = 9
export const MAX_BEADS = 45
export const DEFAULT_BEADS = 21

/** How much more cord than beads: the gap that lets beads be flicked along. */
const SLACK = 0.24

export function clampBeadCount(count: number | undefined): number {
  if (count === undefined || !Number.isFinite(count)) return DEFAULT_BEADS
  return Math.min(MAX_BEADS, Math.max(MIN_BEADS, Math.round(count)))
}

/** Grams for a bead of this shape and size. A round bead is a sphere, an olive an ellipsoid. */
export function beadMass(length: number, width: number, density: number): number {
  return ((Math.PI / 6) * length * width * width * density) / 1000
}

const wrapHue = (h: number) => ((h % 360) + 360) % 360
const clampPct = (v: number) => Math.min(100, Math.max(0, v))

/**
 * Strings a komboloi. The same material, count and seed always give the same
 * strand, bead for bead.
 */
export function stringStrand({
  material: materialId = 'amber',
  beads: count,
  seed = 7,
  tassel,
}: {
  material?: MaterialId
  beads?: number
  seed?: number
  tassel?: string
}): Strand {
  const material = MATERIALS[materialId] ?? MATERIALS.amber
  const n = clampBeadCount(count)
  const rand = seededRandom(Math.trunc(seed) * 7919 + n * 104729 + materialId.length)
  const jitter = (spread: number) => (rand() * 2 - 1) * spread

  // A strand is matched by eye, so the beads drift together: a gentle walk in
  // colour along the strand, plus a little of each bead's own.
  let drift: [number, number, number] = [0, 0, 0]
  const makeBead = (scale: number): BeadSpec => {
    const size = 1 + jitter(0.035)
    const length = material.length * scale * size
    const width = material.width * scale * (1 + jitter(0.03)) * size
    drift = [
      drift[0] * 0.8 + jitter(material.wander[0] * 0.5),
      drift[1] * 0.8 + jitter(material.wander[1] * 0.5),
      drift[2] * 0.8 + jitter(material.wander[2] * 0.5),
    ]
    const hsl: Hsl = [
      wrapHue(material.body[0] + drift[0] + jitter(material.wander[0] * 0.5)),
      clampPct(material.body[1] + drift[1] + jitter(material.wander[1] * 0.5)),
      clampPct(material.body[2] + drift[2] + jitter(material.wander[2] * 0.5)),
    ]
    return {
      length,
      width,
      mass: beadMass(length, width, material.density),
      hsl,
      seed: Math.floor(rand() * 0xffffffff) >>> 0,
      turn: jitter(1),
    }
  }

  const beads = Array.from({ length: n }, () => makeBead(1))
  const papasBase = makeBead(1.32)
  // The papas is usually the plainest bead on the strand.
  const papas: BeadSpec = { ...papasBase, length: papasBase.width, hsl: material.body, turn: 0 }
  const shield = {
    length: Math.max(3, material.width * 0.32),
    width: papas.width * 0.82,
    kind: material.shield,
  }
  const clearance = papas.width / 2 + 0.8
  const beadRun = beads.reduce((sum, b) => sum + b.length, 0)
  const cordLength = beadRun * (1 + SLACK) + clearance * 2
  const colour = tassel ?? material.tassels[0]
  return {
    material,
    beads,
    papas,
    shield,
    tassel: {
      colour,
      length: Math.min(72, Math.max(50, material.length * 4.6)),
      width: papas.width * 0.9,
      threads: 34,
    },
    cordColour: colour,
    cordLength,
    clearance,
  }
}
