/**
 * The garden's clock. Nothing ticks while the page is closed: every planting
 * keeps two timestamps and one running total, and its state at any moment is
 * worked out from those. A visitor who comes back after three days sees three
 * days of growth, or three days of thirst, in a single render.
 *
 * Plants only grow while their soil is wet. A watering keeps the soil wet for
 * `MOIST_HOURS`; after that the plant wilts and stops growing until it is
 * watered again. Nothing ever dies.
 */

export type CropId = 'tomato' | 'cucumber' | 'watermelon' | 'basil' | 'geranium'

export type Stage = 'seed' | 'sprout' | 'leafy' | 'flowering' | 'fruiting' | 'ripe'

export type Crop = {
  id: CropId
  /** Wet hours from sowing to ripe. */
  growHours: number
  /**
   * Progress a harvest returns the plant to, or null when a harvest clears the
   * plot. Tomatoes and cucumbers keep cropping; a watermelon vine gives one.
   */
  regrowTo: number | null
  /** False for plants grown for their flowers, which are never picked. */
  harvestable: boolean
}

export const CROPS: Record<CropId, Crop> = {
  tomato: { id: 'tomato', growHours: 96, regrowTo: 0.72, harvestable: true },
  cucumber: { id: 'cucumber', growHours: 72, regrowTo: 0.72, harvestable: true },
  watermelon: { id: 'watermelon', growHours: 120, regrowTo: null, harvestable: true },
  // Pinching basil back is how it gets bushy, so a pinch only trims it.
  basil: { id: 'basil', growHours: 48, regrowTo: 0.62, harvestable: true },
  geranium: { id: 'geranium', growHours: 72, regrowTo: null, harvestable: false },
}

export const CROP_IDS = Object.keys(CROPS) as CropId[]

/** How long one watering keeps the soil wet, in garden hours. */
export const MOIST_HOURS = 24
/** Wet hours left when the soil starts to look dry. */
export const THIRSTY_HOURS = 6

const HOUR = 3_600_000

export type Planting = {
  crop: CropId
  /** Epoch ms. */
  plantedAt: number
  /** Epoch ms of the last watering. Sowing counts as one. */
  wateredAt: number
  /** Wet garden hours banked up to `wateredAt`. */
  growth: number
}

export type PlantingState = {
  /** 0 at sowing, 1 when ripe. Can run past 1; ripe plants simply wait. */
  progress: number
  stage: Stage
  /** 1 just after watering, 0 once the soil has dried out. */
  moisture: number
  thirsty: boolean
  wilted: boolean
  ripe: boolean
}

/**
 * Garden hours between two instants. A clock that moved backwards counts as
 * no time at all, so winding the device clock back can't undo growth.
 */
export const gardenHours = (from: number, to: number, speed = 1) =>
  Math.max(0, to - from) / HOUR * speed

const wetHours = (planting: Planting, now: number, speed: number) =>
  Math.min(gardenHours(planting.wateredAt, now, speed), MOIST_HOURS)

export function sow(crop: CropId, now: number): Planting {
  return { crop, plantedAt: now, wateredAt: now, growth: 0 }
}

/**
 * Banks the wet time since the last watering and wets the soil again. A last
 * watering stamped in the future (the clock was set forward, then corrected)
 * banks nothing but still moves the stamp to now, so watering keeps working.
 */
export function water(planting: Planting, now: number, speed = 1): Planting {
  if (now === planting.wateredAt) return planting
  return {
    ...planting,
    growth: planting.growth + wetHours(planting, now, speed),
    plantedAt: Math.min(planting.plantedAt, now),
    wateredAt: now,
  }
}

/**
 * Re-expresses a planting kept at one speed for another, so the garden hours
 * already elapsed stay the same. Without it, switching speed would replay the
 * time since the last watering at the new rate and lose (or invent) growth.
 */
export function rescale(planting: Planting, now: number, from: number, to: number): Planting {
  if (from === to) return planting
  const wateredAt = rescaleTime(planting.wateredAt, now, from, to)
  return { ...planting, wateredAt, plantedAt: Math.min(rescaleTime(planting.plantedAt, now, from, to), wateredAt) }
}

/** The instant that is as many garden hours before `now` at speed `to` as `time` was at speed `from`. */
export const rescaleTime = (time: number, now: number, from: number, to: number) =>
  // Never earlier than 2000, the oldest instant a stored document may hold.
  time >= now ? time : Math.max(946_684_800_000, Math.round(now - ((now - time) * from) / to))

export function stageFor(progress: number): Stage {
  if (progress >= 1) return 'ripe'
  if (progress >= 0.7) return 'fruiting'
  if (progress >= 0.5) return 'flowering'
  if (progress >= 0.25) return 'leafy'
  if (progress >= 0.07) return 'sprout'
  return 'seed'
}

export function readPlanting(planting: Planting, now: number, speed = 1): PlantingState {
  const crop = CROPS[planting.crop]
  const sinceWatered = gardenHours(planting.wateredAt, now, speed)
  const wet = Math.min(sinceWatered, MOIST_HOURS)
  const progress = (planting.growth + wet) / crop.growHours
  const moisture = Math.max(0, 1 - sinceWatered / MOIST_HOURS)
  const wilted = sinceWatered >= MOIST_HOURS
  return {
    progress,
    stage: stageFor(progress),
    moisture,
    thirsty: !wilted && MOIST_HOURS - sinceWatered <= THIRSTY_HOURS,
    wilted,
    ripe: progress >= 1,
  }
}

/**
 * Picks a ripe plant. Returns the planting that stays in the ground, or null
 * when the harvest clears the plot. Unripe or flowering-only plants are left
 * as they are.
 */
export function harvest(planting: Planting, now: number, speed = 1): Planting | null {
  const crop = CROPS[planting.crop]
  if (!crop.harvestable || !readPlanting(planting, now, speed).ripe) return planting
  if (crop.regrowTo === null) return null
  // Bank the time so far, then trim the total back. The soil stays as wet as it was.
  return { ...planting, growth: crop.regrowTo * crop.growHours - wetHours(planting, now, speed) }
}
