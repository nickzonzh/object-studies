import { seededRandom } from 'object-studies-core'

export type Point = { x: number; y: number; pressure: number; angle?: number }
export type StrokeTool = 'marker' | 'eraser'
export type Stroke = {
  id: string
  tool: StrokeTool
  color: string
  width: number
  /** Absent on legacy circular eraser strokes. */
  height?: number
  points: Point[]
}
export type Bounds = { left: number; top: number; right: number; bottom: number }
export type BoardRenderer = {
  resize(width: number, height: number, dpr: number): void
  render(strokes: readonly Stroke[], active?: Stroke | null): void
}

export const BOARD_WIDTH = 1140
export const BOARD_HEIGHT = 707
export const DEFAULT_PRESSURE = 0.5
export const ERASER_WIDTH = 84
export const ERASER_HEIGHT = 34

export function boardPoint(x: number, y: number, displayWidth: number): Point {
  const scale = BOARD_WIDTH / displayWidth
  return { x: x * scale, y: y * scale, pressure: DEFAULT_PRESSURE }
}

const effectiveWidth = (stroke: Stroke, pressure: number) =>
  stroke.tool === 'eraser' ? stroke.width : stroke.width * (0.86 + (pressure || DEFAULT_PRESSURE) * 0.28)

// Stable in board coordinates: neither replay nor another pointer sample should
// make the deposited ink shimmer. The two scales avoid a regular scalloped edge.
function inkWidth(stroke: Stroke, point: Point) {
  const variation = Math.sin(point.x * 0.83 + point.y * 0.47) * 0.06
    + Math.sin(point.x * 0.21 - point.y * 0.37) * 0.042
  return effectiveWidth(stroke, point.pressure) * (1 + variation)
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function luminance(color: string) {
  const match = HEX.exec(color.trim())
  if (!match) return 0.25
  const hex = match[1].length === 3 ? match[1].replace(/./g, (digit) => digit + digit) : match[1]
  const value = Number.parseInt(hex, 16)
  return (0.2126 * ((value >> 16) & 255) + 0.7152 * ((value >> 8) & 255) + 0.0722 * (value & 255)) / 255
}

// Solvent ink is never fully opaque and a light pigment covers less than a dark
// one, so the board tint reads faintly through a red or green line.
export const inkAlpha = (stroke: Stroke) =>
  stroke.tool === 'eraser' ? 1 : 0.86 - 0.45 * luminance(stroke.color)

/* ── bounds ─────────────────────────────────────────────────────────────── */

const padding = (stroke: Stroke) =>
  stroke.tool === 'eraser'
    ? Math.hypot(stroke.width, stroke.height ?? stroke.width) / 2 + 1
    : stroke.width

const EMPTY: Bounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }

function grow(bounds: Bounds, points: readonly Point[], from: number, to: number) {
  for (let i = Math.max(0, from); i < to; i++) {
    const point = points[i]
    if (point.x < bounds.left) bounds.left = point.x
    if (point.x > bounds.right) bounds.right = point.x
    if (point.y < bounds.top) bounds.top = point.y
    if (point.y > bounds.bottom) bounds.bottom = point.y
  }
  return bounds
}

const pad = (bounds: Bounds, amount: number): Bounds => ({
  left: bounds.left - amount, top: bounds.top - amount,
  right: bounds.right + amount, bottom: bounds.bottom + amount,
})

const union = (a: Bounds | null, b: Bounds | null): Bounds | null =>
  !a ? b : !b ? a : {
    left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
  }

// An active stroke only ever grows, so its extent is extended, never rescanned.
const extents = new WeakMap<Stroke, Bounds & { counted: number }>()

function strokeBounds(stroke: Stroke): Bounds {
  let extent = extents.get(stroke)
  if (!extent) {
    extent = { ...EMPTY, counted: 0 }
    extents.set(stroke, extent)
  }
  if (extent.counted < stroke.points.length) {
    grow(extent, stroke.points, extent.counted, stroke.points.length)
    extent.counted = stroke.points.length
  }
  return pad(extent, padding(stroke))
}

