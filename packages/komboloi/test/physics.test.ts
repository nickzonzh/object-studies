import assert from 'node:assert/strict'
import { test } from 'vitest'
import { Komboloi, STEP } from '../src/lib/physics.js'
import { stringStrand } from '../src/lib/strand.js'
import { MATERIAL_IDS, type MaterialId } from '../src/lib/materials.js'

function hung(material: MaterialId = 'amber', beads = 21) {
  const k = new Komboloi(stringStrand({ material, beads, seed: 7 }))
  k.settle(3)
  return k
}

function assertStrung(k: Komboloi) {
  const { clearance, cordLength, beads } = k.strand
  for (let i = 0; i < beads.length; i++) {
    const lo = i === 0 ? clearance : k.s[i - 1] + beads[i - 1].length / 2
    const hi = i === beads.length - 1 ? cordLength - clearance : k.s[i + 1] - beads[i + 1].length / 2
    assert.ok(k.s[i] - beads[i].length / 2 >= lo - 0.05, `bead ${i} overlaps the one before it`)
    assert.ok(k.s[i] + beads[i].length / 2 <= hi + 0.05, `bead ${i} overlaps the one after it`)
  }
}

test('every material hangs from the hook and comes to rest', () => {
  for (const material of MATERIAL_IDS) {
    const k = new Komboloi(stringStrand({ material, beads: 21, seed: 3 }))
    k.settle(4)
    assert.ok(k.energy() < 50, `${material} is still moving (${k.energy().toFixed(1)})`)
    // The papas hangs straight under the hook, below the loop.
    const papas = k.pendantPoint(0)
    assert.ok(Math.abs(papas.x - k.hook.x) < 8, `${material} papas is off to one side`)
    assert.ok(papas.y > k.hook.y + k.strand.cordLength * 0.35, `${material} papas is too high`)
    assert.ok(papas.y < k.height, `${material} hangs out of frame`)
    assertStrung(k)
  }
})

test('the cord keeps its length', () => {
  const k = hung()
  let length = 0
  for (let i = 0; i < k.cord; i++) {
    const j = (i + 1) % k.cord
    length += Math.hypot(k.x[j] - k.x[i], k.y[j] - k.y[i])
  }
  assert.ok(Math.abs(length - k.strand.cordLength) / k.strand.cordLength < 0.02, `cord is ${length} of ${k.strand.cordLength}`)
})

test('beads fall to the bottom of the loop and leave the gap over the hook', () => {
  const k = hung()
  let topBead = Infinity
  for (let i = 0; i < k.s.length; i++) topBead = Math.min(topBead, k.bead(i).y)
  // The highest bead sits well below the hook: the free cord is up top.
  assert.ok(topBead > k.hook.y + 12, `a bead is resting near the hook (y ${topBead.toFixed(1)})`)
})

test('flicking the next bead sends it across the gap, and it clacks', () => {
  const k = hung()
  const before = Array.from(k.s)
  k.flickNext()
  let impacts = 0
  for (let i = 0; i < 2 / STEP; i++) {
    k.step(STEP)
    impacts += k.drainImpacts().length
  }
  const moved = before.map((s, i) => Math.abs(k.s[i] - s))
  const far = moved.filter((m) => m > 20).length
  assert.equal(far, 1, `expected one bead to cross, ${far} moved far`)
  assert.ok(impacts >= 1, 'the flicked bead landed silently')
  assertStrung(k)
})

test('counting moves one bead across at a time, and turns back when a side is full', () => {
  const k = hung('olive-wood', 17)
  const sides = () => Array.from({ length: k.s.length }, (_, i) => (k.bead(i).x < k.hook.x ? 'left' : 'right'))
  let was = sides()
  const directions = new Set<string>()
  for (let flick = 0; flick < 8; flick++) {
    k.flickNext()
    for (let i = 0; i < 2 / STEP; i++) k.step(STEP)
    const now = sides()
    const crossed = now.flatMap((side, i) => (side !== was[i] ? [side] : []))
    assert.equal(crossed.length, 1, `flick ${flick} moved ${crossed.length} beads across`)
    directions.add(crossed[0])
    was = now
    assertStrung(k)
  }
  assert.equal(directions.size, 2, 'counting should have turned back')
})

test('a held bead follows the pointer, and the strand swings when let go', () => {
  const k = hung()
  const i = 3
  const at = k.bead(i)
  k.hold({ kind: 'bead', index: i }, at)
  const target = { x: at.x + 40, y: at.y - 20 }
  k.moveTo(target)
  for (let f = 0; f < 60; f++) k.advance(1 / 60)
  const now = k.bead(i)
  assert.ok(Math.hypot(now.x - target.x, now.y - target.y) < 1.5, 'the bead did not follow')
  k.release()
  k.advance(1 / 60)
  assert.ok(k.energy() > 100, 'letting go should leave it swinging')
  for (let f = 0; f < 60 * 8; f++) k.advance(1 / 60)
  assertStrung(k)
  assert.ok(Math.abs(k.pendantPoint(0).x - k.hook.x) < 3, 'it should settle back under the hook')
})

test('the cord never comes off the hook', () => {
  const k = hung()
  k.hold({ kind: 'pendant', index: 6 }, k.pendantPoint(6))
  k.moveTo({ x: k.hook.x + 10, y: -200 })
  for (let f = 0; f < 120; f++) k.advance(1 / 60)
  let nearest = Infinity
  for (let i = 0; i < k.cord; i++) nearest = Math.min(nearest, Math.hypot(k.x[i] - k.hook.x, k.y[i] - k.hook.y))
  assert.ok(nearest < k.hookRadius + 1.5, `cord is ${nearest.toFixed(1)} mm from the hook`)
})

test('the same strand, seeded the same, behaves the same', () => {
  const a = hung()
  const b = hung()
  a.flickNext()
  b.flickNext()
  for (let i = 0; i < 200; i++) {
    a.step(STEP)
    b.step(STEP)
  }
  assert.deepEqual(Array.from(a.s), Array.from(b.s))
})
