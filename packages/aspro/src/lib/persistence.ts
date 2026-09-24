import {
  createPersistence, isNumberWithin, isRecord,
  type PersistenceStatus, type StorageLike,
} from 'object-studies-core'
import type { Point, Stroke } from './strokes.js'

export const BOARD_VERSION = 2
const MAX_STROKES = 4000
const MAX_POINTS = 40_000
/** Pointer capture keeps recording off the board, so coordinates run wide. */
const COORDINATE_LIMIT = 10_000

export type BoardPersistence = {
  load: () => { strokes: readonly Stroke[] | null; status: PersistenceStatus }
  save: (strokes: readonly Stroke[]) => PersistenceStatus
}

// Saved drawings are untrusted input: reject the whole document rather than
// restore half of someone's board, and never hand the renderer a shape it
// would crash on.
function decodePoints(value: unknown, limit: { left: number }): Point[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Invalid stroke')
  limit.left -= value.length
  if (limit.left < 0) throw new Error('Too many points')
  return value.map((raw: unknown) => {
    if (
      !isRecord(raw)
      || !isNumberWithin(raw.x, -COORDINATE_LIMIT, COORDINATE_LIMIT)
      || !isNumberWithin(raw.y, -COORDINATE_LIMIT, COORDINATE_LIMIT)
      || !isNumberWithin(raw.pressure, 0, 1)
    ) throw new Error('Invalid point')
    const point: Point = { x: raw.x, y: raw.y, pressure: raw.pressure }
    if (raw.angle !== undefined && !isNumberWithin(raw.angle, -720, 720)) throw new Error('Invalid point')
    if (raw.breakBefore !== undefined && typeof raw.breakBefore !== 'boolean') throw new Error('Invalid point')
    return {
      ...point,
      ...(raw.angle === undefined ? {} : { angle: raw.angle }),
      ...(raw.breakBefore ? { breakBefore: true } : {}),
    }
  })
}

export function decodeStrokes(value: unknown): Stroke[] {
  if (!Array.isArray(value) || value.length > MAX_STROKES) throw new Error('Unsupported drawing')
  const limit = { left: MAX_POINTS }
  return value.map((raw: unknown) => {
    if (
      !isRecord(raw)
      || typeof raw.id !== 'string' || raw.id.length > 128
      || typeof raw.color !== 'string' || raw.color.length > 64
      || !isNumberWithin(raw.width, 0.5, 500)
      || (raw.tool !== 'marker' && raw.tool !== 'eraser')
    ) throw new Error('Invalid stroke')
    const stroke: Stroke = {
      id: raw.id, tool: raw.tool, color: raw.color, width: raw.width,
      points: decodePoints(raw.points, limit),
    }
    // Legacy eraser strokes are circular and carry no felt height.
    if (raw.height === undefined) return stroke
    if (!isNumberWithin(raw.height, 0.5, 500)) throw new Error('Invalid stroke')
    return { ...stroke, height: raw.height }
  })
}

const countPoints = (strokes: readonly Stroke[]) =>
  strokes.reduce((total, stroke) => total + stroke.points.length, 0)

const defaultStorage = (): StorageLike | null =>
  typeof localStorage === 'undefined' ? null : localStorage

/**
 * Versioned board storage. Version 1 kept a bare array of strokes under its own
 * key and never recorded the size it was drawn at; it is imported once, on the
 * original desktop-sized board, and left in place.
 */
export function createBoardPersistence(
  key: string,
  getStorage: () => StorageLike | null = defaultStorage,
): BoardPersistence {
  const store = createPersistence<readonly Stroke[]>({
    key,
    version: BOARD_VERSION,
    getStorage,
    decode: (document) => decodeStrokes(document.strokes),
    encode: (strokes) => ({ strokes }),
    withinLimits: (strokes) => strokes.length <= MAX_STROKES && countPoints(strokes) <= MAX_POINTS,
  })
  const legacyKey = key.endsWith(':v2') ? `${key.slice(0, -1)}1` : null
  return {
    load() {
      const current = store.load()
      if (current.value || current.status !== 'idle' || !legacyKey) {
        return { strokes: current.value, status: current.status }
      }
      let raw: string | null = null
      try {
        raw = getStorage()?.getItem(legacyKey) ?? null
      } catch {
        return { strokes: null, status: 'unavailable' }
      }
      if (raw === null) return { strokes: null, status: 'idle' }
      try {
        return { strokes: decodeStrokes(JSON.parse(raw)), status: 'saved' }
      } catch {
        return { strokes: null, status: 'invalid' }
      }
    },
    save: store.save,
  }
}
