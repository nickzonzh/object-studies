import { isNumberWithin, isRecord } from 'object-studies-core'
import type { Point, Stroke } from './strokes.js'

export const MAX_STROKES = 4000
export const MAX_POINTS = 40_000
/** Pointer capture keeps recording off the board, so coordinates run wide. */
const COORDINATE_LIMIT = 10_000
/** Widest tool footprint, in board units. The board clamps to it when drawing. */
export const MAX_TOOL_SIZE = 500

function decodePoints(value: unknown, budget: { left: number }): Point[] {
  if (!Array.isArray(value) || !value.length) throw new Error('points must be a non-empty array')
  budget.left -= value.length
  if (budget.left < 0) throw new Error('too many points')
  return value.map((raw: unknown) => {
    if (
      !isRecord(raw)
      || !isNumberWithin(raw.x, -COORDINATE_LIMIT, COORDINATE_LIMIT)
      || !isNumberWithin(raw.y, -COORDINATE_LIMIT, COORDINATE_LIMIT)
      || !isNumberWithin(raw.pressure, 0, 1)
      || (raw.angle !== undefined && !isNumberWithin(raw.angle, -720, 720))
      || (raw.breakBefore !== undefined && typeof raw.breakBefore !== 'boolean')
    ) throw new Error('invalid point')
    return {
      x: raw.x, y: raw.y, pressure: raw.pressure,
      ...(raw.angle === undefined ? {} : { angle: raw.angle }),
      ...(raw.breakBefore ? { breakBefore: true } : {}),
    }
  })
}

function decodeStroke(raw: unknown, budget: { left: number }): Stroke {
  if (
    !isRecord(raw)
    || typeof raw.id !== 'string' || raw.id.length > 128
    || typeof raw.color !== 'string' || raw.color.length > 64
    || !isNumberWithin(raw.width, 0.5, MAX_TOOL_SIZE)
    || (raw.tool !== 'marker' && raw.tool !== 'eraser')
    || (raw.height !== undefined && !isNumberWithin(raw.height, 0.5, MAX_TOOL_SIZE))
  ) throw new Error('invalid stroke')
  const stroke: Stroke = {
    id: raw.id, tool: raw.tool, color: raw.color, width: raw.width,
    points: decodePoints(raw.points, budget),
  }
  // Legacy eraser strokes are circular and carry no felt height.
  return raw.height === undefined ? stroke : { ...stroke, height: raw.height }
}

/**
 * Checks an untrusted drawing, such as a saved board, and returns a clean copy.
 * Throws for anything malformed or over the storage limits: a drawing is never
 * half-restored, and the renderer is never handed a shape it would crash on.
 */
export function decodeStrokes(value: unknown): Stroke[] {
  if (!Array.isArray(value)) throw new Error('A drawing must be an array of strokes')
  if (value.length > MAX_STROKES) throw new Error('A drawing holds at most 4000 strokes')
  const budget = { left: MAX_POINTS }
  return value.map((raw: unknown, index) => {
    try {
      return decodeStroke(raw, budget)
    } catch (error) {
      throw new Error(`Stroke ${index}: ${(error as Error).message}`)
    }
  })
}

// Strokes are immutable once drawn, so each is checked once, however often an
// owner hands the same drawing back.
const checked = new WeakSet<Stroke>()

/**
 * Stops a malformed `strokes` or `defaultStrokes` prop at the component, with
 * a message naming it, before it can reach the renderer. Props are the
 * consumer's own data, so the storage limits do not apply to them.
 */
export function checkStrokes(value: readonly Stroke[] | undefined, prop: string) {
  if (value === undefined) return
  if (!Array.isArray(value)) throw new Error(`melani: \`${prop}\` must be an array of strokes`)
  value.forEach((stroke, index) => {
    if (checked.has(stroke)) return
    try {
      decodeStroke(stroke, { left: Infinity })
    } catch (error) {
      throw new Error(`melani: \`${prop}[${index}]\` is not a valid stroke: ${(error as Error).message}`)
    }
    checked.add(stroke)
  })
}
