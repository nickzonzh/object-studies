import assert from 'node:assert/strict'
import test from 'node:test'
import { createDusterSampler } from '../src/drawing/dusterSampler.ts'
import type { ChalkPoint } from '../src/drawing/types.ts'

const point = (x: number, y = 20): ChalkPoint => ({ x, y, pressure: 0.5 })
function sample(points: ChalkPoint[]) {
  const passes: ChalkPoint[][] = [[]]
  const sampler = createDusterSampler(
    48,
    (p) => passes[passes.length - 1].push(p),
    () => passes.push([]),
  )
  points.forEach((p) => sampler.add(p))
  sampler.end()
  sampler.end()
  return passes
}

test('a stationary duster presses once rather than repeatedly scrubbing the same spot', () => {
  assert.deepEqual(sample([point(10)]), [[point(10)]])
  assert.deepEqual(sample([point(10), point(10), point(10)]), [[point(10)]])
})

test('fast and densely sampled sweeps have the same continuous felt coverage', () => {
  const sparse = sample([point(0), point(720)])[0]
  const dense = sample(Array.from({ length: 721 }, (_, x) => point(x)))[0]
  assert.equal(sparse.length, dense.length)
  for (let i = 0; i < sparse.length; i++) {
    assert.ok(Math.abs(sparse[i].x - dense[i].x) < 1e-8)
    if (i) assert.ok(sparse[i].x - sparse[i - 1].x <= 48 * 0.12 + 1e-8)
  }
})

test('back-and-forth scrubbing starts new passes without a pointer release', () => {
  const passes = sample([point(0), point(300), point(0), point(300)])
  assert.equal(passes.length, 3)
  assert.deepEqual(passes[1][0], point(300))
  assert.deepEqual(passes[2][0], point(0))
})

test('tiny jitter does not start cleaning passes; a curved turn eventually does', () => {
  assert.equal(sample([point(0), point(2), point(0), point(2)]).length, 1)
  const arc = Array.from({ length: 100 }, (_, i) =>
    point(
      100 + Math.sin((i / 99) * Math.PI) * 80,
      100 - Math.cos((i / 99) * Math.PI) * 80,
    ),
  )
  assert.equal(sample(arc).length, 2)
  assert.deepEqual(sample(arc), sample(arc))
})
