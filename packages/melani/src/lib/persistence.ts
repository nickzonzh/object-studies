import {
  createPersistence,
  type LoadStatus, type SaveStatus, type StorageLike,
} from 'object-studies-core'
import { MAX_POINTS, MAX_STROKES, decodeStrokes } from './decode.js'
import type { Stroke } from './strokes.js'

export const BOARD_VERSION = 2

export type BoardPersistence = {
  load: () => { strokes: readonly Stroke[] | null; status: LoadStatus }
  save: (strokes: readonly Stroke[]) => SaveStatus
}

const countPoints = (strokes: readonly Stroke[]) =>
  strokes.reduce((total, stroke) => total + stroke.points.length, 0)

const defaultStorage = (): StorageLike | null =>
  typeof localStorage === 'undefined' ? null : localStorage

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
  return {
    load() {
      const { value, status } = store.load()
      return { strokes: value, status }
    },
    save: store.save,
  }
}
