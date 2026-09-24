import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createTapActivation } from '../src/tapActivation.js'

const control = (id: string) =>
  ({
    dataset: { slot: id },
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: 60,
      bottom: 60,
    }),
  }) as unknown as HTMLElement

const press = (x: number, y: number, pointerType = 'touch', target = control('a')) => ({
  pointerId: 1,
  pointerType,
  isPrimary: true,
  clientX: x,
  clientY: y,
  currentTarget: target,
})

test('a completed touch activates on release, and its own compatibility click does not', () => {
  const tap = createTapActivation()
  const slot = control('white')
  tap.pointerDown(press(20, 20, 'touch', slot))
  assert.deepEqual(tap.pointerUp(press(24, 22, 'touch', slot)), {
    source: 'touch',
    target: slot,
  })
  assert.equal(tap.click({ detail: 1, currentTarget: slot }), null)
})

test('a touch that drags off the control, or is cancelled, activates nothing', () => {
  const tap = createTapActivation()
  const slot = control('white')
  tap.pointerDown(press(20, 20, 'touch', slot))
  assert.equal(tap.pointerUp(press(20, 44, 'touch', slot)), null)
  tap.pointerDown(press(20, 20, 'touch', slot))
  assert.equal(tap.pointerUp(press(90, 20, 'touch', slot)), null)
  tap.pointerDown(press(20, 20, 'touch', slot))
  tap.pointerCancel(press(20, 20, 'touch', slot))
  assert.equal(tap.pointerUp(press(20, 20, 'touch', slot)), null)
})

test('the gesture reports the control it started on, not the one it ended over', () => {
  const tap = createTapActivation()
  const from = control('white')
  const to = control('blue')
  tap.pointerDown(press(20, 20, 'touch', from))
  assert.equal(tap.pointerUp(press(24, 20, 'touch', to))?.target, from)
})

test('mouse, pen and keyboard activate through the click', () => {
  const tap = createTapActivation()
  const slot = control('white')
  tap.pointerDown(press(20, 20, 'mouse', slot))
  assert.equal(tap.pointerUp(press(20, 20, 'mouse', slot)), null)
  assert.deepEqual(tap.click({ detail: 1, currentTarget: slot }), {
    source: 'pointer',
    target: slot,
  })
  assert.deepEqual(tap.click({ detail: 0, currentTarget: slot }), {
    source: 'keyboard',
    target: slot,
  })
})
