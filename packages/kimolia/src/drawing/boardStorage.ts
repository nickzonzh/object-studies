import {
  createPersistence,
  isIntegerWithin,
  isNumberWithin,
  isRecord,
  type Persistence,
  type StorageLike,
} from 'object-studies-core'
import { CHALK_SPACING, CHALK_WIDTH } from './chalkSampler.js'
import { DUSTER_SPACING } from './dusterSampler.js'
import type { DrawingStroke } from './types.js'

export const MAX_STROKES = 4000
export const MAX_POINTS = 40_000
/**
 * Replay cost, counted in stamps. A heavy drawing made by hand stays well
 * under a million; this stops a crafted one from occupying the board for ever.
 */
export const MAX_STAMPS = 4_000_000
const MAX_CHARACTERS = 2_000_000
/** The slate's size in CSS pixels. Nothing could be drawn on a smaller one. */
const SPACE = { min: 64, max: 10_000 }
/**
 * Half the smallest felt the board measures to twice the largest: 57–126 wide
 * and 36–48 high, depending on the board's width.
 */
const DUSTER_WIDTH = { min: 28, max: 252 }
const DUSTER_HEIGHT = { min: 18, max: 96 }

const within = (value: number, range: { min: number; max: number }) =>
  isNumberWithin(value, range.min, range.max)

/**
 * What stops a drawing from freezing the board when it is replayed: tool sizes
 * the board itself produces, a real slate size, and a total stamp budget — the
 * distance travelled over each tool's stamp spacing, plus a step per point.
 */
export function replayProblem(strokes: readonly DrawingStroke[]): string | null {
  let stamps = 0
  for (const stroke of strokes) {
    if (!within(stroke.space.width, SPACE) || !within(stroke.space.height, SPACE))
      return 'a stroke was drawn on an unsupported slate size'
    if (
      stroke.tool === 'chalk'
        ? !within(stroke.width, CHALK_WIDTH)
        : !within(stroke.width, DUSTER_WIDTH) ||
          !within(stroke.height, DUSTER_HEIGHT)
    )
      return `a ${stroke.tool} stroke has an unsupported size`
    const spacing =
      stroke.tool === 'chalk'
        ? stroke.width * CHALK_SPACING
        : stroke.height * DUSTER_SPACING
    const { points } = stroke
    let travel = 0
    for (let index = 1; index < points.length; index++)
      travel += Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y,
      )
    stamps += points.length + travel / spacing
    // Also rejects NaN, which would otherwise pass every comparison.
    if (!(stamps <= MAX_STAMPS)) return 'the drawing is too costly to replay'
  }
  return null
}

/**
 * Validates a drawing from untrusted storage — the array `onStrokesChange`
 * hands out — and returns a clean copy. Throws for anything invalid rather
 * than returning part of someone's drawing or replaying unbounded input.
 */
export function decodeStrokes(value: unknown): DrawingStroke[] {
  if (!Array.isArray(value) || value.length > MAX_STROKES)
    throw new Error('Unsupported drawing')
  let points = 0
  const strokes = value.map((stroke: unknown): DrawingStroke => {
    if (
      !isRecord(stroke) ||
      !isRecord(stroke.space) ||
      !isNumberWithin(stroke.space.width, 1, SPACE.max) ||
      !isNumberWithin(stroke.space.height, 1, SPACE.max) ||
      !isIntegerWithin(stroke.id, 0, Number.MAX_SAFE_INTEGER) ||
      !isIntegerWithin(stroke.seed, 0, 0xffffffff) ||
      !isNumberWithin(stroke.width, 0, Number.MAX_VALUE) ||
      !Array.isArray(stroke.points) ||
      !stroke.points.length
    )
      throw new Error('Invalid stroke')
    points += stroke.points.length
    if (points > MAX_POINTS) throw new Error('Too many points')
    const space = { width: stroke.space.width, height: stroke.space.height }
    const common = {
      id: stroke.id,
      seed: stroke.seed,
      width: stroke.width,
      space,
      points: stroke.points.map((point: unknown) => {
        if (
          !isRecord(point) ||
          !isNumberWithin(point.x, -0.01, space.width + 0.01) ||
          !isNumberWithin(point.y, -0.01, space.height + 0.01) ||
          !isNumberWithin(point.pressure, 0, 1)
        )
          throw new Error('Invalid point')
        return { x: point.x, y: point.y, pressure: point.pressure }
      }),
    }
    if (
      stroke.tool === 'duster' &&
      isNumberWithin(stroke.height, 0, Number.MAX_VALUE)
    )
      return { ...common, tool: 'duster', height: stroke.height }
    if (
      stroke.tool === 'chalk' &&
      (stroke.color === 'white' ||
        stroke.color === 'yellow' ||
        stroke.color === 'blue' ||
        stroke.color === 'pink')
    )
      return { ...common, tool: 'chalk', color: stroke.color }
    throw new Error('Invalid tool')
  })
  const problem = replayProblem(strokes)
  if (problem) throw new Error(`Unsupported drawing: ${problem}`)
  return strokes
}

/**
 * Drawings are stored under the key the consumer chooses. Limits are checked
 * against the renderer's own records before serialising, rather than parsing
 * and rebuilding the whole drawing on every autosave; anything a load would
 * reject is refused as too large instead of replacing a good document.
 */
export function createBoardStorage(
  key: string,
  getStorage?: () => StorageLike | null,
): Persistence<DrawingStroke[]> {
  return createPersistence<DrawingStroke[]>({
    key,
    version: 1,
    decode: (document) => decodeStrokes(document.strokes),
    encode: (strokes) => ({ strokes }),
    getStorage,
    maxCharacters: MAX_CHARACTERS,
    withinLimits(strokes) {
      if (strokes.length > MAX_STROKES) return false
      let points = 0
      for (const stroke of strokes) {
        points += stroke.points.length
        if (points > MAX_POINTS) return false
      }
      return replayProblem(strokes) === null
    },
  })
}
