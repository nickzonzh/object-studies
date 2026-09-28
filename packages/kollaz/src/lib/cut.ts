// Scissor cuts through a sheet of paper. Shapes are GeoJSON-style multipolygons in
// table units; boolean operations come from polygon-clipping.
import polygonClipping, { type MultiPolygon, type Pair, type Polygon } from 'polygon-clipping'
import { pathLength } from './pipe.js'
import type { Point } from './tornEdge.js'

export type Shape = MultiPolygon
/** A sheet has two layers: the pale torn core (outer) and the coloured face (inner). */
export type PaperShape = { outer: Shape; inner: Shape }
export type CutResult =
  | { kind: 'slit'; path: Point[] }
  | { kind: 'none' }
  | { kind: 'piece'; sheet: PaperShape; piece: PaperShape }

/** How close the end of a stroke must come back to its start to count as a closed loop. */
export const CLOSE_DISTANCE = 30

/** Nobody closes a hand-cut loop exactly. The bigger the loop, the bigger the forgivable gap. */
export const closeDistance = (path: Point[]) => Math.max(CLOSE_DISTANCE, pathLength(path) * 0.12)

function crossing(a: Point, b: Point, c: Point, d: Point): Point | null {
  const r = { x: b.x - a.x, y: b.y - a.y }
  const q = { x: d.x - c.x, y: d.y - c.y }
  const den = r.x * q.y - r.y * q.x
  if (Math.abs(den) < 1e-9) return null
  const t = ((c.x - a.x) * q.y - (c.y - a.y) * q.x) / den
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den
  return t > 0 && t < 1 && u > 0 && u < 1 ? { x: a.x + r.x * t, y: a.y + r.y * t } : null
}

/**
 * If a cut path crosses itself, return the loop it encloses (the first crossing found
 * walking forward), trimmed to start and end at the crossing point.
 */
export function selfLoop(path: Point[]): Point[] | null {
  for (let j = 3; j < path.length; j++) {
    for (let i = 0; i < j - 2; i++) {
      const hit = crossing(path[i], path[i + 1], path[j - 1], path[j])
      if (hit) {
        const loop = [hit, ...path.slice(i + 1, j), hit]
        return loop.length > 8 ? loop : null
      }
    }
  }
  return null
}
/** One snip of a pair of craft scissors, in table units (about 1.2 cm). */
export const SNIP_LENGTH = 26

export const fromPoints = (points: Point[]): Shape => [[points.map((p) => [p.x, p.y] as Pair)]]

export function ringArea(ring: Pair[]) {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a) / 2
}

export const shapeArea = (shape: Shape) =>
  shape.reduce((sum, polygon) => sum + ringArea(polygon[0]) - polygon.slice(1).reduce((h, ring) => h + ringArea(ring), 0), 0)

function inRing(ring: Pair[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export const inShape = (shape: Shape, x: number, y: number) =>
  shape.some((polygon) => inRing(polygon[0], x, y) && !polygon.slice(1).some((hole) => inRing(hole, x, y)))

export function bounds(shape: Shape) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const polygon of shape) for (const [x, y] of polygon[0]) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Resample a hand-drawn cut evenly, then add the tiny step a real pair of scissors
 * leaves where one snip ends and the next begins.
 */
export function snipPath(points: Point[], spacing = 3, snip = SNIP_LENGTH, step = 0.7): Point[] {
  if (points.length < 2) return points.slice()
  const out: Point[] = [points[0]]
  let carry = 0
  let travelled = 0
  let side = 1
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    if (!len) continue
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    let d = spacing - carry
    while (d <= len) {
      travelled += spacing
      const t = d / len
      let x = a.x + (b.x - a.x) * t
      let y = a.y + (b.y - a.y) * t
      if (travelled >= snip) {
        travelled -= snip
        side = -side
        x += nx * step * side
        y += ny * step * side
      }
      out.push({ x, y })
      d += spacing
    }
    carry = len - (d - spacing)
  }
  const last = points[points.length - 1]
  if (Math.hypot(last.x - out[out.length - 1].x, last.y - out[out.length - 1].y) > 0.5) out.push(last)
  return out
}

/**
 * The region on one side of an edge-to-edge cut. The ends are pushed far out along
 * their own direction, then the ring closes around a huge box, so the polygon's
 * edge is exactly the cut wherever it crosses the sheet.
 */
