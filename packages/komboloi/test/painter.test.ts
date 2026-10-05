import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { test } from 'vitest'
import { MATERIAL_IDS } from '../src/index.js'
import type { Canvas2D } from '../src/lib/beadTexture.js'
import { StrandPainter } from '../src/lib/painter.js'
import { StrandSimulation } from '../src/lib/simulation.js'
import { buildStrand } from '../src/lib/strand.js'

// The painter draws on browser canvases; a Skia canvas stands in for them in
// Node. Bead textures need OffscreenCanvas, so here beads draw as flat colour.
test('every material paints its peg, beads, papas and shadow where the physics puts them', () => {
  for (const material of MATERIAL_IDS) {
    const sim = new StrandSimulation(buildStrand({ material, beads: 21, seed: 4 }))
    sim.beginSettle()
    while (!sim.settleChunk(240));
    const scale = 4
    const canvas = createCanvas(Math.round(sim.width * 2 * scale), Math.round(sim.height * scale))
    const ctx = canvas.getContext('2d') as unknown as Canvas2D
    const offset = sim.width / 2
    new StrandPainter(sim.strand).draw(ctx, sim.view(), scale, offset)
    const alphaAt = (p: { x: number; y: number }) =>
      ctx.getImageData(Math.round((p.x + offset) * scale), Math.round(p.y * scale), 1, 1).data[3]
    assert.equal(alphaAt(sim.hook), 255, `${material} peg`)
    assert.equal(alphaAt(sim.bead(3)), 255, `${material} bead`)
    assert.equal(alphaAt(sim.pendantPoint(0)), 255, `${material} papas`)
    assert.equal(alphaAt({ x: sim.width * 0.05, y: sim.height * 0.05 }), 0, `${material} wall stays clear`)

    const shade = createCanvas(Math.round(sim.width), Math.round(sim.height * 0.54))
    const shadeCtx = shade.getContext('2d') as unknown as Canvas2D
    new StrandPainter(sim.strand).drawShadow(shadeCtx, sim.view(), 0.5, 0.5, offset)
    const papas = sim.pendantPoint(0)
    assert.ok(shadeCtx.getImageData(Math.round((papas.x + offset + 2.6) * 0.5), Math.round((papas.y + 4.2) * 0.5), 1, 1).data[3] > 0)
  }
})
