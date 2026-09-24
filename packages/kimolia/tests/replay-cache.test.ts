import assert from 'node:assert/strict'
import test from 'node:test'
import { createReplayCache } from '../src/drawing/replayCache.ts'
import type { DrawingStroke } from '../src/drawing/types.ts'

// Lightweight raster stand-in for cache ownership, prefix and allocation tests.
// Pixel correctness is checked against actual Canvas replay in browser QA.
function canvas(width = 300, height = 150) {
  const result = { width, height, content: '', getContext: () => ctx }
  const ctx = {
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    save() {},
    restore() {},
    resetTransform() {},
    drawImage(source: typeof result) {
      result.content = source.content
    },
  }
  return result
}
const allocated: ReturnType<typeof canvas>[] = []
Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: () => {
      const image = canvas()
      allocated.push(image)
      return image
    },
  },
  configurable: true,
})
const stroke = (id: number) => ({ id }) as DrawingStroke
const board = (width = 968, height = 578) => {
  allocated.length = 0
  const main = canvas(width, height)
  return {
    main,
    cache: createReplayCache(main as unknown as HTMLCanvasElement),
  }
}

test('restores the longest matching completed prefix, leaving later strokes for replay', () => {
  const { main, cache } = board()
  const a = stroke(1),
    b = stroke(2),
    c = stroke(3)
  main.content = 'a'
  cache.capture([a], true)
  main.content = 'ab'
  cache.capture([a, b])
  main.content = ''
  assert.equal(cache.restore([a, b, c]), 2)
  assert.equal(main.content, 'ab')
  assert.equal(cache.restore([a]), 1)
  assert.equal(main.content, 'a')
})

test('new branches and Clear-era drawings never reuse an unrelated prefix', () => {
  const { main, cache } = board()
  const a = stroke(1),
    b = stroke(2)
  main.content = 'old'
  cache.capture([a, b], true)
  assert.equal(cache.restore([stroke(1), b]), 0)
  assert.equal(cache.restore([a, stroke(2)]), 0)
  assert.equal(cache.restore([]), 0)
  assert.equal(cache.restore([a, b]), 2)
})

test('recycles recent images, bounds checkpoint count and releases buffers on reset', () => {
  const { main, cache } = board()
  const strokes: DrawingStroke[] = []
  for (let i = 1; i <= 100; i++) {
    strokes.push(stroke(i))
    main.content = String(i)
    cache.capture(strokes, i % 24 === 0)
  }
  assert.ok(allocated.length <= 4)
  assert.equal(cache.restore(strokes.slice(0, 97)), 96)
  assert.equal(main.content, '96')
  cache.clear()
  assert.ok(allocated.every((image) => image.width === 0 && image.height === 0))
  assert.equal(cache.restore(strokes), 0)
})

test('a large canvas keeps an affordable checkpoint instead of a useless newer image', () => {
  const { main, cache } = board(3000, 2000)
  const a = stroke(1),
    b = stroke(2)
  main.content = 'a'
  cache.capture([a], true)
  main.content = 'ab'
  cache.capture([a, b])
  assert.equal(allocated.length, 1)
  assert.equal(cache.restore([a]), 1)
  assert.equal(main.content, 'a')
  assert.ok(
    allocated.reduce((sum, image) => sum + image.width * image.height * 4, 0) <=
      32 * 1024 * 1024,
  )
})

test('images larger than the whole cache budget safely fall back to stroke replay', () => {
  const { cache } = board(4000, 3000)
  const strokes = [stroke(1)]
  cache.capture(strokes, true)
  assert.equal(allocated.length, 0)
  assert.equal(cache.restore(strokes), 0)
})