export function sideOfCut(path: Point[], reach = 20000): Shape {
  const first = path[0]
  const second = path[Math.min(3, path.length - 1)]
  const last = path[path.length - 1]
  const before = path[Math.max(0, path.length - 4)]
  const dir = (a: Point, b: Point) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    return { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  }
  const d0 = dir(second, first)
  const d1 = dir(before, last)
  const start = { x: first.x + d0.x * reach, y: first.y + d0.y * reach }
  const end = { x: last.x + d1.x * reach, y: last.y + d1.y * reach }
  const cx = (first.x + last.x) / 2
  const cy = (first.y + last.y) / 2
  const angle = (p: Point) => Math.atan2(p.y - cy, p.x - cx)
  // Walk the far corners from the end back round to the start, turning one way only.
  const R = reach * 3
  const corners = [Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4, -Math.PI / 4]
    .map((a) => ({ a, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }))
  const a0 = angle(end)
  const span = (((angle(start) - a0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const between = corners
    .map((c) => ({ ...c, d: (((c.a - a0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) }))
    .filter((c) => c.d < span)
    .sort((p, q) => p.d - q.d)
  const ring = [start, ...path, end, ...between]
  return fromPoints(ring)
}

const nonEmpty = (shape: Shape) => shape.length > 0 && shapeArea(shape) > 4

/**
 * Cut a sheet along a scissor path.
 * - A path that comes back near its start cuts out the enclosed shape.
 * - A path that starts and ends off the sheet splits it; the smaller part lifts away.
 * - Anything else leaves a slit.
 */
export function cutSheet(sheet: PaperShape, raw: Point[]): CutResult {
  if (raw.length < 3) return { kind: 'none' }
  let path = snipPath(raw)
  // A path that crosses itself encloses a loop: cut that loop out.
  const loop = selfLoop(path)
  if (loop) path = loop
  const start = path[0]
  const end = path[path.length - 1]
  const closed = Boolean(loop) || (path.length > 12 && Math.hypot(end.x - start.x, end.y - start.y) <= closeDistance(path))
  const offSheet = (p: Point) => !inShape(sheet.outer, p.x, p.y)

  let cutter: Shape | null = null
  if (closed) {
    cutter = fromPoints(path)
  } else if (offSheet(start) && offSheet(end) && path.some((p) => !offSheet(p))) {
    const side = sideOfCut(path)
    const a = polygonClipping.intersection(sheet.outer, side)
    const b = polygonClipping.difference(sheet.outer, side)
    if (!nonEmpty(a) || !nonEmpty(b)) return { kind: 'slit', path }
    // Lift the smaller part, like you would.
    cutter = shapeArea(a) <= shapeArea(b) ? side : polygonClipping.difference(fromPoints(boxAround(sheet.outer)), side)
  }
  if (!cutter) return path.some((p) => !offSheet(p)) ? { kind: 'slit', path } : { kind: 'none' }

  const piece: PaperShape = {
    outer: polygonClipping.intersection(sheet.outer, cutter),
    inner: polygonClipping.intersection(sheet.inner, cutter),
  }
  if (!nonEmpty(piece.outer)) return { kind: 'none' }
  return {
    kind: 'piece',
    piece,
    sheet: {
      outer: polygonClipping.difference(sheet.outer, cutter),
      inner: polygonClipping.difference(sheet.inner, cutter),
    },
  }
}

function boxAround(shape: Shape): Point[] {
  const b = bounds(shape)
  const m = 50
  return [
    { x: b.x - m, y: b.y - m }, { x: b.x + b.width + m, y: b.y - m },
    { x: b.x + b.width + m, y: b.y + b.height + m }, { x: b.x - m, y: b.y + b.height + m },
  ]
}

/** SVG path data for a shape, optionally shifted, for use in masks and clip paths. */
export function shapePath(shape: Shape, dx = 0, dy = 0) {
  return shape
    .map((polygon) => polygon.map((ring) => `M${ring.map(([x, y]) => `${(x - dx).toFixed(1)} ${(y - dy).toFixed(1)}`).join('L')}Z`).join(''))
    .join('')
}

/** A CSS mask that shows exactly this shape inside a box of the given size. */
export function shapeMask(shape: Shape, box: { x: number; y: number; width: number; height: number }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}' preserveAspectRatio='none'><path fill-rule='evenodd' d='${shapePath(shape, box.x, box.y)}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export function shapePath2D(shape: Shape) {
  return new Path2D(shapePath(shape))
}

export const polygonFromRing = (points: Point[]): Polygon => [points.map((p) => [p.x, p.y] as Pair)]

export const translateShape = (shape: Shape, dx: number, dy: number): Shape =>
  shape.map((polygon) => polygon.map((ring) => ring.map(([x, y]) => [x + dx, y + dy] as Pair)))

/** Merge shapes into one clean region, so overlaps never cancel each other out. */
export const unionOf = (shapes: Shape[]): Shape =>
  shapes.length ? polygonClipping.union(shapes[0], ...shapes.slice(1)) : []
