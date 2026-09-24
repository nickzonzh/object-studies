import assert from 'node:assert/strict'
import { test } from 'vitest'
import { advancePose, clampPoint, settled } from '../src/geometry.js'

const light = { position: 0.1, rotation: 0.76 }
const heavy = { position: 0.48, rotation: 0.82 }

test('captured points stay on the board after leaving every edge', () => {
  const rect = { left: 140, top: 85, width: 920, height: 550 }
  assert.deepEqual(clampPoint({ x: -500, y: -200 }, rect), { x: 140, y: 85 })
  assert.deepEqual(clampPoint({ x: 2000, y: 1400 }, rect), { x: 1060, y: 635 })
  assert.deepEqual(clampPoint({ x: 390.25, y: 202.5 }, rect), {
    x: 390.25,
    y: 202.5,
  })
})

test('pressing either tool puts the contact anchor exactly under the pointer', () => {
  const current = { x: 25, y: 45, angle: -3 }
  const target = { x: 530.25, y: 210.75, angle: -48 }
  for (const weights of [light, heavy]) {
    const pressed = advancePose(current, target, 8.33, weights, true)
    assert.equal(pressed.x, target.x)
    assert.equal(pressed.y, target.y)
    assert.notEqual(pressed.angle, target.angle)
  }
})

test('inertia is equivalent at 60 and 120 Hz, including scale', () => {
  const origin = { x: 0, y: 0, angle: 0, scale: 0.4 }
  const target = { x: 600, y: 350, angle: -48, scale: 1 }
  for (const weights of [light, heavy]) {
    let sixty = origin
    let oneTwenty = origin
    for (let i = 0; i < 6; i++)
      sixty = advancePose(sixty, target, 1000 / 60, weights) as typeof origin
    for (let i = 0; i < 12; i++)
      oneTwenty = advancePose(
        oneTwenty,
        target,
        1000 / 120,
        weights,
      ) as typeof origin
    for (const key of ['x', 'y', 'angle', 'scale'] as const)
      assert.ok(Math.abs(sixty[key] - oneTwenty[key]) < 1e-8)
  }
})

test('a scaleless pose stays scaleless, and a scaled target is adopted', () => {
  const flat = advancePose({ x: 0, y: 0, angle: 0 }, { x: 4, y: 4, angle: 0 }, 16, light)
  assert.equal(flat.scale, undefined)
  const adopted = advancePose(
    { x: 0, y: 0, angle: 0 },
    { x: 4, y: 4, angle: 0, scale: 0.75 },
    16,
    light,
  )
  assert.equal(adopted.scale, 0.75)
})

test('heavier weights lag, and both tools settle without an endless frame loop', () => {
  const origin = { x: 0, y: 0, angle: 0 }
  const target = { x: 600, y: 350, angle: -48 }
  assert.ok(
    advancePose(origin, target, 16, heavy).x <
      advancePose(origin, target, 16, light).x,
  )
  for (const weights of [light, heavy]) {
    let current = origin
    for (let i = 0; i < 120 && !settled(current, target); i++)
      current = advancePose(current, target, 1000 / 60, weights)
    assert.ok(settled(current, target))
  }
})
