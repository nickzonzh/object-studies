import assert from 'node:assert/strict'
import { test } from 'vitest'
import { createRng } from '../src/lib/rng.js'
import { tornOutline } from '../src/lib/tornEdge.js'
import { stepPupil, restingPupil, isSettled } from '../src/lib/googly.js'
import { restPose, leanToward } from '../src/lib/toolMotion.js'
import * as glitter from '../src/lib/glitter.js'
import * as pom from '../src/lib/pompom.js'
import * as stamp from '../src/lib/stamp.js'
import * as cut from '../src/lib/cut.js'
import * as tape from '../src/lib/tape.js'
import * as pipe from '../src/lib/pipe.js'

test('torn edges only remove paper and leave a pale rim inside the tear', () => {
  const { outer, inner } = tornOutline(400, 300, 7)
  for (const p of [...outer, ...inner]) {
    assert.ok(p.x >= 0 && p.x <= 400 && p.y >= 0 && p.y <= 300, `Point outside sheet: ${p.x},${p.y}`)
  }
  assert.equal(outer.length, inner.length)
  const rims = outer.map((p, i) => Math.hypot(p.x - inner[i].x, p.y - inner[i].y))
  assert.ok(rims.every((r) => r > 0.3 && r < 9), 'Rim should be a thin, visible band')
  assert.ok(Math.max(...rims) > 3 * Math.min(...rims), 'Rim should vary like a real tear, not a uniform border')
})

test('the coloured face never pokes out past the rim at the corners', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const { inner } = tornOutline(320, 240, seed)
    for (const p of inner) {
      assert.ok(p.x >= 0.3 && p.x <= 319.7 && p.y >= 0.3 && p.y <= 239.7, `Seed ${seed}: face point on the sheet edge at ${p.x},${p.y}`)
    }
  }
})

test('cut edges stay straight, and the same seed tears the same way', () => {
  const a = tornOutline(400, 300, 12, ['bottom'])
  const top = a.outer.filter((p) => p.y < 150 && p.x > 1 && p.x < 399)
  assert.ok(top.every((p) => p.y === 0))
  assert.deepEqual(a, tornOutline(400, 300, 12, ['bottom']))
  assert.notDeepEqual(a, tornOutline(400, 300, 13, ['bottom']))
})

test('a jostled pupil settles at the bottom and never leaves the eye', () => {
  const limit = 0.45
  const rng = createRng(3)
  let p = restingPupil(limit)
  for (let i = 0; i < 240; i++) {
    p = stepPupil(p, 1 / 60, (rng() - 0.5) * 900, (rng() - 0.5) * 900, { limit })
    assert.ok(Math.hypot(p.x, p.y) <= limit + 1e-9)
  }
  for (let i = 0; i < 60 * 8; i++) p = stepPupil(p, 1 / 60, 0, 0, { limit })
  assert.ok(isSettled(p, limit), `Not settled: ${JSON.stringify(p)}`)
  assert.ok(Math.abs(p.x) < 0.01)
})

test('glitter sticks to tacky glue, bounces off dry glue and bare paper', () => {
  const field = glitter.createGlueField(200, 200)
  glitter.paintGlue(field, 20, 100, 180, 100, 12, 0)
  const rng = createRng(1)
  const onWet = glitter.pourFlakes(rng, 100, 100, 50, 0, 1000, 2)
  const onDry = glitter.pourFlakes(rng, 100, 100, 50, 0, glitter.GLUE_DRY_MS + 500, 2)
  const bare = glitter.pourFlakes(rng, 100, 30, 50, 0, 1000, 2)
  for (const f of [...onWet, ...onDry, ...bare]) glitter.settleFlake(f, field)
  assert.ok(onWet.every((f) => f.stuck))
  assert.ok(onDry.every((f) => !f.stuck))
  assert.ok(bare.every((f) => !f.stuck))
})

test('re-gluing refreshes tackiness', () => {
  const field = glitter.createGlueField(100, 100)
  glitter.paintGlue(field, 50, 50, 50, 50, 8, 0)
  assert.equal(glitter.tackiness(field, 50, 50, glitter.GLUE_DRY_MS + 1), 0)
  glitter.paintGlue(field, 50, 50, 50, 50, 8, glitter.GLUE_DRY_MS)
  assert.ok(glitter.tackiness(field, 50, 50, glitter.GLUE_DRY_MS + 1) > 0.99)
})

test('tipping the sheet removes only loose glitter', () => {
  const rng = createRng(5)
  let flakes = glitter.pourFlakes(rng, 100, 100, 200, 0, 0)
  flakes.forEach((f, i) => { f.stuck = i % 2 === 0 })
  for (let i = 0; i < 120; i++) flakes = glitter.tipStep(flakes, 1 / 60, 200, rng)
  assert.equal(flakes.length, 100)
  assert.ok(flakes.every((f) => f.stuck))
})