/* ── ink texture ────────────────────────────────────────────────────────── */

type Wash = { density: CanvasGradient }

// Gradients belong to the context that created them; strokes keep theirs for as
// long as they are being painted onto the same surface.
const washes = new WeakMap<CanvasRenderingContext2D, WeakMap<Stroke, Wash>>()

/** Fibre tracks laid across the nib, as a share of the ink's width. */
const STREAK_LINES = 5
const STREAK_SPREAD = 0.78

function hash(seed: number, index: number) {
  let value = Math.imul(seed ^ (index * 0x9e3779b1), 2654435761)
  value ^= value >>> 15
  value = Math.imul(value, 2246822519)
  value ^= value >>> 13
  return (value >>> 0) / 4294967296
}

function seedOf(id: string) {
  let seed = 2166136261
  for (const character of id) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619)
  return seed
}

function washFor(ctx: CanvasRenderingContext2D, stroke: Stroke): Wash {
  let cache = washes.get(ctx)
  if (!cache) washes.set(ctx, cache = new WeakMap())
  const existing = cache.get(stroke)
  if (existing) return existing
  // Slow, board-anchored density variation: one pass lays ink down unevenly,
  // a crossing pass builds up on top of it.
  const density = ctx.createLinearGradient(0, 0, BOARD_WIDTH, BOARD_HEIGHT * 0.42)
  const random = seededRandom(seedOf(stroke.id))
  const depth = stroke.tool === 'eraser' ? 0.05 : 0.075
  for (let i = 0; i <= 80; i++) density.addColorStop(i / 80, `rgba(0,0,0,${random() * depth})`)
  const wash = { density }
  cache.set(stroke, wash)
  return wash
}

/**
 * A felt nib drags its fibres along the line it is drawing, so the tracks they
 * leave run with the stroke, not across it. Each track is a thin line held at a
 * fixed distance from the centre, lifted out of the coverage it sits on — which
 * also keeps it inside the ink without any clipping.
 */
function paintStreaks(ctx: CanvasRenderingContext2D, stroke: Stroke, region: Bounds) {
  const { points } = stroke
  if (points.length < 2) return
  const seed = seedOf(stroke.id)
  const eraser = stroke.tool === 'eraser'
  const across = eraser ? stroke.height ?? stroke.width : stroke.width
  ctx.save()
  // One stroked path per track, clipped to the region being repainted: a track
  // is composited exactly once, so its density cannot depend on how many
  // samples the pointer happened to deliver.
  ctx.beginPath()
  ctx.rect(region.left, region.top, region.right - region.left, region.bottom - region.top)
  ctx.clip()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'
  ctx.lineWidth = across * (eraser ? 0.09 : 0.13)
  // Segments well outside the region are dropped; the break that leaves is
  // further out than the line is wide, so nothing inside the clip can see it.
  const margin = across * 1.2
  for (let track = 0; track < STREAK_LINES; track++) {
    const offset = ((track + 0.5) / STREAK_LINES - 0.5) * STREAK_SPREAD
    ctx.strokeStyle = `rgba(0,0,0,${hash(seed, track) ** 1.6 * (eraser ? 0.12 : 0.26) + 0.02})`
    ctx.beginPath()
    let drawn = false
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i]
      const dx = b.x - a.x, dy = b.y - a.y
      const length = Math.hypot(dx, dy)
      if (length < 0.01) continue
      const near = Math.min(a.x, b.x) - margin <= region.right
        && Math.max(a.x, b.x) + margin >= region.left
        && Math.min(a.y, b.y) - margin <= region.bottom
        && Math.max(a.y, b.y) + margin >= region.top
      if (!near) {
        drawn = false
        continue
      }
      // Pressure, not the position jitter: where a track sits must not depend
      // on how finely the path was sampled.
      const width = eraser ? across : effectiveWidth(stroke, (a.pressure + b.pressure) / 2)
      const shift = offset * width
      const nx = (-dy / length) * shift, ny = (dx / length) * shift
      if (!drawn) ctx.moveTo(a.x + nx, a.y + ny)
      ctx.lineTo(b.x + nx, b.y + ny)
      drawn = true
    }
    ctx.stroke()
  }
  ctx.restore()
}

