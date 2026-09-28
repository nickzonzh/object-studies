import { Painter } from './painter.js'
import type { Finish } from './renderer.js'
import { type Shape } from './shapes.js'
import { IKAROS_PALETTES, type IkarosPaletteId, paintIkaros } from './ikaros.js'
import { GREEK_PALETTES, type GreekPaletteId, paintGreek } from './greek.js'
import { paintFolk } from './folk.js'

export type StyleId = 'ikaros' | 'black-figure' | 'red-figure'

/** Every palette id. A style that lacks the one asked for paints in its first palette. */
export type PaletteId = IkarosPaletteId | GreekPaletteId

export type StyleDef = {
  id: StyleId
  label: string
  palettes: { id: PaletteId; label: string }[]
}

export const STYLES: StyleDef[] = [
  {
    id: 'ikaros',
    label: 'Ikaros',
    palettes: Object.values(IKAROS_PALETTES).map((p) => ({ id: p.id, label: p.label })),
  },
  {
    id: 'black-figure',
    label: 'Black-figure',
    palettes: Object.values(GREEK_PALETTES).map((p) => ({ id: p.id, label: p.label })),
  },
  {
    id: 'red-figure',
    label: 'Red-figure',
    palettes: Object.values(GREEK_PALETTES).map((p) => ({ id: p.id, label: p.label })),
  },
]

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function paintVessel(shape: Shape, style: StyleId, palette: string, seed: number, detail = 1) {
  const painter = new Painter(shape, detail)
  if (style === 'ikaros') {
    const id = (Object.hasOwn(IKAROS_PALETTES, palette) ? palette : 'cobalt-gold') as IkarosPaletteId
    const pal = IKAROS_PALETTES[id]
    if (id === 'folk') {
      const surface = paintFolk(painter, shape, seed)
      const finish: Finish = {
        interior: hex('#f1eee6'),
        interiorGloss: 0.95,
        handle: hex(pal.ground),
        handleGloss: 0.95,
        rim: hex('#2a2926'),
        rimGold: 0,
        glaze: 1,
        relief: 0.0016,
        handleStripe: [...hex('#1c1b19'), 1],
      }
      return { ...surface, finish }
    }
    const surface = paintIkaros(painter, shape.zones, id, seed)
    const finish: Finish = {
      interior: hex(pal.ground),
      interiorGloss: 0.95,
      handle: hex(pal.field ?? pal.bandGround),
      handleGloss: 0.95,
      // Lindos copies Iznik, which used no gold; the other palettes are Ikaros's gilded ware
      rim: hex(id === 'lindos' ? pal.cobalt : '#caa55a'),
      rimGold: id === 'lindos' ? 0 : 1,
      glaze: 1,
      relief: 0.0022,
    }
    return { ...surface, finish }
  }
  const id = (Object.hasOwn(GREEK_PALETTES, palette) ? palette : 'attic') as GreekPaletteId
  const pal = GREEK_PALETTES[id]
  const surface = paintGreek(painter, shape, style, id, seed)
  const finish: Finish = {
    interior: hex(pal.slip),
    interiorGloss: 0.72,
    handle: hex(pal.slip),
    handleGloss: 0.72,
    rim: hex(pal.slip),
    rimGold: 0,
    glaze: 0.75,
    relief: 0.0012,
  }
  return { ...surface, finish }
}
