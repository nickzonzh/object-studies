import assert from 'node:assert/strict'
import test from 'node:test'
import { advancePose, clampPoint, settled } from '../src/tools/geometry.ts'

test('captured points stay on the slate after leaving every edge', () => {
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
  for (const duster of [false, true]) {
    const pressed = advancePose(current, target, 8.33, duster, true)
    assert.equal(pressed.x, target.x)
    assert.equal(pressed.y, target.y)
  }
})

test('hover inertia is equivalent at 60 and 120 Hz for both tools', () => {
  const origin = { x: 0, y: 0, angle: 0 }
  const target = { x: 600, y: 350, angle: -48 }
  for (const duster of [false, true]) {
    let sixty = origin
    let oneTwenty = origin
    for (let i = 0; i < 6; i++)
      sixty = advancePose(sixty, target, 1000 / 60, duster, false)
    for (let i = 0; i < 12; i++)
      oneTwenty = advancePose(oneTwenty, target, 1000 / 120, duster, false)
    for (const key of ['x', 'y', 'angle'] as const)
      assert.ok(Math.abs(sixty[key] - oneTwenty[key]) < 1e-8)
  }
})

test('duster feels heavier, and both tools settle without an endless frame loop', () => {
  const origin = { x: 0, y: 0, angle: 0 }
  const target = { x: 600, y: 350, angle: -48 }
  assert.ok(
    advancePose(origin, target, 16, true, false).x <
      advancePose(origin, target, 16, false, false).x,
  )
  for (const duster of [false, true]) {
    let current = origin
    for (let i = 0; i < 120 && !settled(current, target); i++)
      current = advancePose(current, target, 1000 / 60, duster, false)
    assert.ok(settled(current, target))
  }
})