test('a flake glints hardest when its facet faces the light', () => {
  const facing = { x: 0, y: 0, nx: 0, ny: 0, nz: 1 }
  const tilted = { x: 0, y: 0, nx: Math.sin(0.5), ny: 0, nz: Math.cos(0.5) }
  assert.ok(glitter.glint(facing, 0, 0, 300) > 0.99)
  assert.ok(glitter.glint(tilted, 0, 0, 300) < 0.01)
  // Moving the light over to the tilted side catches that flake instead.
  assert.ok(glitter.glint(tilted, 300 * Math.tan(1.0), 0, 300) > 0.9)
})

test('a tool rests with its far end aligned to the slot object, at the slot scale', () => {
  const anchor = { tipX: 0, tipY: 14, width: 106, height: 28 }
  const pose = restPose({ left: 100, top: 50, width: 127 * 0.5, height: 14 }, anchor)
  assert.equal(pose.scale, 0.5)
  assert.equal(pose.x + anchor.width * pose.scale, 100 + 127 * 0.5)
  assert.equal(pose.y, 57)
})

test('an eye launches small from the middle of its pot', () => {
  const pose = restPose({ left: 0, top: 0, width: 46, height: 46 }, { tipX: 20, tipY: 20, width: 40, height: 40, rest: 'center', restScale: 0.42 })
  assert.deepEqual(pose, { x: 23, y: 23, angle: 0, scale: 0.42 })
})

test('a held tool leans toward travel but stays within wrist range', () => {
  let angle = -38
  for (let i = 0; i < 60; i++) angle = leanToward(angle, 0, 10, 42, -62, -20)
  assert.ok(Math.abs(angle - -20) < 0.1, `Moving down should lean to the upper clamp, got ${angle}`)
  for (let i = 0; i < 60; i++) angle = leanToward(angle, -10, 0, 42, -62, -20)
  assert.ok(angle >= -62 && angle <= -20)
  assert.equal(leanToward(-38, 0.1, 0.1, 42, -62, -20), -38, 'Jitter should not twitch the tool')
})

test('sequin film shifts hue with viewing angle', () => {
  const hues = [1, 0.95, 0.85, 0.7].map(glitter.filmHue)
  assert.ok(hues.every((h) => h >= 0 && h < 360))
  assert.equal(new Set(hues.map((h) => Math.round(h))).size, hues.length)
})

test('a pom pom dropped on bare paper rolls to a stop and stays on the mat', () => {
  const field = glitter.createGlueField(400, 300)
  const rng = createRng(9)
  let list = Array.from({ length: 12 }, (_, i) => pom.dropPompom(rng, i, 200 + (rng() - 0.5) * 40, 150, 0, 14))
  list.forEach((p) => pom.settlePompom(p, field, 0))
  for (let i = 0; i < 60 * 6; i++) list = pom.stepPompoms(list, 1 / 60, { width: 400, height: 300 })
  assert.equal(list.length, 12)
  assert.ok(!pom.isRolling(list), 'Should come to rest')
  for (const p of list) assert.ok(p.x >= p.r - 1e-9 && p.x <= 400 - p.r + 1e-9 && p.y >= p.r - 1e-9 && p.y <= 300 - p.r + 1e-9)
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d = Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y)
    assert.ok(d > list[i].r + list[j].r - 1.5, 'Pom poms should not sit inside each other')
  }
})

test('a pom pom pressed into tacky glue stays put, even when knocked or tipped', () => {
  const field = glitter.createGlueField(400, 300)
  glitter.paintGlue(field, 100, 100, 100, 100, 12, 0)
  const rng = createRng(2)
  const glued = pom.dropPompom(rng, 1, 104, 100, 0, 14)
  const loose = pom.dropPompom(rng, 2, 300, 100, 0, 14)
  pom.settlePompom(glued, field, 1000)
  pom.settlePompom(loose, field, 1000)
  assert.ok(glued.stuck && !loose.stuck)
  pom.nudgePompoms([glued, loose], rng, 3)
  let list = [glued, loose]
  for (let i = 0; i < 60 * 3; i++) list = pom.stepPompoms(list, 1 / 60, { width: 400, height: 300 }, 1600)
  assert.deepEqual(list.map((p) => p.id), [1])
  assert.equal(list[0].x, 104)
})

