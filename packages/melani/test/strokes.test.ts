import assert from 'node:assert/strict'
import { afterEach, test } from 'vitest'
import { createCanvas } from '@napi-rs/canvas'
import { createBoardRenderer, drawStroke, boardPoint, type Point, type Stroke } from '../src/lib/strokes.ts'
import { decodeStrokes } from '../src/lib/decode.ts'

type TestCanvas = HTMLCanvasElement

const point = (x: number, y: number, pressure = 0.5, angle = 0): Point => ({ x, y, pressure, angle })
const marker = (points: Point[], width = 10, id = 'test', color = '#000'): Stroke =>
  ({ id, tool: 'marker', color, width, points })
const eraser = (points: Point[], width = 84, height = 34): Stroke =>
  ({ id: 'erase', tool: 'eraser', color: '#000', width, height, points })

// skia-canvas implements the parts of the DOM surface the renderer touches.
const canvas = (width: number, height: number) => createCanvas(width, height) as unknown as TestCanvas
const context = (target: TestCanvas) =>
  target.getContext('2d') as unknown as CanvasRenderingContext2D
const alpha = (target: TestCanvas, x: number, y: number) =>
  context(target).getImageData(x, y, 1, 1).data[3]
const paint = (target: TestCanvas, stroke: Stroke) =>
  drawStroke(context(target), stroke, canvas(target.width, target.height))
const pixels = (target: TestCanvas, width = target.width) =>
  context(target).getImageData(0, 0, width, target.height).data

// The renderer creates its own layers with document.createElement; these tests
// run in node, so they lend it one.
type CanvasHost = { document?: { createElement: () => TestCanvas } }
const globals = globalThis as unknown as CanvasHost
const withDocument = () => { globals.document = { createElement: () => canvas(1, 1) } }
afterEach(() => { delete globals.document })

// Fibre streaks run along a stroke, so continuity is judged on its core rather
// than on one scan line that may sit in a lighter band.
const core = (target: TestCanvas, x: number, y: number, reach = 6) =>
  Math.max(...Array.from({ length: reach * 2 + 1 }, (_, i) => alpha(target, x, y - reach + i)))

test('sparse marker samples produce continuous ink all the way to the endpoint', () => {
  const board = canvas(400, 200)
  paint(board, marker([point(30, 100), point(150, 100), point(350, 100)]))
  for (let x = 30; x <= 350; x++) assert.ok(core(board, x, 100) > 180, `Gap at ${x}`)
})

test('ink density is independent of sample density and builds where strokes cross', () => {
  const dense = canvas(400, 200)
  paint(dense, marker(Array.from({ length: 101 }, (_, i) => point(40 + i * 3, 100))))
  const sparse = canvas(400, 200)
  paint(sparse, marker([point(40, 100), point(340, 100)]))
  const values = Array.from({ length: 291 }, (_, i) => alpha(dense, 45 + i, 100))
  const sparseValues = Array.from({ length: 291 }, (_, i) => alpha(sparse, 45 + i, 100))
  assert.deepEqual(values, sparseValues, 'Input sampling must not add dark beads or change ink density')
  const before = alpha(dense, 200, 100)
  paint(dense, marker([point(200, 40), point(200, 160)], 10, 'crossing'))
  assert.ok(alpha(dense, 200, 100) > before + 20, 'A second pass darkens where it crosses the first')
})

test('a marker leaves ink that is deliberately uneven, not a flat band', () => {
  const board = canvas(400, 200)
  paint(board, marker([point(40, 100), point(340, 100)]))
  const along = Array.from({ length: 261 }, (_, i) => alpha(board, 60 + i, 100))
  const across = Array.from({ length: 9 }, (_, i) => alpha(board, 200, 96 + i))
  const spread = (values: number[]) => Math.max(...values) - Math.min(...values)
  assert.ok(spread(along) >= 4, 'Ink density varies along the stroke')
  assert.ok(spread(along) <= 40, 'Variation along the stroke stays restrained')
  assert.ok(spread(across) >= 4, 'Fibre streaks vary across the stroke')
})

test('the nib pools ink where it lands and where it leaves', () => {
  const board = canvas(400, 200)
  paint(board, marker([point(60, 100), point(340, 100)]))
  const middle = Math.max(...Array.from({ length: 101 }, (_, i) => alpha(board, 150 + i, 100)))
  assert.ok(alpha(board, 60, 100) > middle, 'The landing point is denser than the run')
  assert.ok(alpha(board, 340, 100) > middle, 'So is the point the nib left from')
})

