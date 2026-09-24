// Carved Oak clasps, 50 drawing units to one frame width, drawn with the
// same acanthus hand as the running torus (scripts/generate-carving.mjs).
import { carve, flower, leaf, mapPart, precision } from './acanthus.mjs'

precision(1)
const transpose = part => mapPart(part, ([x, y]) => [y, x])

/* Corner clasp with the outer corner at 0,0: an acanthus leaf on the mitre,
   its tip rolled out to the corner, over a pair of leaves that run out along
   the torus from a flowerhead seated in the quirk. The rail pair is drawn
   once and reflected across the diagonal, which keeps the key light in world
   space when the shading layers are offset. */
const railLeaf = leaf({ base: [15, 11.5], ctrl: [36, 4.5], tip: [62, 11], width: 11, lobes: 3, fingers: 3, curl: .12 })
export const corner = carve(
  railLeaf,
  transpose(railLeaf),
  flower(24, 24, 6.6, 7, Math.PI / 4),
  leaf({ base: [28, 28], ctrl: [14, 14.8], tip: [1.8, 1.8], width: 13.5, lobes: 2, fingers: 3, curl: .1, scale: [1, .8] }),
)

/* Centre clasp on the top rail, centred on x = 0: two leaves running out from
   a flowerhead on the torus crest, reaching a frame width either way. */
export const centre = carve(
  leaf({ base: [-5, 11.5], ctrl: [-24, 5.5], tip: [-46, 11.6], width: 9.6, lobes: 3, fingers: 3, curl: .12 }),
  leaf({ base: [5, 11.5], ctrl: [24, 5.5], tip: [46, 11.6], width: 9.6, lobes: 3, fingers: 3, curl: .12 }),
  flower(0, 11.3, 7.2, 8, Math.PI / 8),
)
