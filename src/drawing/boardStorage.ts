import type { DrawingStroke } from './types'

export const STORAGE_KEY = 'kimolia:board:v1'
const MAX_CHARACTERS = 2_000_000
const MAX_POINTS = 40_000
type Store = Pick<Storage, 'getItem' | 'setItem'>
export type SaveStatus =
  'idle' | 'saving' | 'saved' | 'unavailable' | 'invalid' | 'full'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const number = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max

// Treat saved data as untrusted. Reject the entire document instead of silently
// restoring only part of someone's drawing or replaying unbounded input.
export function decodeBoard(raw: string): DrawingStroke[] {
  if (raw.length > MAX_CHARACTERS) throw new Error('Drawing is too large')
  const data: unknown = JSON.parse(raw)
  if (
    !record(data) ||
    data.version !== 1 ||
    !Array.isArray(data.strokes) ||
    data.strokes.length > 4000
  )
    throw new Error('Unsupported drawing')
  let points = 0
  return data.strokes.map((stroke: unknown) => {
    if (
      !record(stroke) ||
      !record(stroke.space) ||
      !number(stroke.space.width, 1, 10000) ||
      !number(stroke.space.height, 1, 10000) ||
      !number(stroke.id, 0, Number.MAX_SAFE_INTEGER) ||
      !Number.isInteger(stroke.id) ||
      !number(stroke.seed, 0, 0xffffffff) ||
      !Number.isInteger(stroke.seed) ||
      !number(stroke.width, 0.5, 500) ||
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
          !record(point) ||
          !number(point.x, -0.01, space.width + 0.01) ||
          !number(point.y, -0.01, space.height + 0.01) ||
          !number(point.pressure, 0, 1)
        )
          throw new Error('Invalid point')
        return { x: point.x, y: point.y, pressure: point.pressure }
      }),
    }
    if (stroke.tool === 'duster' && number(stroke.height, 0.5, 500))
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

export function createBoardStorage(getStore: () => Store) {
  return {
    load(): { strokes: DrawingStroke[]; status: SaveStatus } {
      let raw: string | null
      try {
        raw = getStore().getItem(STORAGE_KEY)
      } catch {
        return { strokes: [], status: 'unavailable' }
      }
      if (raw === null) return { strokes: [], status: 'idle' }
      try {
        return { strokes: decodeBoard(raw), status: 'saved' }
      } catch {
        return { strokes: [], status: 'invalid' }
      }
    },
    save(strokes: DrawingStroke[]): SaveStatus {
      // These are typed records produced by the renderer (or already validated
      // on restore). Check limits before serialising; do not parse and rebuild
      // the entire drawing again on every autosave.
      if (strokes.length > 4000) return 'full'
      let points = 0
      for (const stroke of strokes) {
        points += stroke.points.length
        if (points > MAX_POINTS) return 'full'
      }
      const raw = JSON.stringify({ version: 1, strokes })
      if (raw.length > MAX_CHARACTERS) return 'full'
      try {
        getStore().setItem(STORAGE_KEY, raw)
        return 'saved'
      } catch {
        return 'unavailable'
      }
    },
  }
}
