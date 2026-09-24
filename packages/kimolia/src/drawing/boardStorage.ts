import {
  createPersistence,
  isIntegerWithin,
  isNumberWithin,
  isRecord,
  type Persistence,
  type StorageLike,
} from 'object-studies-core'
import type { DrawingStroke } from './types.js'

export const MAX_STROKES = 4000
export const MAX_POINTS = 40_000
const MAX_CHARACTERS = 2_000_000

/**
 * Treat saved data as untrusted. Reject the entire document instead of silently
 * restoring only part of someone's drawing or replaying unbounded input.
 */
export function decodeStrokes(
  document: Record<string, unknown>,
): DrawingStroke[] {
  if (!Array.isArray(document.strokes) || document.strokes.length > MAX_STROKES)
    throw new Error('Unsupported drawing')
  let points = 0
  return document.strokes.map((stroke: unknown) => {
    if (
      !isRecord(stroke) ||
      !isRecord(stroke.space) ||
      !isNumberWithin(stroke.space.width, 1, 10000) ||
      !isNumberWithin(stroke.space.height, 1, 10000) ||
      !isIntegerWithin(stroke.id, 0, Number.MAX_SAFE_INTEGER) ||
      !isIntegerWithin(stroke.seed, 0, 0xffffffff) ||
      !isNumberWithin(stroke.width, 0.5, 500) ||
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
    if (stroke.tool === 'duster' && isNumberWithin(stroke.height, 0.5, 500))
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
}

/**
 * Drawings are stored under the key the consumer chooses. Limits are checked
 * against the renderer's own records before serialising, rather than parsing
 * and rebuilding the whole drawing on every autosave.
 */
export function createBoardStorage(
  key: string,
  getStorage?: () => StorageLike | null,
): Persistence<DrawingStroke[]> {
  return createPersistence<DrawingStroke[]>({
    key,
    version: 1,
    decode: decodeStrokes,
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
      return true
    },
  })
}
