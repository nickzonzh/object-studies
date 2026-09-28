import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { beforeAll, test } from 'vitest'
import { type Canvas2D, Painter, setCanvasFactory } from '../src/lib/painter.js'
import { SHAPES, type ShapeId } from '../src/lib/shapes.js'
import { paintVessel, type StyleId } from '../src/lib/styles.js'

// The painter draws on browser canvases; a Skia canvas stands in for them in Node.
beforeAll(() => {
  setCanvasFactory((w, h) => createCanvas(w, h).getContext('2d') as unknown as Canvas2D)
})

/** Paint a piece and keep the fixed-size sketch every placement decision is read from. */
function sketchOf(shape: ShapeId, style: StyleId, palette: string, seed: number, detail: number) {
  let sketch: Uint8ClampedArray[] = []
  const finish = Painter.prototype.finish
  Painter.prototype.finish = function (this: Painter, material) {
    sketch = Object.values(this.sketch.ctx).map((ctx) => ctx.getImageData(0, 0, this.sketch.width, this.sketch.height).data)
    return finish.call(this, material)
  }
  try {
    paintVessel(SHAPES[shape], style, palette, seed, detail)
  } finally {
    Painter.prototype.finish = finish
  }
  return sketch
}

// Auto detail follows the displayed size, so a piece must not change its design
// when it is shown larger or smaller, or when the window is resized.
test('a seed paints the same design at any detail', () => {
  const pieces: [ShapeId, StyleId, string, number][] = [
    ['rhodos', 'ikaros', 'cobalt-gold', 21],
    ['plate', 'ikaros', 'folk', 4],
    ['amphora', 'black-figure', 'attic', 3],
  ]
  for (const [shape, style, palette, seed] of pieces) {
    const small = sketchOf(shape, style, palette, seed, 0.3)
    const large = sketchOf(shape, style, palette, seed, 0.9)
    assert.equal(small.length, 3)
    small.forEach((layer, i) => assert.ok(layer.every((v, j) => v === large[i][j]), `${shape} ${palette} ${seed}: layer ${i} differs`))
  }
}, 60_000)