// Lift coverage away again. Marker ink keeps a little of the board showing
// through; the eraser leaves a faint ghost of whatever it passed over, so a
// second pass over the same place lifts what the first one left behind.
function applyWash(ctx: CanvasRenderingContext2D, stroke: Stroke, region: Bounds) {
  const { density } = washFor(ctx, stroke)
  const x = region.left, y = region.top, width = region.right - x, height = region.bottom - y
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  if (stroke.tool === 'eraser') {
    ctx.fillStyle = 'rgba(0,0,0,0.035)'
    ctx.fillRect(x, y, width, height)
  }
  ctx.fillStyle = density
  ctx.fillRect(x, y, width, height)
  ctx.restore()
  paintStreaks(ctx, stroke, region)
}

// The nib rests where it lands and again where it leaves, so a little more ink
// sits at both ends — denser where it started, and never a bead with an edge.
function paintPools(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.tool !== 'marker') return
  const { points } = stroke
  ctx.save()
  ctx.fillStyle = stroke.color
  for (const [index, point] of [points[0], points[points.length - 1]].entries()) {
    ctx.globalAlpha = index === 0 ? 0.5 : 0.3
    ctx.beginPath()
    ctx.arc(point.x, point.y, inkWidth(stroke, point) * 0.53, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/* ── coverage ───────────────────────────────────────────────────────────── */

function eraserCorners(point: Point, width: number, height: number) {
  const radians = (point.angle ?? 0) * Math.PI / 180
  const cos = Math.cos(radians), sin = Math.sin(radians)
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({
    x: point.x + x * width / 2 * cos - y * height / 2 * sin,
    y: point.y + x * width / 2 * sin + y * height / 2 * cos,
  }))
}

function stampEraser(ctx: CanvasRenderingContext2D, point: Point, stroke: Stroke) {
  const corners = eraserCorners(point, stroke.width, stroke.height!)
  ctx.beginPath()
  ctx.moveTo(corners[0].x, corners[0].y)
  for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y)
  ctx.closePath()
  ctx.fill()
}

function markerSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, a: Point, control: Point, b: Point) {
  const length = Math.hypot(control.x - a.x, control.y - a.y) + Math.hypot(b.x - control.x, b.y - control.y)
  const steps = Math.max(1, Math.ceil(length / 2.5))
  let previous = a
  for (let step = 1; step <= steps; step++) {
    const t = step / steps, s = 1 - t
    const current = {
      x: s * s * a.x + 2 * s * t * control.x + t * t * b.x,
      y: s * s * a.y + 2 * s * t * control.y + t * t * b.y,
      pressure: a.pressure + (b.pressure - a.pressure) * t,
    }
    ctx.beginPath()
    ctx.lineWidth = inkWidth(stroke, current)
    ctx.moveTo(previous.x, previous.y)
    ctx.lineTo(current.x, current.y)
    ctx.stroke()
    previous = current
  }
}

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, pressure: (a.pressure + b.pressure) / 2,
})

function inkStyle(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = stroke.color
  ctx.fillStyle = stroke.color
}

