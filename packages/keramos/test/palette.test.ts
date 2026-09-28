import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { beforeAll, test } from 'vitest'
import { type Canvas2D, setCanvasFactory } from '../src/lib/painter.js'
import { SHAPES } from '../src/lib/shapes.js'
import { paintVessel } from '../src/lib/styles.js'

beforeAll(() => {
  setCanvasFactory((w, h) => createCanvas(w, h).getContext('2d') as unknown as Canvas2D)
})

// Palette ids arrive as plain strings from untyped callers, the paint worker's
// messages or a URL, and an object's inherited names must not pass for palettes.
test('a palette the style does not have paints in the style first palette', () => {
  const ikaros = paintVessel(SHAPES.mug, 'ikaros', 'cobalt-gold', 1, 0.3).finish
  for (const id of ['constructor', 'toString', '__proto__', 'attic']) {
    assert.deepEqual(paintVessel(SHAPES.mug, 'ikaros', id, 1, 0.3).finish, ikaros, id)
  }
  const greek = paintVessel(SHAPES.mug, 'black-figure', 'attic', 1, 0.3).finish
  for (const id of ['constructor', 'hasOwnProperty', 'lindos']) {
    assert.deepEqual(paintVessel(SHAPES.mug, 'black-figure', id, 1, 0.3).finish, greek, id)
  }
}, 60_000)