test('a lighter pigment covers less of the board than a dark one', () => {
  const dark = canvas(200, 100)
  paint(dark, marker([point(40, 50), point(160, 50)], 10, 'dark', '#1b2022'))
  const light = canvas(200, 100)
  paint(light, marker([point(40, 50), point(160, 50)], 10, 'dark', '#d08a3a'))
  assert.ok(alpha(dark, 100, 50) - alpha(light, 100, 50) > 15, 'Light ink is more translucent')
})

test('stationary contact keeps its ink when duplicate pointer samples arrive', () => {
  const board = canvas(100, 100)
  paint(board, marker([point(50, 50), point(50, 50), point(50, 50)]))
  assert.ok(alpha(board, 50, 50) > 180)
})

test('textured ink replays exactly and stays stable as an active stroke grows', () => {
  const board = canvas(400, 200), replay = canvas(400, 200)
  const stroke = marker([point(30, 100), point(150, 100), point(260, 100)])
  paint(board, stroke)
  paint(replay, structuredClone(stroke))
  assert.deepEqual(pixels(board), pixels(replay), 'Reload/undo/export must preserve deposited texture')
  context(replay).clearRect(0, 0, 400, 200)
  paint(replay, { ...stroke, points: [...stroke.points, point(350, 100)] })
  assert.deepEqual(pixels(board, 180), pixels(replay, 180), 'Existing ink must not shimmer as new samples arrive')
})

test('pressure changes the painted width', () => {
  const board = canvas(400, 200)
  paint(board, marker([point(40, 50, 0.1), point(340, 50, 0.1)], 20))
  paint(board, marker([point(40, 140, 1), point(340, 140, 1)], 20, 'heavy'))
  assert.equal(alpha(board, 200, 60), 0)
  assert.ok(alpha(board, 200, 150) > 100)
})

for (const angle of [0, 90]) {
  test(`eraser footprint matches its rectangular felt at ${angle} degrees`, () => {
    const board = canvas(400, 400)
    context(board).fillRect(0, 0, 400, 400)
    paint(board, eraser([point(200, 200, 0.5, angle)]))
    assert.ok(alpha(board, angle === 0 ? 235 : 200, angle === 0 ? 200 : 235) < 40, 'The full long edge wipes')
    assert.equal(alpha(board, angle === 0 ? 200 : 225, angle === 0 ? 225 : 200), 255, 'Outside the felt is untouched')
  })
}

test('fast diagonal erasing leaves no islands between sparse samples', () => {
  const board = canvas(400, 400)
  context(board).fillRect(0, 0, 400, 400)
  paint(board, eraser([point(50, 50, 0.5, -12), point(350, 350, 0.5, 12)], 72, 29))
  for (let i = 50; i < 350; i++) assert.ok(alpha(board, i, i) < 40, `Unwiped point ${i}`)
  assert.equal(alpha(board, 30, 300), 255)
})

test('a wipe ghosts once, but scrubbing or three passes make it transparent', () => {
  const pass = [point(100, 100, 0.5, 0), point(300, 100, 0.5, 0)]
  const board = canvas(400, 200)
  context(board).fillRect(0, 0, 400, 200)
  paint(board, eraser(pass))
  const once = alpha(board, 200, 100)
  assert.ok(once > 3 && once < 45, `A single wipe leaves a faint ghost, got ${once}`)

  const scrubbed = canvas(400, 200)
  context(scrubbed).fillRect(0, 0, 400, 200)
  paint(scrubbed, eraser([
    point(100, 100, 0.5, 0),
    point(300, 100, 0.5, 0),
    point(100, 100, 0.5, 0),
  ], 84, 34))
  assert.equal(alpha(scrubbed, 200, 100), 0, 'A back-and-forth scrub clears its path')

  const repeated = canvas(400, 200)
  context(repeated).fillRect(0, 0, 400, 200)
  for (let i = 0; i < 3; i++) paint(repeated, { ...eraser(pass), id: `erase-${i}` })
  assert.equal(alpha(repeated, 200, 100), 0, 'Three separate passes clear their path')
})

test('a scrub only clears the path that is revisited', () => {
  const board = canvas(400, 240)
  context(board).fillRect(0, 0, 400, 240)
  paint(board, eraser([
    point(100, 120, 0.5, 0),
    point(300, 120, 0.5, 0),
    point(300, 190, 0.5, 0),
    point(300, 120, 0.5, 0),
  ]))
  assert.ok(alpha(board, 100, 120) > 3, 'A once-wiped start keeps its ghost')
  assert.equal(alpha(board, 300, 120), 0, 'The revisited end is fully lifted')
})

