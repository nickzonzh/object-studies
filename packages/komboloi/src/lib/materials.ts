/** Hue (degrees), saturation and lightness (percent). */
export type Hsl = readonly [number, number, number]

export type MaterialId = 'amber' | 'cherry-amber' | 'olive-wood' | 'ox-bone' | 'mati' | 'onyx'

export type TasselColour = {
  /** Any CSS hex or rgb() colour. */
  colour: string
  name: string
}

export type Material = {
  id: MaterialId
  label: string
  /** The material's name in Greek. */
  greek: string
  /** Round beads, or longer olive-shaped ones. */
  shape: 'round' | 'olive'
  /** Bead length along the cord, millimetres. */
  length: number
  /** Bead diameter across the cord, millimetres. */
  width: number
  /** Grams per cubic centimetre. Heavier beads knock harder and swing slower. */
  density: number
  /** The base colour every bead varies from. */
  body: Hsl
  /** How far each bead's hue, saturation and lightness may wander from `body`. */
  wander: Hsl
  translucency: number
  gloss: number
  /** What is painted inside each bead. */
  figure: 'inclusions' | 'grain' | 'pores' | 'eye' | 'banding'
  /** The click two beads make: filter pitch (Hz), decay (s) and how much they ring. */
  sound: { pitch: number; decay: number; ring: number }
  /** Traditional tassel colours for this material. The first is the default. */
  tassels: readonly TasselColour[]
  /** The metal cap under the head bead, or a carved one in the bead's own material. */
  shield: 'silver' | 'brass' | 'self'
}

export const MATERIALS: Readonly<Record<MaterialId, Material>> = {
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
    tassels: [
      { colour: '#7a1f1f', name: 'Oxblood' },
      { colour: '#2b2420', name: 'Black' },
      { colour: '#c79a3b', name: 'Gold' },
    ],
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
    tassels: [
      { colour: '#1f1715', name: 'Black' },
      { colour: '#8a5a1e', name: 'Tobacco' },
      { colour: '#5c0f14', name: 'Burgundy' },
    ],
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
    tassels: [
      { colour: '#3d4a2a', name: 'Olive' },
      { colour: '#2b2420', name: 'Black' },
      { colour: '#9c6b2f', name: 'Ochre' },
    ],
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
    tassels: [
      { colour: '#6b4423', name: 'Brown' },
      { colour: '#1f1715', name: 'Black' },
      { colour: '#7a1f1f', name: 'Oxblood' },
    ],
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
    tassels: [
      { colour: '#1d3f8f', name: 'Blue' },
      { colour: '#e9e3d4', name: 'Cream' },
      { colour: '#c79a3b', name: 'Gold' },
    ],
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
    tassels: [
      { colour: '#9a1b1b', name: 'Red' },
      { colour: '#c79a3b', name: 'Gold' },
      { colour: '#d9d4c7', name: 'Ivory' },
    ],
    shield: 'silver',
  },
}

export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[]
