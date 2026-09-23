import assert from 'node:assert/strict'
import test from 'node:test'
import { createCooperativeTask } from '../src/drawing/cooperativeTask.ts'

function fixture() {
  let now = 0
  const scheduled: { callback: () => void; cancelled: boolean }[] = []
  const busy: boolean[] = []
  const task = createCooperativeTask(
    (value) => busy.push(value),
    {
      now: () => now,
      schedule(callback) {
        const item = { callback, cancelled: false }
        scheduled.push(item)
        return () => {
          item.cancelled = true
        }
      },
    },
    6,
  )
  function* work(count: number, output: number[]) {
    for (let i = 0; i < count; i++) {
      now += 2
      output.push(i)
      yield
    }
  }
  const drain = () => {
    for (let i = 0; i < scheduled.length; i++)
      if (!scheduled[i].cancelled) scheduled[i].callback()
  }
  return { task, work, scheduled, busy, drain }
}

test('short work stays synchronous without a busy flash or scheduled callback', () => {
  const { task, work, scheduled, busy } = fixture(),
    output: number[] = []
  task.run(work(2, output))
  assert.deepEqual(output, [0, 1])
  assert.equal(task.isBusy(), false)
  assert.deepEqual(busy, [])
  assert.equal(scheduled.length, 0)
})

test('cheap canvas commands still yield before an unbounded raster queue builds up', () => {
  const { task, scheduled, drain } = fixture()
  let processed = 0
  function* queued() {
    for (let i = 0; i < 200; i++) {
      processed++
      yield
    }
  }
  task.run(queued())
  assert.equal(processed, 64)
  assert.equal(scheduled.length, 1)
  drain()
  assert.equal(processed, 200)
  assert.equal(task.isBusy(), false)
})

test('long work yields on budget and resumes in order, with one busy lifecycle', () => {
  const { task, work, scheduled, busy, drain } = fixture(),
    output: number[] = []
  task.run(work(10, output))
  assert.deepEqual(output, [0, 1, 2])
  assert.equal(task.isBusy(), true)
  assert.equal(scheduled.length, 1)
  drain()
  assert.deepEqual(
    output,
    Array.from({ length: 10 }, (_, i) => i),
  )
  assert.deepEqual(busy, [true, false])
  assert.equal(task.isBusy(), false)
})

test('cancellation prevents stale queued work from drawing even if a callback escaped cancellation', () => {
  const { task, work, scheduled, busy } = fixture(),
    output: number[] = []
  task.run(work(10, output))
  const stale = scheduled[0].callback
  task.cancel()
  stale()
  assert.deepEqual(output, [0, 1, 2])
  assert.deepEqual(busy, [true, false])
  assert.equal(task.isBusy(), false)
})

test('a replacement operation owns the renderer and cannot be completed by an older job', () => {
  const { task, work, scheduled, drain } = fixture(),
    first: number[] = [],
    second: number[] = []
  task.run(work(10, first))
  const stale = scheduled[0].callback
  task.run(work(8, second))
  stale()
  drain()
  assert.deepEqual(first, [0, 1, 2])
  assert.deepEqual(
    second,
    Array.from({ length: 8 }, (_, i) => i),
  )
  assert.equal(task.isBusy(), false)
})
