import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createBoardStorage, decodeStrokes } from '../src/drawing/boardStorage.js'
import { startingDrawing } from '../src/drawing/startingDrawing.js'
import type { DrawingStroke } from '../src/drawing/types.js'

const chalk = (id: number): DrawingStroke => ({
  id,
  tool: 'chalk',
  color: 'blue',
  width: 7,
  seed: id * 71,
  space: { width: 968, height: 578 },
  points: [
    { x: 0, y: 20, pressure: 0.1 },
    { x: 968, y: 80, pressure: 0.8 },
  ],
})
const duster: DrawingStroke = {
  id: 3,
  seed: 213,
  space: { width: 968, height: 578 },
  points: [
    { x: 0, y: 20, pressure: 0.5 },
    { x: 968, y: 80, pressure: 0.5 },
  ],
  tool: 'duster',
  width: 126,
  height: 48,
}
const decode = (value: unknown) => decodeStrokes(JSON.parse(JSON.stringify(value)))

test('a drawing round trips under the chosen key, dropping transient fields', () => {
  const entries = new Map<string, string>()
  const storage = createBoardStorage('kimolia:board:v1', () => ({
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }))
  const strokes = [chalk(1), duster]
  assert.equal(storage.load().status, 'idle')
  assert.equal(storage.save(strokes), 'saved')
  assert.deepEqual(storage.load(), { value: strokes, status: 'saved' })
  const stored = JSON.parse(entries.get('kimolia:board:v1')!)
  assert.equal(stored.version, 1)
  stored.selected = 'duster'
  stored.strokes[0].cursor = { x: 42 }
  assert.deepEqual(decode(stored.strokes), strokes)
  // It takes the array onStrokesChange hands out, not the stored document.
  assert.throws(() => decode(stored))
})

test('malformed, unsupported and out-of-range records are rejected whole', () => {
  for (const strokes of [
    [{ ...chalk(1), width: -1 }],
    [{ ...chalk(1), points: [{ x: 0, y: 20, pressure: 4 }] }],
    [{ ...chalk(1), seed: 1.5 }],
    [{ ...chalk(1), points: [{ x: 1000, y: 20, pressure: 0.5 }] }],
    [{ ...chalk(1), color: 'green' }],
    [{ ...chalk(1), tool: 'marker' }],
    [{ ...duster, height: 0 }],
    [{ ...chalk(1), space: { width: 0, height: 578 } }],
    [{ ...chalk(1), points: [] }],
    Array.from({ length: 4001 }, () => chalk(1)),
    'not an array',
  ])
    assert.throws(() => decode(strokes))
})

test('the point limit prevents an oversized save from replacing the drawing', () => {
  let value = 'existing drawing'
  const storage = createBoardStorage('kimolia:board:v1', () => ({
    getItem: () => value,
    setItem: (_key, raw) => {
      value = raw
    },
    removeItem: () => {},
  }))
  const stroke = chalk(1)
  stroke.points = Array.from({ length: 40_001 }, () => ({
    x: 1,
    y: 1,
    pressure: 0.5,
  }))
  assert.equal(storage.save([stroke]), 'full')
  assert.equal(value, 'existing drawing')
  stroke.points.pop()
  assert.equal(storage.save([stroke]), 'saved')
  assert.equal(storage.load().value?.[0].points.length, 40_000)
})

test('a drawing that would tie up the board on replay is rejected, and never saved', () => {
  // The board draws chalk 4.5–7.5 wide; a finer stick multiplies the stamps.
  for (const strokes of [
    [{ ...chalk(1), width: 0.5 }],
    [{ ...chalk(1), width: 20 }],
    [{ ...duster, height: 4 }],
    [{ ...duster, width: 900 }],
    [{ ...chalk(1), space: { width: 10, height: 10 }, points: [{ x: 1, y: 1, pressure: 0.5 }] }],
  ])
    assert.throws(() => decode(strokes))
  // Few points, but each one crosses a huge slate: millions of stamps.
  const corner = (index: number) => (index % 2 ? 10_000 : 0)
  const zigzag: DrawingStroke = {
    ...chalk(1),
    width: 4.5,
    space: { width: 10_000, height: 10_000 },
    points: Array.from({ length: 200 }, (_, index) => ({
      x: corner(index),
      y: corner(index),
      pressure: 0.5,
    })),
  }
  assert.throws(() => decode([zigzag]), /too costly/)
  let value = 'existing drawing'
  const storage = createBoardStorage('kimolia:board:v1', () => ({
    getItem: () => value,
    setItem: (_key, raw) => {
      value = raw
    },
    removeItem: () => {},
  }))
  assert.equal(storage.save([zigzag]), 'full')
  assert.equal(value, 'existing drawing')
  zigzag.points.length = 100
  assert.deepEqual(decode([zigzag]), [zigzag])
})

test('a saved drawing, even an empty one, beats the template; the owner beats both', () => {
  const template = [chalk(1)]
  const saved = [chalk(2)]
  const owned = [chalk(3)]
  assert.equal(startingDrawing(undefined, saved, template), saved)
  assert.deepEqual(startingDrawing(undefined, [], template), [])
  assert.equal(startingDrawing(undefined, null, template), template)
  assert.deepEqual(startingDrawing(undefined, undefined, undefined), [])
  assert.equal(startingDrawing(owned, saved, template), owned)
  const unreplayable = [{ ...chalk(1), width: 0.5 }]
  assert.throws(() => startingDrawing(undefined, null, unreplayable), /defaultStrokes/)
  assert.throws(() => startingDrawing(unreplayable, saved, template), /`strokes`/)
})
