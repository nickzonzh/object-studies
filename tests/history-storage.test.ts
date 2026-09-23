import assert from 'node:assert/strict'
import test from 'node:test'
import { createDrawingHistory } from '../src/drawing/history.ts'
import {
  createBoardStorage,
  decodeBoard,
  STORAGE_KEY,
} from '../src/drawing/boardStorage.ts'
import type { DrawingStroke } from '../src/drawing/types.ts'

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

test('clipped sub-strokes undo as one gesture and retain chalk/duster order on redo', () => {
  const history = createDrawingHistory()
  history.commit([chalk(1), chalk(2)])
  history.commit([duster])
  history.undo()
  assert.deepEqual(history.strokes(), [chalk(1), chalk(2)])
  history.undo()
  assert.deepEqual(history.state(), {
    hasMarks: false,
    canUndo: false,
    canRedo: true,
  })
  history.redo()
  history.redo()
  assert.deepEqual(history.strokes(), [chalk(1), chalk(2), duster])
})

test('Clear is reversible across multiple clears and a complete undo/redo traversal', () => {
  const history = createDrawingHistory()
  history.commit([chalk(1)])
  history.clear()
  history.commit([chalk(2), duster])
  history.clear()
  for (let i = 0; i < 4; i++) history.undo()
  assert.deepEqual(history.strokes(), [])
  history.redo()
  assert.deepEqual(history.strokes(), [chalk(1)])
  history.redo()
  assert.deepEqual(history.strokes(), [])
  history.redo()
  assert.deepEqual(history.strokes(), [chalk(2), duster])
  history.redo()
  history.undo()
  assert.deepEqual(history.strokes(), [chalk(2), duster])
})

test('new gestures drop the redo branch; empty gestures and empty Clear do not', () => {
  const history = createDrawingHistory()
  history.commit([chalk(1)])
  history.undo()
  history.commit([])
  history.clear()
  assert.equal(history.state().canRedo, true)
  history.commit([chalk(2)])
  assert.equal(history.state().canRedo, false)
  history.redo()
  assert.deepEqual(history.strokes(), [chalk(2)])
})

test('restored marks are a base drawing, with a fresh session history and undoable Clear', () => {
  const initial = [chalk(1), duster]
  const history = createDrawingHistory(initial)
  history.undo()
  assert.deepEqual(history.strokes(), initial)
  history.clear()
  history.undo()
  assert.deepEqual(history.strokes(), initial)
  assert.equal(history.state().canUndo, false)
})

test('storage round trips all replay data while excluding unrecognised transient fields', () => {
  let value = ''
  const store = createBoardStorage(() => ({
    getItem: (key) => {
      assert.equal(key, STORAGE_KEY)
      return value || null
    },
    setItem: (key, raw) => {
      assert.equal(key, STORAGE_KEY)
      value = raw
    },
  }))
  assert.equal(store.load().status, 'idle')
  const strokes = [chalk(1), duster]
  assert.equal(store.save(strokes), 'saved')
  assert.deepEqual(store.load(), { strokes, status: 'saved' })
  const data = JSON.parse(value)
  data.selected = 'duster'
  data.strokes[0].cursor = { x: 42 }
  assert.deepEqual(decodeBoard(JSON.stringify(data)), strokes)
})

test('malformed, unsupported, out-of-range and excessive saved records are rejected', () => {
  for (const value of [
    null,
    {},
    { version: 2, strokes: [] },
    { version: 1, strokes: [{ ...chalk(1), width: -1 }] },
    {
      version: 1,
      strokes: [{ ...chalk(1), points: [{ x: 0, y: 20, pressure: 4 }] }],
    },
    { version: 1, strokes: [{ ...chalk(1), seed: 1.5 }] },
    {
      version: 1,
      strokes: [{ ...chalk(1), points: [{ x: 1000, y: 20, pressure: 0.5 }] }],
    },
    { version: 1, strokes: Array.from({ length: 4001 }, () => chalk(1)) },
  ])
    assert.throws(() => decodeBoard(JSON.stringify(value)))
  assert.throws(() => decodeBoard('not json'))
  assert.throws(() => decodeBoard(' '.repeat(2_000_001)))
})

test('storage failures remain non-fatal and never report a successful save', () => {
  const blocked = createBoardStorage(() => {
    throw new Error('Storage denied')
  })
  assert.equal(blocked.load().status, 'unavailable')
  assert.equal(blocked.save([chalk(1)]), 'unavailable')
  let writes = 0
  const broken = createBoardStorage(() => ({
    getItem: () => 'invalid old data',
    setItem: () => {
      writes++
      throw new Error('Quota exceeded')
    },
  }))
  assert.equal(broken.load().status, 'invalid')
  assert.equal(writes, 0)
  assert.equal(broken.save([chalk(1)]), 'unavailable')
  assert.equal(
    broken.save(Array.from({ length: 4001 }, () => chalk(1))),
    'full',
  )
  assert.equal(writes, 1)
})

test('the point limit prevents oversized saves without replacing the existing drawing', () => {
  let value = 'existing drawing'
  const store = createBoardStorage(() => ({
    getItem: () => value,
    setItem: (_key, raw) => {
      value = raw
    },
  }))
  const stroke = chalk(1)
  stroke.points = Array.from({ length: 40_001 }, () => ({
    x: 1,
    y: 1,
    pressure: 0.5,
  }))
  assert.equal(store.save([stroke]), 'full')
  assert.equal(value, 'existing drawing')
  stroke.points.pop()
  assert.equal(store.save([stroke]), 'saved')
  assert.equal(store.load().strokes[0].points.length, 40_000)
})
