import assert from 'node:assert/strict'
import { test } from 'vitest'
import { MATERIALS, MATERIAL_IDS, type MaterialId } from '../src/index.js'
import { buildStrand, clampBeadCount } from '../src/lib/strand.js'

test('the same material, count and seed always string the same strand', () => {
  for (const material of MATERIAL_IDS) {
    assert.deepEqual(buildStrand({ material, beads: 21, seed: 42 }), buildStrand({ material, beads: 21, seed: 42 }))
  }
  const a = buildStrand({ material: 'amber', beads: 21, seed: 1 })
  const b = buildStrand({ material: 'amber', beads: 21, seed: 2 })
  assert.notDeepEqual(a.beads, b.beads)
})

test('bead counts are whole numbers from 9 to 45', () => {
  assert.equal(clampBeadCount(undefined), 21)
  assert.equal(clampBeadCount(Number.NaN), 21)
  assert.equal(clampBeadCount(Infinity), 21)
  assert.equal(clampBeadCount(3), 9)
  assert.equal(clampBeadCount(100), 45)
  assert.equal(clampBeadCount(20.6), 21)
  assert.equal(buildStrand({ beads: 33 }).beads.length, 33)
})

test('beads stay close to their material and the cord leaves room to count them', () => {
  for (const material of MATERIAL_IDS) {
    const spec = MATERIALS[material]
    const strand = buildStrand({ material, beads: 25, seed: 9 })
    for (const bead of strand.beads) {
      assert.ok(Math.abs(bead.length / spec.length - 1) < 0.08, `${material} bead length`)
      assert.ok(Math.abs(bead.width / spec.width - 1) < 0.12, `${material} bead width`)
      assert.ok(bead.mass > 0)
    }
    assert.equal(strand.papas.length, strand.papas.width, `${material} papas is round`)
    const strung = strand.beads.reduce((sum, bead) => sum + bead.length, 0)
    assert.ok(strand.cordLength > strung * 1.2, `${material} has slack to count beads across`)
    assert.equal(strand.tassel.colour, spec.tassels[0].colour)
  }
})

test('a chosen tassel colour dresses the cord too, and an unknown material strings amber', () => {
  const strand = buildStrand({ material: 'onyx', tassel: '#c79a3b' })
  assert.equal(strand.tassel.colour, '#c79a3b')
  assert.equal(strand.cordColour, '#c79a3b')
  assert.equal(buildStrand({ material: 'jade' as MaterialId }).material.id, 'amber')
})
