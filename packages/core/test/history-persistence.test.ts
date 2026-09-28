import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createGestureHistory } from '../src/history.js'
import { createPersistence, type StorageLike } from '../src/persistence.js'
import { isNumberWithin, isRecord } from '../src/validate.js'

type Mark = { id: number; length: number }
const mark = (id: number): Mark => ({ id, length: id * 2 })

test('clipped sub-strokes undo as one gesture and keep their order on redo', () => {
  const history = createGestureHistory<Mark>()
  history.commit([mark(1), mark(2)])
  history.commit([mark(3)])
  history.undo()
  assert.deepEqual(history.strokes(), [mark(1), mark(2)])
  history.undo()
  assert.deepEqual(history.state(), {
    hasMarks: false,
    canUndo: false,
    canRedo: true,
  })
  history.redo()
  history.redo()
  assert.deepEqual(history.strokes(), [mark(1), mark(2), mark(3)])
})

test('Clear is reversible across multiple clears and a full undo/redo traversal', () => {
  const history = createGestureHistory<Mark>()
  history.commit([mark(1)])
  history.clear()
  history.commit([mark(2), mark(3)])
  history.clear()
  for (let i = 0; i < 4; i++) history.undo()
  assert.deepEqual(history.strokes(), [])
  history.redo()
  assert.deepEqual(history.strokes(), [mark(1)])
  history.redo()
  assert.deepEqual(history.strokes(), [])
  history.redo()
  assert.deepEqual(history.strokes(), [mark(2), mark(3)])
  history.redo()
  history.undo()
  assert.deepEqual(history.strokes(), [mark(2), mark(3)])
})

test('new gestures drop the redo branch; empty gestures and empty Clear do not', () => {
  const history = createGestureHistory<Mark>()
  history.commit([mark(1)])
  history.undo()
  history.commit([])
  history.clear()
  assert.equal(history.state().canRedo, true)
  history.commit([mark(2)])
  assert.equal(history.state().canRedo, false)
  history.redo()
  assert.deepEqual(history.strokes(), [mark(2)])
})

test('restored marks are a base drawing, with a fresh history and undoable Clear', () => {
  const initial = [mark(1), mark(2)]
  const history = createGestureHistory(initial)
  history.undo()
  assert.deepEqual(history.strokes(), initial)
  history.clear()
  history.undo()
  assert.deepEqual(history.strokes(), initial)
  assert.equal(history.state().canUndo, false)
})

test('a committed gesture is copied, so the caller can reuse its array', () => {
  const history = createGestureHistory<Mark>()
  const gesture = [mark(1)]
  history.commit(gesture)
  gesture.push(mark(2))
  history.undo()
  history.redo()
  assert.deepEqual(history.strokes(), [mark(1)])
})

const decode = (document: Record<string, unknown>): Mark[] => {
  if (!Array.isArray(document.marks)) throw new Error('Unsupported document')
  return document.marks.map((value: unknown) => {
    if (
      !isRecord(value) ||
      !isNumberWithin(value.id, 0, 1000) ||
      !isNumberWithin(value.length, 0, 1000)
    )
      throw new Error('Invalid mark')
    return { id: value.id, length: value.length }
  })
}
const store = (initial = new Map<string, string>()) => {
  const entries = initial
  const storage: StorageLike = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
  return { entries, storage }
}
const persistence = (
  getStorage: () => StorageLike | null,
  withinLimits?: (marks: Mark[]) => boolean,
) =>
  createPersistence<Mark[]>({
    key: 'study:test:v1',
    version: 1,
    decode,
    encode: (marks) => ({ marks }),
    getStorage,
    maxCharacters: 90,
    withinLimits,
  })

test('a document round trips under its key, ignoring unrecognised fields', () => {
  const { entries, storage } = store()
  const board = persistence(() => storage)
  assert.deepEqual(board.load(), { value: null, status: 'idle' })
  const marks = [mark(1), mark(2)]
  assert.equal(board.save(marks), 'saved')
  assert.deepEqual(JSON.parse(entries.get('study:test:v1')!), {
    version: 1,
    marks,
  })
  assert.deepEqual(board.load(), { value: marks, status: 'saved' })
  entries.set(
    'study:test:v1',
    JSON.stringify({ version: 1, marks, selected: 'duster' }),
  )
  assert.deepEqual(board.load().value, marks)
  board.remove()
  assert.equal(board.load().status, 'idle')
})

