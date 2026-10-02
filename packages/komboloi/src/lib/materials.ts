/**
 * What a strand is made of. Each material decides how its beads look, how
 * heavy they hang and how they sound when they knock together.
 */

export type MaterialId = 'amber' | 'cherry-amber' | 'olive-wood' | 'ox-bone' | 'mati' | 'onyx'

export type BeadShape = 'round' | 'olive'

/** A colour as [hue 0-360, saturation 0-100, lightness 0-100]. */
export type Hsl = readonly [number, number, number]

export type Material = {
  id: MaterialId
  label: string
  /** The Greek name, for people who want it. */
  greek: string
  shape: BeadShape
  /** Bead length along the cord, mm. */
  length: number
  /** Bead diameter across the cord, mm. */
  width: number
  /** g/cm³. Heavier strands swing slower and knock harder. */
  density: number
  /** The body colour; every bead wanders a little from it. */
  body: Hsl
  /** How far a bead's colour may wander: hue, saturation, lightness. */
  wander: Hsl
  /** 0 for opaque, up to 1 for glassy. Translucent beads glow where light comes through. */
  translucency: number
  /** 0 matte to 1 glassy. */
  gloss: number
  /** The surface pattern painted into each bead. */
  figure: 'inclusions' | 'grain' | 'pores' | 'eye' | 'banding'
  /** The knock: the centre of the click, how fast it dies, and whether it rings. */
  sound: { pitch: number; decay: number; ring: number }
  /** Silk tassel and cord colours that suit the material. The first is the default. */
  tassels: readonly string[]
  /** The spacer under the papas bead. */
  shield: 'silver' | 'brass' | 'self'
}

export const MATERIALS: Record<MaterialId, Material> = {
  amber: {
    id: 'amber',
    label: 'Amber',
    greek: 'κεχριμπάρι',
    shape: 'round',
    length: 12,
    width: 12,
    density: 1.08,
    body: [36, 92, 50],
    wander: [6, 6, 8],
    translucency: 0.85,
    gloss: 0.9,
    figure: 'inclusions',
    sound: { pitch: 1900, decay: 0.035, ring: 0.1 },
    tassels: ['#7a1f1f', '#2b2420', '#c79a3b'],
    shield: 'silver',
  },
  'cherry-amber': {
    id: 'cherry-amber',
    label: 'Cherry amber',
    greek: 'βυσσινί κεχριμπάρι',
    shape: 'olive',
    length: 15,
    width: 11.5,
    density: 1.1,
    body: [8, 78, 30],
    wander: [5, 8, 6],
    translucency: 0.7,
    gloss: 0.92,
    figure: 'inclusions',
    sound: { pitch: 1700, decay: 0.04, ring: 0.12 },
    tassels: ['#1f1715', '#8a5a1e', '#5c0f14'],
    shield: 'brass',
  },
  'olive-wood': {
    id: 'olive-wood',
    label: 'Olive wood',
    greek: 'ελιά',
    shape: 'olive',
    length: 14,
    width: 11,
    density: 0.95,
    body: [32, 42, 52],
    wander: [5, 8, 7],
    translucency: 0,
    gloss: 0.45,
    figure: 'grain',
    sound: { pitch: 950, decay: 0.022, ring: 0 },
    tassels: ['#3d4a2a', '#2b2420', '#9c6b2f'],
    shield: 'self',
  },
  'ox-bone': {
    id: 'ox-bone',
    label: 'Ox bone',
    greek: 'κόκαλο',
    shape: 'round',
    length: 11,
    width: 11,
    density: 1.9,
    body: [40, 38, 84],
    wander: [4, 8, 4],
    translucency: 0.08,
    gloss: 0.55,
    figure: 'pores',
    sound: { pitch: 2600, decay: 0.028, ring: 0.15 },
    tassels: ['#6b4423', '#1f1715', '#7a1f1f'],
    shield: 'brass',
  },
  mati: {
    id: 'mati',
    label: 'Mati glass',
    greek: 'μάτι',
    shape: 'round',
    length: 11,
    width: 11,
    density: 2.5,
    body: [218, 82, 34],
    wander: [4, 6, 5],
    translucency: 0.55,
    gloss: 1,
    figure: 'eye',
    sound: { pitch: 3700, decay: 0.07, ring: 0.6 },
    tassels: ['#1d3f8f', '#e9e3d4', '#c79a3b'],
    shield: 'silver',
  },
  onyx: {
    id: 'onyx',
    label: 'Black onyx',
    greek: 'όνυχας',
    shape: 'round',
    length: 10,
    width: 10,
    density: 2.65,
    body: [30, 6, 9],
    wander: [10, 4, 3],
    translucency: 0.04,
    gloss: 0.95,
    figure: 'banding',
    sound: { pitch: 3100, decay: 0.045, ring: 0.35 },
    tassels: ['#9a1b1b', '#c79a3b', '#d9d4c7'],
    shield: 'silver',
  },
}

export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[]

export function isMaterialId(value: unknown): value is MaterialId {
  return typeof value === 'string' && Object.hasOwn(MATERIALS, value)
}
