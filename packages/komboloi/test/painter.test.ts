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

test('an overhead swing paints every bead and the tassel with room for their shadows', () => {
  const sim = new StrandSimulation(buildStrand({ material: 'amber', beads: 21, seed: 42 }))
  sim.beginSettle()
  while (!sim.settleChunk(240));
  const start = sim.pendantPoint(7)
  sim.hold({ kind: 'pendant', index: 7 }, start)
  for (let frame = 1; frame <= 10; frame++) {
    sim.moveTo({ x: start.x + sim.width * 2 * frame / 10, y: start.y - sim.width * 2.8 * frame / 10 })
    sim.advance(1 / 60)
  }
  sim.release()
  const painter = new StrandPainter(sim.strand)
  let overhead = false
  let sideways = false
  for (let frame = 0; frame < 90; frame++) {
    sim.advance(1 / 60)
    if (frame % 10 !== 0) continue
    const pose = sim.view()
    const bounds = painter.bounds(pose)
    overhead ||= bounds.top < 0
    sideways ||= bounds.left < -sim.width / 2 || bounds.right > sim.width * 1.5
    const left = Math.floor(bounds.left)
    const top = Math.floor(bounds.top)
    const width = Math.ceil(bounds.right) - left
    const height = Math.ceil(bounds.bottom) - top
    // Draw beyond the proposed bounds too: any pixels in this guard band
    // would be lost when the component allocates just the proposed area.
    const guard = 20
    for (const shadow of [false, true]) {
      const canvas = createCanvas(width + guard * 2, height + guard * 2)
      const ctx = canvas.getContext('2d') as unknown as Canvas2D
      if (shadow) painter.drawShadow(ctx, pose, 1, 1, guard - left, guard - top)
      else painter.draw(ctx, pose, 1, guard - left, guard - top)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let painted = 0
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          const alpha = pixels[(y * canvas.width + x) * 4 + 3]
          if (x < guard || x >= guard + width || y < guard || y >= guard + height)
            assert.equal(alpha, 0, `${shadow ? 'shadow' : 'strand'} clips at frame ${frame}`)
          else if (alpha) painted++
        }
      assert.ok(painted > 100, 'the strand was actually painted')
      if (!shadow)
        for (let n = 0; n < sim.s.length; n++) {
          const p = pose.bead(n)
          const x = Math.round(p.x + guard - left)
          const y = Math.round(p.y + guard - top)
          assert.ok(pixels[(y * canvas.width + x) * 4 + 3] > 0, `bead ${n} stays visible`)
        }
    }
  }
  assert.ok(overhead, 'the swing reached above the original canvas')
  assert.ok(sideways, 'the swing reached past the original canvas sides')
})
