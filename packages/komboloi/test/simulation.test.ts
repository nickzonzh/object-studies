import assert from 'node:assert/strict'
import { test } from 'vitest'
import { MATERIAL_IDS } from '../src/index.js'
import { StrandSimulation } from '../src/lib/simulation.js'
import { buildStrand } from '../src/lib/strand.js'

function hung(options: Parameters<typeof buildStrand>[0]) {
  const sim = new StrandSimulation(buildStrand(options))
  sim.beginSettle()
  while (!sim.settleChunk(240));
  return sim
}

function run(sim: StrandSimulation, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) sim.advance(1 / 60)
}

/** Beads keep their order, never overlap and never pass the papas. */
function assertSpaced(sim: StrandSimulation) {
  const { s, half, strand } = sim
  assert.ok(s[0] - half[0] >= strand.clearance - 1e-6, 'first bead clears the papas')
  for (let i = 1; i < s.length; i++) assert.ok(s[i] - half[i] - (s[i - 1] + half[i - 1]) >= -1e-6, `beads ${i - 1} and ${i} overlap`)
  const last = s.length - 1
  assert.ok(s[last] + half[last] <= strand.cordLength - strand.clearance + 1e-6, 'last bead clears the papas')
}

test('every material hangs still once settled', () => {
  for (const material of MATERIAL_IDS) {
    const sim = hung({ material, beads: 21, seed: 4 })
    run(sim, 1)
    assert.ok(sim.energy() < 30, `${material} is still moving after settling (${sim.energy().toFixed(1)})`)
    assertSpaced(sim)
    // The papas and tassel hang below the peg.
    assert.ok(sim.pendantPoint(0).y > sim.hook.y && sim.pendantPoint(7).y > sim.pendantPoint(0).y)
  }
})

test('counting beads across clacks, and the beads stay spaced', () => {
  const sim = hung({ material: 'onyx', beads: 29, seed: 3 })
  let clacks = 0
  for (let i = 0; i < 12; i++) {
    sim.flickNext()
    for (let f = 0; f < 30; f++) {
      sim.advance(1 / 60)
      clacks += sim.drainImpacts().length
    }
    assertSpaced(sim)
  }
  assert.ok(clacks > 0, 'flicked beads knock into the others')
})

test('a held bead follows the pointer and the strand swings free when let go', () => {
  const sim = hung({ material: 'amber', beads: 21, seed: 42 })
  const start = sim.bead(5)
  const target = { x: start.x + 12, y: start.y - 20 }
  sim.hold({ kind: 'bead', index: 5 }, start)
  sim.moveTo(target)
  run(sim, 0.5)
  const held = sim.bead(5)
  assert.ok(Math.hypot(held.x - target.x, held.y - target.y) < 1.5, 'bead sits under the pointer')
  sim.release()
  run(sim, 0.2)
  assert.ok(sim.energy() > 30, 'the strand is swinging')
  assertSpaced(sim)
})

test('the same input moves the strand the same way every time', () => {
  const a = hung({ material: 'mati', beads: 23, seed: 2 })
  const b = hung({ material: 'mati', beads: 23, seed: 2 })
  for (const sim of [a, b]) {
    sim.swing(1)
    sim.flick(3)
    run(sim, 1.5)
  }
  assert.deepEqual(Array.from(a.x), Array.from(b.x))
  assert.deepEqual(Array.from(a.s), Array.from(b.s))
})

test('the render pose blends between physics steps', () => {
  const sim = hung({ material: 'amber', beads: 13, seed: 1 })
  sim.swing(1)
  sim.advance(1.5 / 240)
  assert.ok(sim.alpha > 0.45 && sim.alpha < 0.55)
  const pose = sim.view()
  for (let i = 0; i < sim.x.length; i++) {
    const lo = Math.min(sim.px[i], sim.x[i]) - 1e-9
    const hi = Math.max(sim.px[i], sim.x[i]) + 1e-9
    assert.ok(pose.x[i] >= lo && pose.x[i] <= hi)
  }
})
