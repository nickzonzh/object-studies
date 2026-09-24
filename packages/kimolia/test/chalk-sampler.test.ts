import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createChalkSampler, pressureFor } from '../src/drawing/chalkSampler.js'
import { clipSegment } from '../src/drawing/clip.js'
import type { ChalkPoint, ChalkStamp } from '../src/drawing/types.js'

function sample(points: ChalkPoint[], seed = 42) {
  const stamps: ChalkStamp[] = []
  const sampler = createChalkSampler(7, seed, (stamp) => stamps.push(stamp))
  points.forEach((point) => sampler.add(point))
  sampler.end()
  sampler.end()
  return stamps
}
const point = (x: number, y = 20, pressure = 0.5) => ({ x, y, pressure })

test('live sampling and replay are deterministic, while stroke seeds vary the grain', () => {
  const points = [point(0), point(12, 24), point(185, 92), point(202, 78)]
  assert.deepEqual(sample(points), sample(points))
  assert.notDeepEqual(sample(points), sample(points, 43))
})

test('sparse and dense input packets leave identical marks, gaps included', () => {
  const fast = sample([point(0), point(420)])
  const slow = sample(Array.from({ length: 421 }, (_, x) => point(x)))
  assert.equal(fast.length, slow.length)
  let longest = 0
  for (let i = 0; i < fast.length; i++) {
    assert.ok(Math.abs(fast[i].x - slow[i].x) < 1e-8)
    assert.equal(fast[i].opacity, slow[i].opacity)
    if (i)
      longest = Math.max(
        longest,
        Math.hypot(fast[i].x - fast[i - 1].x, fast[i].y - fast[i - 1].y),
      )
  }
  // Chalk misses the grain here and there; a sampling gap would be a bug.
  const spacing = 7 * 0.18
  assert.ok(longest > spacing * 1.5, 'expected some skipped stamps')
  assert.ok(longest < spacing * 3.5, `a skipped run left a ${longest}px gap`)
})

test('a tap leaves one stamp; repeated stationary events and repeated end do not overpaint it', () => {
  assert.equal(sample([point(10)]).length, 1)
  assert.deepEqual(
    sample([point(10)]),
    sample([point(10), point(10), point(10)]),
  )
  const short = sample([point(10), point(10.8)])
  assert.equal(short.length, 2)
})

test('pen pressure changes density more than width; mouse and touch stay predictable', () => {
  const light = sample([point(10, 20, 0)])[0]
  const heavy = sample([point(10, 20, 1)])[0]
  assert.ok(heavy.size > light.size && heavy.size / light.size < 1.36)
  assert.ok(heavy.opacity / light.opacity > heavy.size / light.size)
  assert.equal(pressureFor('mouse', 1), 0.5)
  assert.equal(pressureFor('touch', 0), 0.5)
  assert.equal(pressureFor('pen', 0), 0)
  assert.equal(pressureFor('pen', 0.9), 0.9)
})

test('clipping retains edge contact but never draws along an edge during outside motion', () => {
  assert.deepEqual(clipSegment(point(30), point(150), 100, 60)?.to, point(100))
  assert.equal(clipSegment(point(150, 20), point(150, 50), 100, 60), null)
  assert.deepEqual(
    clipSegment(point(150, 50), point(30, 50), 100, 60)?.from,
    point(100, 50),
  )
  const crossing = clipSegment(point(-50), point(150), 100, 60)!
  assert.deepEqual(crossing.from, point(0))
  assert.deepEqual(crossing.to, point(100))
})
