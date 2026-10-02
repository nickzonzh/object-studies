import { createPersistence, isIntegerWithin, isNumberWithin, isRecord, type StorageLike } from 'object-studies-core'
import { CROPS, type CropId, type Planting } from './garden.js'

/** Every bed has this many plots, left to right. */
export const PLOT_COUNT = 3

export type BedDocument = {
  /** Epoch ms of the first sowing, for the day count. Null until then. */
  startedAt: number | null
  plots: (Planting | null)[]
  /** Everything picked from this bed, ever. */
  picked: number
}

export type TenekeDocument = {
  planting: Planting | null
  picked: number
}

export const emptyBed = (): BedDocument => ({
  startedAt: null,
  plots: Array.from({ length: PLOT_COUNT }, () => null),
  picked: 0,
})

export const emptyTeneke = (): TenekeDocument => ({ planting: null, picked: 0 })

// Year 2000 to year 2300 in ms: wide enough for any real clock, narrow enough
// to reject nonsense.
const MIN_TIME = 946_684_800_000
const MAX_TIME = 10_413_792_000_000
const isTime = (value: unknown): value is number => isIntegerWithin(value, MIN_TIME, MAX_TIME)

const isCrop = (value: unknown): value is CropId =>
  typeof value === 'string' && Object.hasOwn(CROPS, value)

function decodePlanting(value: unknown, allowed?: readonly CropId[]): Planting | null {
  if (value === null) return null
  if (!isRecord(value)) throw new Error('Planting is not an object')
  const { crop, plantedAt, wateredAt, growth } = value
  if (!isCrop(crop) || (allowed && !allowed.includes(crop))) throw new Error('Unknown crop')
  if (!isTime(plantedAt) || !isTime(wateredAt) || wateredAt < plantedAt) throw new Error('Bad times')
  if (!isNumberWithin(growth, 0, 1_000_000)) throw new Error('Bad growth')
  return { crop, plantedAt, wateredAt, growth }
}

const encodePlanting = (planting: Planting | null) =>
  planting && {
    crop: planting.crop,
    plantedAt: planting.plantedAt,
    wateredAt: planting.wateredAt,
    growth: planting.growth,
  }

const BED_CROPS: readonly CropId[] = ['tomato', 'cucumber', 'watermelon']

export function decodeBed(document: Record<string, unknown>): BedDocument {
  const { startedAt, plots, picked } = document
  if (startedAt !== null && !isTime(startedAt)) throw new Error('Bad start')
  if (!Array.isArray(plots) || plots.length !== PLOT_COUNT) throw new Error('Bad plots')
  if (!isIntegerWithin(picked, 0, 1_000_000)) throw new Error('Bad count')
  return { startedAt, plots: plots.map((plot) => decodePlanting(plot, BED_CROPS)), picked }
}

export const encodeBed = (bed: BedDocument) => ({
  startedAt: bed.startedAt,
  plots: bed.plots.map(encodePlanting),
  picked: bed.picked,
})

export function decodeTeneke(document: Record<string, unknown>): TenekeDocument {
  const { planting, picked } = document
  if (!isIntegerWithin(picked, 0, 1_000_000)) throw new Error('Bad count')
  return { planting: decodePlanting(planting, ['basil', 'geranium']), picked }
}

export const encodeTeneke = (teneke: TenekeDocument) => ({
  planting: encodePlanting(teneke.planting),
  picked: teneke.picked,
})

type GetStorage = () => StorageLike | null

export const bedStore = (key: string, getStorage?: GetStorage) =>
  createPersistence({ key, version: 1, decode: decodeBed, encode: encodeBed, maxCharacters: 4_000, getStorage })

export const tenekeStore = (key: string, getStorage?: GetStorage) =>
  createPersistence({ key, version: 1, decode: decodeTeneke, encode: encodeTeneke, maxCharacters: 1_000, getStorage })