// Repeated stationary samples still leave the initial contact mark.
function paintContact(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const point = stroke.points[0]
  inkStyle(ctx, stroke)
  if (stroke.tool === 'eraser' && stroke.height) {
    stampEraser(ctx, point, stroke)
    return
  }
  ctx.beginPath()
  ctx.arc(point.x, point.y, (stroke.tool === 'marker' ? inkWidth(stroke, point) : stroke.width) / 2, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Paint opaque coverage for the segments ending at points `from`…`to - 1`.
 * Splitting the run this way lets a live stroke append only what is new while
 * replay paints the identical union in one pass.
 */
function paintRange(ctx: CanvasRenderingContext2D, stroke: Stroke, from: number, to: number) {
  const { points } = stroke
  inkStyle(ctx, stroke)
  for (let i = Math.max(1, from); i < to; i++) {
    const previous = points[i - 1], current = points[i]
    if (stroke.tool === 'eraser' && stroke.height) {
      const rotation = Math.abs((current.angle ?? 0) - (previous.angle ?? 0)) * Math.PI / 180 * stroke.width / 2
      const steps = Math.max(1, Math.ceil(
        (Math.hypot(current.x - previous.x, current.y - previous.y) + rotation) / Math.max(1, stroke.height / 8)))
      for (let step = 1; step <= steps; step++) {
        const t = step / steps
        stampEraser(ctx, {
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
          pressure: 0.5,
          angle: (previous.angle ?? 0) + ((current.angle ?? 0) - (previous.angle ?? 0)) * t,
        }, stroke)
      }
      continue
    }
    const start = i === 1 ? previous : midpoint(points[i - 2], previous)
    const end = midpoint(previous, current)
    if (stroke.tool === 'marker') {
      markerSegment(ctx, stroke, start, previous, end)
      continue
    }
    ctx.beginPath()
    ctx.lineWidth = effectiveWidth(stroke, (previous.pressure + current.pressure) / 2)
    ctx.moveTo(start.x, start.y)
    ctx.quadraticCurveTo(previous.x, previous.y, end.x, end.y)
    ctx.stroke()
  }
}

// The run from the last midpoint to the live nib. It is re-drawn every frame,
// so it is never baked into the settled layer.
function paintTail(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const { points } = stroke
  const count = points.length
  if (count < 2 || (stroke.tool === 'eraser' && stroke.height)) return
  const previous = points[count - 2], current = points[count - 1]
  const end = midpoint(previous, current)
  inkStyle(ctx, stroke)
  if (stroke.tool === 'marker') {
    markerSegment(ctx, stroke, end, current, current)
    return
  }
  ctx.beginPath()
  ctx.lineWidth = effectiveWidth(stroke, current.pressure)
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(current.x, current.y)
  ctx.stroke()
}

/* ── compositing ────────────────────────────────────────────────────────── */

type Rect = { x: number; y: number; width: number; height: number }

function deviceRect(bounds: Bounds, scale: number, canvas: HTMLCanvasElement): Rect | null {
  const x = Math.max(0, Math.floor(bounds.left * scale))
  const y = Math.max(0, Math.floor(bounds.top * scale))
  const right = Math.min(canvas.width, Math.ceil(bounds.right * scale))
  const bottom = Math.min(canvas.height, Math.ceil(bounds.bottom * scale))
  return right <= x || bottom <= y ? null : { x, y, width: right - x, height: bottom - y }
}

function composite(
  ctx: CanvasRenderingContext2D, stroke: Stroke, source: HTMLCanvasElement, rect: Rect,
) {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  ctx.globalAlpha = inkAlpha(stroke)
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height, rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}

/**
 * Paint one whole stroke onto `ctx` through the scratch `coverage` canvas.
 * Coverage is built opaque and composited once, so overlapping samples inside a
 * stroke cannot stack into dark seams. Work is limited to the stroke's box.
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, coverage: HTMLCanvasElement) {
  if (!stroke.points.length) return
  const transform = ctx.getTransform()
  const bounds = strokeBounds(stroke)
  const rect = deviceRect(bounds, transform.a, coverage)
  if (!rect) return
  const ink = coverage.getContext('2d')!
  ink.setTransform(1, 0, 0, 1, 0, 0)
  ink.clearRect(rect.x, rect.y, rect.width, rect.height)
  ink.setTransform(transform)
  paintContact(ink, stroke)
  paintRange(ink, stroke, 1, stroke.points.length)
  paintTail(ink, stroke)
  applyWash(ink, stroke, bounds)
  paintPools(ink, stroke)
  composite(ctx, stroke, coverage, rect)
}


/**
 * Keeps committed ink in its own layer. Appending a stroke paints only that
 * stroke; a live stroke repaints only the box its newest samples touched.
 */
export function createBoardRenderer(canvas: HTMLCanvasElement): BoardRenderer {
  const committed = document.createElement('canvas')
  const coverage = document.createElement('canvas')
  const settledInk = document.createElement('canvas')
  let painted: readonly Stroke[] = []
  let scale = 1
  let live: Stroke | null = null
  let settled = 0
  let previousTail: Bounds | null = null
  let liveFromScratch = true
  let liveOnCanvas = false

  const boardTransform = (ctx: CanvasRenderingContext2D) => ctx.setTransform(scale, 0, 0, scale, 0, 0)

  const repaintCommitted = (strokes: readonly Stroke[]) => {
    const base = committed.getContext('2d')!
    const appended = strokes.length > painted.length && painted.every((stroke, i) => stroke === strokes[i])
    if (!appended) {
      base.setTransform(1, 0, 0, 1, 0, 0)
      base.clearRect(0, 0, committed.width, committed.height)
    }
    boardTransform(base)
    for (let i = appended ? painted.length : 0; i < strokes.length; i++) drawStroke(base, strokes[i], coverage)
    painted = strokes
  }

  const blit = (rect: Rect | null) => {
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const area = rect ?? { x: 0, y: 0, width: canvas.width, height: canvas.height }
    ctx.clearRect(area.x, area.y, area.width, area.height)
    ctx.drawImage(committed, area.x, area.y, area.width, area.height, area.x, area.y, area.width, area.height)
  }

  const resetLive = (stroke: Stroke | null) => {
    live = stroke
    settled = 0
    previousTail = null
    liveFromScratch = true
    const ink = settledInk.getContext('2d')!
    ink.setTransform(1, 0, 0, 1, 0, 0)
    ink.clearRect(0, 0, settledInk.width, settledInk.height)
  }

  const paintLive = (stroke: Stroke) => {
    const ink = settledInk.getContext('2d')!
    boardTransform(ink)
    if (settled === 0) paintContact(ink, stroke)
    paintRange(ink, stroke, settled, stroke.points.length)
    // Segment i draws from points i - 2, so fresh pixels start two samples back.
    const fresh = liveFromScratch
      ? strokeBounds(stroke)
      : pad(grow({ ...EMPTY }, stroke.points, settled - 2, stroke.points.length), padding(stroke))
    settled = stroke.points.length
    const from = Math.max(0, stroke.points.length - 2)
    const tail = pad(grow({ ...EMPTY }, stroke.points, from, stroke.points.length), padding(stroke))
    const dirty = union(union(fresh, previousTail), tail)!
    previousTail = tail
    liveFromScratch = false

    const rect = deviceRect(dirty, scale, canvas)
    if (!rect) return
    blit(rect)
    const scratch = coverage.getContext('2d')!
    scratch.setTransform(1, 0, 0, 1, 0, 0)
    scratch.clearRect(rect.x, rect.y, rect.width, rect.height)
    scratch.drawImage(settledInk, rect.x, rect.y, rect.width, rect.height, rect.x, rect.y, rect.width, rect.height)
    boardTransform(scratch)
    paintTail(scratch, stroke)
    applyWash(scratch, stroke, dirty)
    paintPools(scratch, stroke)
    composite(canvas.getContext('2d')!, stroke, coverage, rect)
  }

  return {
    resize(width: number, height: number, dpr: number) {
      const deviceWidth = Math.max(1, Math.round(width * dpr))
      const deviceHeight = Math.max(1, Math.round(height * dpr))
      for (const layer of [canvas, committed, coverage, settledInk]) {
        layer.width = deviceWidth
        layer.height = deviceHeight
      }
      scale = deviceWidth / BOARD_WIDTH
      painted = []
      resetLive(null)
    },
    render(strokes: readonly Stroke[], active: Stroke | null = null) {
      const committedChanged = strokes !== painted
      if (committedChanged) repaintCommitted(strokes)
      if (active !== live) resetLive(active)
      if (committedChanged || (!active && liveOnCanvas)) {
        blit(null)
        liveOnCanvas = false
        liveFromScratch = true
      }
      if (!active?.points.length) return
      paintLive(active)
      liveOnCanvas = true
    },
  }
}
