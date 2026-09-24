import assert from 'node:assert/strict'
import { test } from 'vitest'
import type { StorageLike } from 'object-studies-core'
import { createBoardPersistence } from '../src/lib/persistence.ts'
import type { Stroke } from '../src/lib/strokes.ts'

const KEY = 'aspro:whiteboard:v2'
const LEGACY = 'aspro:whiteboard:v1'

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

test('a version 1 board is imported once and left where it was', () => {
  const legacy = [stroke('legacy')]
  const storage = store({ [LEGACY]: JSON.stringify(legacy) })
  const persistence = createBoardPersistence(KEY, () => storage)
  const loaded = persistence.load()
  assert.deepEqual(loaded.strokes, legacy)
  assert.equal(loaded.status, 'saved')
  assert.ok(storage.data.has(LEGACY), 'The original document is not deleted')
  // Once version 2 exists it takes over; the legacy board is no longer consulted.
  persistence.save([stroke('current')])
  assert.deepEqual(persistence.load().strokes, [stroke('current')])
})

test('an unreadable version 1 board does not resurrect itself', () => {
  const storage = store({ [LEGACY]: '{"strokes":"gone"}' })
  const loaded = createBoardPersistence(KEY, () => storage).load()
  assert.equal(loaded.strokes, null)
  assert.equal(loaded.status, 'invalid')
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

test('a board too large to store is reported as full', () => {
  const storage = store()
  const persistence = createBoardPersistence(KEY, () => storage)
  const huge = Array.from({ length: 4001 }, (_, i) => stroke(`s${i}`))
  assert.equal(persistence.save(huge), 'full')
  assert.equal(storage.data.size, 0)
})