test('stamp ink prints solid when fresh, breaks up as it runs dry, and nothing when dry', () => {
  const noise = stamp.stampNoise(4)
  const samples = Array.from({ length: 400 }, (_, i) => noise((i % 20) / 19, Math.floor(i / 20) / 19))
  assert.ok(samples.every((n) => n >= 0 && n <= 1))
  const mean = (level: number) => samples.reduce((sum, n) => sum + stamp.inkCoverage(level, n), 0) / samples.length
  let level = 1
  const coverage: number[] = []
  while (level > 0) { coverage.push(mean(level)); level = stamp.inkAfterStamp(level) }
  assert.ok(coverage[0] > 0.97, `Fresh ink should print solid, got ${coverage[0]}`)
  for (let i = 1; i < coverage.length; i++) assert.ok(coverage[i] < coverage[i - 1])
  assert.equal(coverage.length, 5, 'About five impressions per inking')
  assert.equal(mean(0), 0)
  assert.deepEqual([0.2, 0.7].map(stamp.stampNoise(4).bind(null, 0.3)), [0.2, 0.7].map(stamp.stampNoise(4).bind(null, 0.3)))
})

const rect = (x: number, y: number, w: number, h: number) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]
const circle = (cx: number, cy: number, r: number, n = 60, close = 0.9) =>
  Array.from({ length: Math.round(n * close) + 1 }, (_, i) => ({ x: cx + Math.cos((i / n) * Math.PI * 2) * r, y: cy + Math.sin((i / n) * Math.PI * 2) * r }))
const sheetOf = (x: number, y: number, w: number, h: number) => ({ outer: cut.fromPoints(rect(x, y, w, h)), inner: cut.fromPoints(rect(x + 3, y + 3, w - 6, h - 6)) })

test('a closed loop cuts out its shape and leaves a hole the same size', () => {
  const sheet = sheetOf(0, 0, 400, 300)
  // Stops 20 units short of the start, like a real hand-drawn loop.
  const result = cut.cutSheet(sheet, circle(200, 150, 60, 80, 0.97))
  assert.equal(result.kind, 'piece')
  const pieceArea = cut.shapeArea(result.piece.outer)
  assert.ok(Math.abs(pieceArea - Math.PI * 60 * 60) < 400, `Piece area ${pieceArea}`)
  assert.ok(Math.abs(cut.shapeArea(result.sheet.outer) + pieceArea - 400 * 300) < 1)
  assert.ok(!cut.inShape(result.sheet.outer, 200, 150), 'The middle is now a hole')
  assert.ok(cut.inShape(result.piece.outer, 200, 150))
  assert.ok(cut.inShape(result.sheet.outer, 20, 20))
})

test('an edge-to-edge cut splits the sheet and lifts the smaller part', () => {
  const sheet = sheetOf(0, 0, 400, 300)
  const path = Array.from({ length: 40 }, (_, i) => ({ x: 300 + Math.sin(i / 6) * 8, y: -30 + i * 10 }))
  const result = cut.cutSheet(sheet, path)
  assert.equal(result.kind, 'piece')
  const piece = cut.bounds(result.piece.outer)
  assert.ok(piece.x > 280 && piece.x + piece.width <= 400.01, `Piece should be the right-hand strip, got ${JSON.stringify(piece)}`)
  assert.ok(Math.abs(cut.shapeArea(result.sheet.outer) + cut.shapeArea(result.piece.outer) - 400 * 300) < 1)
  // Same cut the other way round still lifts the smaller strip.
  const reversed = cut.cutSheet(sheet, path.slice().reverse())
  assert.equal(reversed.kind, 'piece')
  assert.ok(Math.abs(cut.shapeArea(reversed.piece.outer) - cut.shapeArea(result.piece.outer)) < 1)
})

test('a cut that starts or stops on the paper leaves a slit; one that misses does nothing', () => {
  const sheet = sheetOf(0, 0, 400, 300)
  const slit = cut.cutSheet(sheet, Array.from({ length: 20 }, (_, i) => ({ x: -20 + i * 10, y: 100 })))
  assert.equal(slit.kind, 'slit')
  const miss = cut.cutSheet(sheet, Array.from({ length: 20 }, (_, i) => ({ x: -20 + i * 10, y: 400 })))
  assert.equal(miss.kind, 'none')
})

test('cut pieces carry both paper layers, so cut edges show no torn rim', () => {
  const sheet = sheetOf(0, 0, 400, 300)
  const result = cut.cutSheet(sheet, circle(200, 150, 50, 60, 0.97))
  assert.equal(result.kind, 'piece')
  assert.ok(Math.abs(cut.shapeArea(result.piece.inner) - cut.shapeArea(result.piece.outer)) < 1, 'Face fills the piece right to its cut edge')
})