test('an active stroke painted sample by sample matches its committed replay', () => {
  withDocument()
  const live = canvas(456, 283)
  const committed = canvas(456, 283)
  const renderer = createBoardRenderer(live)
  const replay = createBoardRenderer(committed)
  renderer.resize(456, 283, 1)
  replay.resize(456, 283, 1)
  const points = Array.from({ length: 24 }, (_, i) =>
    point(120 + i * 38, 300 + Math.sin(i / 3) * 90, 0.4 + (i % 5) * 0.1))
  const stroke = marker([points[0]], 14, 'live')
  for (let i = 1; i < points.length; i++) {
    stroke.points.push(points[i])
    renderer.render([], stroke)
  }
  replay.render([marker([...stroke.points], 14, 'live')])
  assert.deepEqual(pixels(live), pixels(committed), 'Pen-up must not shift a single pixel of the stroke')
})

// Precision is cut when a sample is taken, not when it is stored: otherwise a
// reloaded board would differ, pixel by pixel, from the one that was drawn.
test('a stroke drawn live looks the same after it is saved and reloaded', () => {
  withDocument()
  const live = canvas(456, 283)
  const reloaded = canvas(456, 283)
  const renderer = createBoardRenderer(live)
  const replay = createBoardRenderer(reloaded)
  renderer.resize(456, 283, 1)
  replay.resize(456, 283, 1)
  // Pointer positions on an awkwardly sized board, as a real one delivers them.
  const points = Array.from({ length: 30 }, (_, i) =>
    boardPoint(40.137 + i * 12.913, 120.771 + Math.sin(i / 4) * 60.3, 413.37, 0.31 + (i % 7) * 0.0917))
  const stroke = marker([points[0]], 13.37, 'sampled')
  for (let i = 1; i < points.length; i++) {
    stroke.points.push(points[i])
    renderer.render([], stroke)
  }
  replay.render(decodeStrokes(JSON.parse(JSON.stringify([stroke]))))
  assert.deepEqual(pixels(live), pixels(reloaded), 'Reloading must not move a single pixel of the ink')
})

test('a scrub looks the same while erasing as after the eraser lifts', () => {
  withDocument()
  const live = canvas(456, 283)
  const committed = canvas(456, 283)
  const renderer = createBoardRenderer(live)
  const replay = createBoardRenderer(committed)
  renderer.resize(456, 283, 1)
  replay.resize(456, 283, 1)
  const ink = marker([point(200, 300), point(900, 300)], 40, 'ink')
  // Back and forth over the same ground, one sample at a time.
  const points = Array.from({ length: 48 }, (_, i) => {
    const phase = (i % 16) / 15
    return point(360 + (Math.floor(i / 16) % 2 ? 1 - phase : phase) * 360, 300, 0.5, 0)
  })
  const stroke = eraser([points[0]])
  for (let i = 1; i < points.length; i++) {
    stroke.points.push(points[i])
    renderer.render([ink], stroke)
  }
  replay.render([ink, eraser([...stroke.points])])
  assert.deepEqual(pixels(live), pixels(committed), 'Scrubbed ground must not reappear until pen-up')
})

test('resize preserves the whole drawing and clear/undo invalidate the committed cache', () => {
  withDocument()
  const board = canvas(1, 1)
  const renderer = createBoardRenderer(board)
  const strokes = [marker([point(1000, 600)], 20)]
  renderer.resize(1140, 707, 1)
  renderer.render(strokes)
  assert.ok(alpha(board, 1000, 600) > 180)
  renderer.resize(570, 353.5, 2)
  renderer.render(strokes)
  assert.ok(alpha(board, 1000, 600) > 180, 'DPR must preserve the same logical point')
  renderer.resize(285, 176.75, 1)
  renderer.render(strokes)
  assert.ok(alpha(board, 250, 150) > 180, 'Bottom-right ink survives mobile resize')
  assert.deepEqual(boardPoint(250, 150, 285), { x: 1000, y: 600, pressure: 0.5 })
  renderer.render([])
  assert.equal(alpha(board, 250, 150), 0)
  renderer.render(strokes)
  assert.ok(alpha(board, 250, 150) > 180)
})

test('appending a stroke leaves the strokes already on the board untouched', () => {
  withDocument()
  const board = canvas(1, 1)
  const renderer = createBoardRenderer(board)
  const first = marker([point(200, 300), point(900, 300)], 16, 'first')
  const second = marker([point(200, 500), point(900, 500)], 16, 'second')
  renderer.resize(1140, 707, 1)
  renderer.render([first])
  const before = pixels(board, 1140).slice()
  renderer.render([first, second])
  const after = pixels(board, 1140)
  for (let y = 250; y < 350; y++) {
    for (let x = 200; x < 900; x += 7) {
      const index = (y * 1140 + x) * 4 + 3
      assert.equal(after[index], before[index], `Committed ink changed at ${x},${y}`)
    }
  }
  assert.ok(core(board, 550, 500, 9) > 180, 'The appended stroke is painted')
})
