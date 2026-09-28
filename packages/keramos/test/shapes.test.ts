import assert from 'node:assert/strict'
import { test } from 'vitest'
import { SHAPES, sampleProfile, shapeExtent } from '../src/lib/shapes.js'

test('every profile is positive, smooth and passes through its control points', () => {
  for (const shape of Object.values(SHAPES)) {
    const { r, dr } = sampleProfile(shape.points)
    for (const v of r) assert.ok(v > 0.02, `${shape.id} radius stays positive`)
    for (const [y, rad] of shape.points) {
      const i = Math.round(y * (r.length - 1))
      assert.ok(Math.abs(r[i] - rad) < 0.004, `${shape.id} hits (${y}, ${rad})`)
    }
    for (const d of dr) assert.ok(Number.isFinite(d))
    assert.ok(shape.wall < Math.min(...r), `${shape.id} wall is thinner than the narrowest neck`)
  }
})

test('zones are ordered and inside the vessel', () => {
  for (const shape of Object.values(SHAPES)) {
    let last = -1
    for (const z of [...shape.zones].sort((a, b) => a.from - b.from)) {
      assert.ok(z.from >= 0 && z.to <= 1 && z.from < z.to, `${shape.id} ${z.role}`)
      assert.ok(z.from >= last - 1e-9, `${shape.id} zones do not overlap`)
      last = z.to
    }
  }
})

test('extent includes the handles', () => {
  const amphora = SHAPES.amphora
  const bodyMax = Math.max(...amphora.points.map((p) => p[1]))
  assert.ok(shapeExtent(amphora) > bodyMax)
})
