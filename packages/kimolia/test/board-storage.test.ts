import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createBoardStorage, decodeStrokes } from '../src/drawing/boardStorage.js'
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
const decode = (value: unknown) =>
  decodeStrokes(JSON.parse(JSON.stringify(value)) as Record<string, unknown>)

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
  assert.deepEqual(decode(stored), strokes)
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
    assert.throws(() => decode({ version: 1, strokes }))
  assert.throws(() => decode({ version: 1 }))
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
