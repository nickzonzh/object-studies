import assert from 'node:assert/strict'
import { test } from 'vitest'
import { MATERIALS, MATERIAL_IDS, isMaterialId } from '../src/lib/materials.js'
import { MAX_BEADS, MIN_BEADS, clampBeadCount, stringStrand } from '../src/lib/strand.js'
import { parseColour } from '../src/lib/render.js'

test('the same seed strings the same strand, bead for bead', () => {
  assert.deepEqual(stringStrand({ material: 'amber', seed: 12 }), stringStrand({ material: 'amber', seed: 12 }))
  assert.notDeepEqual(stringStrand({ material: 'amber', seed: 12 }).beads, stringStrand({ material: 'amber', seed: 13 }).beads)
})

test('bead counts are whole and kept in range', () => {
  assert.equal(clampBeadCount(undefined), 21)
  assert.equal(clampBeadCount(Number.NaN), 21)
  assert.equal(clampBeadCount(2), MIN_BEADS)
  assert.equal(clampBeadCount(400), MAX_BEADS)
  assert.equal(clampBeadCount(20.6), 21)
  assert.equal(stringStrand({ beads: 33 }).beads.length, 33)
})

test('there is always cord to spare: the gap that lets beads be flicked', () => {
  for (const material of MATERIAL_IDS) {
    for (const beads of [MIN_BEADS, 21, MAX_BEADS]) {
      const strand = stringStrand({ material, beads })
      const run = strand.beads.reduce((sum, b) => sum + b.length, 0)
      const free = strand.cordLength - strand.clearance * 2 - run
      assert.ok(free > run * 0.15, `${material} × ${beads} has only ${free.toFixed(1)} mm spare`)
    }
  }
})

test('beads stay close to their material, and heavier stuff weighs more', () => {
  for (const material of MATERIAL_IDS) {
    const m = MATERIALS[material]
    for (const bead of stringStrand({ material, seed: 5 }).beads) {
      assert.ok(Math.abs(bead.length - m.length) < m.length * 0.1)
      const dh = Math.abs(((bead.hsl[0] - m.body[0] + 540) % 360) - 180)
      assert.ok(dh <= m.wander[0] * 2 + 1, `${material} hue wandered ${dh}`)
      assert.ok(bead.mass > 0)
    }
  }
  const mass = (material: 'amber' | 'onyx') => stringStrand({ material }).beads[0].mass
  assert.ok(mass('onyx') > mass('amber'))
})

test('materials and tassel colours are what they say', () => {
  assert.ok(isMaterialId('mati'))
  assert.ok(!isMaterialId('plastic'))
  assert.ok(!isMaterialId('toString'))
  assert.equal(stringStrand({ material: 'amber' }).tassel.colour, MATERIALS.amber.tassels[0])
  assert.equal(stringStrand({ material: 'amber', tassel: '#123456' }).cordColour, '#123456')
  assert.deepEqual(parseColour('#fff'), [255, 255, 255])
  assert.deepEqual(parseColour('#1d3f8f'), [29, 63, 143])
  assert.deepEqual(parseColour('rgb(1, 2, 3)'), [1, 2, 3])
  assert.deepEqual(parseColour('papayawhip'), [122, 31, 31])
})