test('another version, malformed data and oversized documents load as invalid', () => {
  const { entries, storage } = store()
  const board = persistence(() => storage)
  for (const raw of [
    'not json',
    '[]',
    JSON.stringify({ version: 2, marks: [] }),
    JSON.stringify({ version: 1 }),
    JSON.stringify({ version: 1, marks: [{ id: 1, length: 4000 }] }),
    JSON.stringify({ version: 1, marks: Array.from({ length: 40 }, () => mark(1)) }),
  ]) {
    entries.set('study:test:v1', raw)
    assert.deepEqual(board.load(), { value: null, status: 'invalid' })
  }
})

test('limits are reported before writing, keeping the existing document intact', () => {
  const { entries, storage } = store()
  const board = persistence(
    () => storage,
    (marks) => marks.length <= 3,
  )
  assert.equal(board.save([mark(1)]), 'saved')
  assert.equal(board.save([mark(1), mark(2), mark(3), mark(4)]), 'full')
  assert.equal(board.save(Array.from({ length: 3 }, () => mark(999))), 'full')
  assert.deepEqual(board.load().value, [mark(1)])
  assert.equal(entries.size, 1)
})

test('storage failures stay non-fatal, and a full quota is not reported as blocked', () => {
  const blocked = persistence(() => {
    throw new Error('Storage denied')
  })
  assert.deepEqual(blocked.load(), { value: null, status: 'unavailable' })
  assert.equal(blocked.save([mark(1)]), 'unavailable')

  const absent = persistence(() => null)
  assert.equal(absent.load().status, 'unavailable')
  assert.equal(absent.save([mark(1)]), 'unavailable')

  const quota = persistence(() => ({
    getItem: () => null,
    setItem: () => {
      throw new DOMException('exceeded', 'QuotaExceededError')
    },
    removeItem: () => {},
  }))
  assert.equal(quota.save([mark(1)]), 'full')

  const broken = persistence(() => ({
    getItem: () => null,
    setItem: () => {
      throw new Error('Storage is disabled')
    },
    removeItem: () => {},
  }))
  assert.equal(broken.save([mark(1)]), 'unavailable')
})

test('another version loads only through migrate, and loading never rewrites it', () => {
  const old = JSON.stringify({ version: 1, items: [mark(1)] })
  const { entries, storage } = store(new Map([['study:test', old]]))
  const seen: number[] = []
  const board = createPersistence<Mark[]>({
    key: 'study:test',
    version: 2,
    decode,
    encode: (marks) => ({ marks }),
    getStorage: () => storage,
    migrate(document, fromVersion) {
      seen.push(fromVersion)
      return fromVersion === 1 ? { marks: document.items } : null
    },
  })
  assert.deepEqual(board.load(), { value: [mark(1)], status: 'saved' })
  assert.equal(entries.get('study:test'), old)
  for (const raw of [
    JSON.stringify({ version: 3, marks: [] }),
    JSON.stringify({ version: '1', items: [] }),
    JSON.stringify({ version: 1, items: 'none' }),
  ]) {
    entries.set('study:test', raw)
    assert.deepEqual(board.load(), { value: null, status: 'invalid' })
  }
  assert.deepEqual(seen, [1, 3, 1])
})

test('save stamps its own version and refuses numbers JSON would turn into null', () => {
  const { entries, storage } = store()
  const board = createPersistence<Mark[]>({
    key: 'study:test',
    version: 1,
    decode,
    encode: (marks) => ({ version: 9, marks }),
    getStorage: () => storage,
  })
  assert.equal(board.save([mark(1)]), 'saved')
  assert.equal(JSON.parse(entries.get('study:test')!).version, 1)
  assert.throws(() => board.save([{ id: 1, length: NaN }]), /NaN/)
  assert.throws(() => board.save([{ id: 1, length: -Infinity }]), /Infinity/)
  assert.deepEqual(board.load(), { value: [mark(1)], status: 'saved' })
})