test('scissor paths are evened out and step slightly at each snip', () => {
  const path = cut.snipPath([{ x: 0, y: 0 }, { x: 300, y: 0 }])
  const gaps = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y))
  assert.ok(gaps.every((g) => g < 4), 'Evenly resampled')
  const steps = new Set(path.map((p) => p.y.toFixed(2)))
  assert.ok(steps.size >= 2 && path.every((p) => Math.abs(p.y) <= 0.71), 'Tiny alternating steps, never more than a hair')
})

test('a sloppy loop still closes, and a path that crosses itself cuts out its loop', () => {
  const sheet = sheetOf(0, 0, 400, 300)
  // Stops a good 3 cm short of the start, like a hurried hand.
  const sloppy = cut.cutSheet(sheet, circle(200, 150, 90, 68, 64 / 68))
  assert.equal(sloppy.kind, 'piece')
  // A figure-6: comes down, loops round and crosses its own tail.
  const tail = Array.from({ length: 10 }, (_, i) => ({ x: 200, y: 20 + i * 8 }))
  const ring = Array.from({ length: 50 }, (_, i) => ({ x: 200 - Math.sin((i / 46) * Math.PI * 2) * 50, y: 150 - Math.cos((i / 46) * Math.PI * 2) * 50 }))
  const six = cut.cutSheet(sheet, [...tail, ...ring])
  assert.equal(six.kind, 'piece')
  const b = cut.bounds(six.piece.outer)
  assert.ok(b.y > 90 && b.height < 115, `Only the loop should lift, not the tail: ${JSON.stringify(b)}`)
})

test('overlapping holes and covers merge into one region instead of cancelling out', () => {
  const a = cut.fromPoints(rect(0, 0, 100, 100))
  const same = cut.fromPoints(rect(0, 0, 100, 100))
  const merged = cut.unionOf([a, same])
  assert.ok(Math.abs(cut.shapeArea(merged) - 100 * 100) < 1e-6)
  assert.ok(cut.inShape(merged, 50, 50), 'A piece lying exactly on its own hole still covers it')
  const shifted = cut.unionOf([a, cut.translateShape(a, 50, 0)])
  assert.ok(Math.abs(cut.shapeArea(shifted) - 150 * 100) < 1e-6)
})

test('a loop across a piece that was already cut out cuts that piece too', () => {
  const sheet = sheetOf(0, 0, 400, 300)
  const first = cut.cutSheet(sheet, circle(200, 150, 60, 80, 0.97))
  assert.equal(first.kind, 'piece')
  // The piece still lies in its hole. A second loop overlaps both it and the sheet.
  const loop = circle(260, 150, 50, 80, 0.97)
  const pieceCut = cut.cutSheet(first.piece, loop)
  const sheetCut = cut.cutSheet(first.sheet, loop)
  assert.equal(pieceCut.kind, 'piece')
  assert.equal(sheetCut.kind, 'piece')
  const total = cut.shapeArea(pieceCut.piece.outer) + cut.shapeArea(sheetCut.piece.outer)
  assert.ok(Math.abs(total - Math.PI * 50 * 50) < 400, `Together the two layers make the whole loop: ${total}`)
})

test('masking tape has straight long edges and torn ends that stay within the strip', () => {
  const outline = tape.tapeOutline(200, 40, 3)
  assert.ok(outline.every((p) => p.x >= 0 && p.x <= 200 && Math.abs(p.y) <= 20 + 1e-9))
  const leftEnd = outline.filter((p) => p.x < 5)
  const rightEnd = outline.filter((p) => p.x > 195)
  assert.ok(leftEnd.length >= 6 && rightEnd.length >= 6, 'Both ends are torn into several teeth')
  assert.ok(new Set(leftEnd.map((p) => p.x.toFixed(2))).size > 2, 'Teeth vary in depth')
  const samples = tape.tapeSamples({ x1: 0, y1: 0, x2: 100, y2: 0 })
  assert.ok(samples.some((p) => p.y > 10) && samples.some((p) => p.y < -10), 'Samples cover the width of the strip')
})

test('a pipe cleaner stops at its length and bends smoothly', () => {
  const long = Array.from({ length: 100 }, (_, i) => ({ x: i * 10, y: (i % 2) * 20 }))
  const trimmed = pipe.trimToLength(long, 330)
  assert.ok(Math.abs(pipe.pathLength(trimmed) - 330) < 1e-6)
  const zigzag = [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 100, y: 0 }]
  const smooth = pipe.smoothPath(zigzag)
  assert.deepEqual(smooth[0], zigzag[0])
  assert.deepEqual(smooth[smooth.length - 1], zigzag[2])
  assert.ok(smooth.every((p) => p.y < 50), 'The sharp corner is rounded off')
  const samples = pipe.resamplePath([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10)
  assert.equal(samples.length, 11)
  assert.ok(samples.every((p) => p.angle === 0))
})
