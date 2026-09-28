import assert from 'node:assert/strict'
import { test } from 'vitest'
import type { StorageLike } from 'object-studies-core'
import { createBoardPersistence } from '../src/lib/persistence.ts'
import { boardPoint, type Stroke } from '../src/lib/strokes.ts'

const KEY = 'melani:whiteboard:v2'

const store = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial))
  const api: StorageLike & { data: Map<string, string> } = {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
    removeItem: (key) => { data.delete(key) },
  }
  return api
}

const stroke = (id = 'a'): Stroke => ({
  id, tool: 'marker', color: '#1b2022', width: 6,
  points: [{ x: 10, y: 20, pressure: 0.5 }, { x: 30, y: 40, pressure: 0.6, angle: -38 }],
})

test('a saved board round-trips through storage', () => {
  const storage = store()
  const persistence = createBoardPersistence(KEY, () => storage)
  assert.equal(persistence.save([stroke()]), 'saved')
  assert.equal(JSON.parse(storage.data.get(KEY)!).version, 2)
  const loaded = persistence.load()
  assert.equal(loaded.status, 'saved')
  assert.deepEqual(loaded.strokes, [stroke()])
})

test('a clipped stroke keeps its segment break after reload', () => {
  const storage = store()
  const split: Stroke = {
    ...stroke('split'),
    points: [
      { x: 10, y: 20, pressure: 0.5 },
      { x: 30, y: 40, pressure: 0.6, angle: -38, breakBefore: true },
    ],
  }
  const persistence = createBoardPersistence(KEY, () => storage)
  assert.equal(persistence.save([split]), 'saved')
  assert.deepEqual(persistence.load().strokes, [split])
})

test('a corrupted board is reported, not restored and not overwritten', () => {
  for (const raw of [
    '{"version":2}',
    '{"version":2,"strokes":[{"id":"a","tool":"marker","color":"#000","width":6}]}',
    '{"version":2,"strokes":[{"id":"a","tool":"laser","color":"#000","width":6,"points":[{"x":1,"y":1,"pressure":0.5}]}]}',
    '{"version":2,"strokes":[{"id":"a","tool":"marker","color":"#000","width":6,"points":[{"x":1,"y":1}]}]}',
    '{"version":1,"strokes":[]}',
    'not json',
  ]) {
    const storage = store({ [KEY]: raw })
    const loaded = createBoardPersistence(KEY, () => storage).load()
    assert.equal(loaded.strokes, null, raw)
    assert.equal(loaded.status, 'invalid', raw)
    assert.equal(storage.data.get(KEY), raw, 'A board we cannot read is left alone')
  }
})

// The board restores whenever a saved document exists, so a cleared board
// must come back as a document with no strokes, not as nothing saved.
test('a cleared board is restored as cleared', () => {
  const storage = store()
  const persistence = createBoardPersistence(KEY, () => storage)
  assert.equal(persistence.save([]), 'saved')
  assert.deepEqual(persistence.load(), { strokes: [], status: 'saved' })
})

test('a key that merely ends like an old one reads nothing else', () => {
  const storage = store({ 'notes:v1': JSON.stringify([stroke('other')]) })
  assert.deepEqual(createBoardPersistence('notes:v2', () => storage).load(), { strokes: null, status: 'idle' })
})

test('an empty store simply reports nothing to restore', () => {
  const loaded = createBoardPersistence(KEY, () => store()).load()
  assert.equal(loaded.strokes, null)
  assert.equal(loaded.status, 'idle')
})

test('storage that is missing or refuses to answer is survivable', () => {
  const blocked = createBoardPersistence(KEY, () => null)
  assert.deepEqual(blocked.load(), { strokes: null, status: 'unavailable' })
  assert.equal(blocked.save([stroke()]), 'unavailable')
})

// Storage caps a document by characters as well as by points. Samples are
// rounded so the point limit, not the character cap, is what a drawing meets.
test('a drawing at the point limit still fits in storage', () => {
  const storage = store()
  const strokes = Array.from({ length: 400 }, (_, s): Stroke => ({
    id: `${1727500000000 + s}-k3j9x2m1q8`, tool: 'marker', color: '#1b2022', width: 7.43,
    points: Array.from({ length: 100 }, (_, i) =>
      boardPoint(11.1111 + i * 3.9, 13.3333 + s * 0.6, 413.37, 0.123456)),
  }))
  assert.equal(createBoardPersistence(KEY, () => storage).save(strokes), 'saved')
})

test('a board too large to store is reported as full', () => {
  const storage = store()
  const persistence = createBoardPersistence(KEY, () => storage)
  const huge = Array.from({ length: 4001 }, (_, i) => stroke(`s${i}`))
  assert.equal(persistence.save(huge), 'full')
  assert.equal(storage.data.size, 0)
})
