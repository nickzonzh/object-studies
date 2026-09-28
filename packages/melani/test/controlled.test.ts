import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createGestureHistory } from 'object-studies-core'
import { reconcile } from '../src/lib/controlled.ts'
import type { Stroke } from '../src/lib/strokes.ts'

const stroke = (id: string): Stroke => ({
  id, tool: 'marker', color: '#1b2022', width: 6, points: [{ x: 10, y: 20, pressure: 0.5 }],
})

// The board draws `b` on top of `a` and hands [a, b] to its owner.
const drawn = () => {
  const a = stroke('a'), b = stroke('b')
  const history = createGestureHistory<Stroke>([a])
  history.commit([b])
  return { a, b, history }
}

test('an owner that keeps a copy of the drawing keeps its undo history', () => {
  const { history } = drawn()
  assert.equal(reconcile(history, [...history.strokes()]), history)
  assert.ok(history.state().canUndo)
})

test('a stroke the owner refused is not undone, redrawn or kept', () => {
  const { a, history } = drawn()
  const next = reconcile(history, [a])
  assert.notEqual(next, history)
  assert.deepEqual(next.strokes(), [a])
  assert.deepEqual(next.state(), { hasMarks: true, canUndo: false, canRedo: false })
})

test('a clear the owner refused leaves the board clearable', () => {
  const { a, b, history } = drawn()
  history.clear()
  const next = reconcile(history, [a, b])
  assert.deepEqual(next.strokes(), [a, b])
  assert.ok(next.state().hasMarks)
})

test('a drawing the owner replaced starts a new history', () => {
  const { history } = drawn()
  const other = [stroke('a'), stroke('b')]
  const next = reconcile(history, other)
  assert.deepEqual(next.strokes(), other)
  assert.equal(next.state().canUndo, false)
})

test('an uncontrolled board acts on its own history', () => {
  const { history } = drawn()
  assert.equal(reconcile(history, undefined), history)
})
