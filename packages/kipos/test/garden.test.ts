import assert from 'node:assert/strict'
import { test } from 'vitest'
import { CROPS, MOIST_HOURS, harvest, readPlanting, rescale, sow, stageFor, water } from '../src/lib/garden.js'
import { bedStore, emptyBed, rescaleBed, tenekeStore } from '../src/lib/documents.js'
import type { StorageLike } from 'object-studies-core'

const HOUR = 3_600_000
const T0 = Date.UTC(2026, 9, 2, 3)

test('a fresh sowing is a wet seed', () => {
  const state = readPlanting(sow('tomato', T0), T0)
  assert.equal(state.stage, 'seed')
  assert.equal(state.moisture, 1)
  assert.equal(state.wilted, false)
})

test('a plant grows only while its soil is wet, then wilts and waits', () => {
  const planting = sow('tomato', T0)
  const wet = readPlanting(planting, T0 + 12 * HOUR)
  assert.equal(wet.progress, 12 / CROPS.tomato.growHours)
  // Three days away: growth stops at the one day the watering covered.
  const away = readPlanting(planting, T0 + 72 * HOUR)
  assert.equal(away.progress, MOIST_HOURS / CROPS.tomato.growHours)
  assert.equal(away.wilted, true)
  assert.equal(away.moisture, 0)
})

test('watering a wilted plant revives it without losing growth', () => {
  const planting = water(sow('cucumber', T0), T0 + 72 * HOUR)
  const revived = readPlanting(planting, T0 + 72 * HOUR)
  assert.equal(revived.wilted, false)
  assert.equal(revived.progress, MOIST_HOURS / CROPS.cucumber.growHours)
  const later = readPlanting(planting, T0 + 84 * HOUR)
  assert.equal(later.progress, (MOIST_HOURS + 12) / CROPS.cucumber.growHours)
})

test('watering every day ripens a tomato in its grow time', () => {
  let planting = sow('tomato', T0)
  for (let day = 1; day <= 4; day++) planting = water(planting, T0 + day * 24 * HOUR)
  assert.equal(readPlanting(planting, T0 + 96 * HOUR).stage, 'ripe')
})

test('the soil looks thirsty in its last hours before drying', () => {
  const planting = sow('basil', T0)
  assert.equal(readPlanting(planting, T0 + 17 * HOUR).thirsty, false)
  assert.equal(readPlanting(planting, T0 + 19 * HOUR).thirsty, true)
  assert.equal(readPlanting(planting, T0 + 25 * HOUR).thirsty, false, 'wilted, no longer just thirsty')
})

test('speed scales garden time', () => {
  const planting = sow('basil', T0)
  // At 60x, a real minute is a garden hour.
  assert.equal(readPlanting(planting, T0 + 60_000, 60).progress, 1 / CROPS.basil.growHours)
})

test('winding the clock back neither grows nor shrinks a plant', () => {
  const planting = water(sow('tomato', T0), T0 + 10 * HOUR)
  const before = readPlanting(planting, T0 + 10 * HOUR).progress
  assert.equal(readPlanting(planting, T0 - 50 * HOUR).progress, before)
})

test('watering still works after the clock is corrected back past the last watering', () => {
  // Watered while the clock ran a month fast, then the clock was fixed.
  const fast = T0 + 30 * 24 * HOUR
  const planting = water(sow('tomato', T0), fast)
  const banked = readPlanting(planting, fast).progress
  const corrected = T0 + 2 * HOUR
  const rewatered = water(planting, corrected)
  assert.equal(rewatered.wateredAt, corrected)
  assert.ok(rewatered.plantedAt <= rewatered.wateredAt, 'stays a valid document')
  assert.equal(readPlanting(rewatered, corrected).progress, banked, 'nothing banked for future time')
  assert.ok(readPlanting(rewatered, corrected + 10 * HOUR).progress > banked, 'and it grows again')
})

test('changing speed keeps the garden hours already passed', () => {
  // Thirty real seconds at a day a minute is twelve garden hours.
  const planting = sow('tomato', T0)
  const at = T0 + 30_000
  const before = readPlanting(planting, at, 1440)
  const slowed = rescale(planting, at, 1440, 1)
  const after = readPlanting(slowed, at, 1)
  assert.ok(Math.abs(after.progress - before.progress) < 1e-6)
  assert.ok(Math.abs(after.moisture - before.moisture) < 1e-6)
  // And from there it runs at the new speed.
  assert.ok(Math.abs(readPlanting(slowed, at + HOUR, 1).progress - (13 / CROPS.tomato.growHours)) < 1e-6)
})

test('a bed rescales its day count with its plots', () => {
  const at = T0 + 60_000
  const bed = { ...emptyBed(), startedAt: T0, plots: [sow('tomato', T0), null, null], speed: 1440 }
  const slowed = rescaleBed(bed, at, 1)
  assert.equal(slowed.speed, 1)
  assert.equal(slowed.startedAt, at - 24 * HOUR)
  assert.equal(rescaleBed(slowed, at, 1), slowed)
})

test('documents saved before speed was stored load at real time', () => {
  const storage = memoryStorage()
  storage.data.set('bed', JSON.stringify({ version: 1, startedAt: null, plots: [null, null, null], picked: 0 }))
  assert.equal(createBedStore(storage).load().value?.speed, 1)
})

test('stages follow progress', () => {
  assert.deepEqual(
    [0, 0.1, 0.3, 0.6, 0.8, 1.2].map(stageFor),
    ['seed', 'sprout', 'leafy', 'flowering', 'fruiting', 'ripe'],
  )
})

test('picking a ripe tomato leaves it fruiting; a watermelon clears the plot', () => {
  const ripeAt = T0 + 200 * HOUR
  let tomato = sow('tomato', T0)
  let melon = sow('watermelon', T0)
  for (let hour = 20; hour <= 200; hour += 20) {
    tomato = water(tomato, T0 + hour * HOUR)
    melon = water(melon, T0 + hour * HOUR)
  }
  const picked = harvest(tomato, ripeAt)
  assert.ok(picked)
  const after = readPlanting(picked, ripeAt)
  assert.ok(Math.abs(after.progress - CROPS.tomato.regrowTo!) < 1e-9)
  assert.equal(after.stage, 'fruiting')
  assert.equal(after.moisture, readPlanting(tomato, ripeAt).moisture, 'picking leaves the soil alone')
  assert.equal(harvest(melon, ripeAt), null)
})

test('unripe plants and geraniums are not picked', () => {
  const young = sow('tomato', T0)
  assert.equal(harvest(young, T0 + HOUR), young)
  let geranium = sow('geranium', T0)
  for (let hour = 20; hour <= 200; hour += 20) geranium = water(geranium, T0 + hour * HOUR)
  assert.equal(harvest(geranium, T0 + 200 * HOUR), geranium)
})

const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

test('a bed round-trips through storage', () => {
  const storage = memoryStorage()
  const bed = { ...emptyBed(), startedAt: T0, plots: [sow('tomato', T0), null, sow('watermelon', T0)], picked: 3, speed: 60 }
  const persisted = createBedStore(storage)
  assert.equal(persisted.save(bed), 'saved')
  assert.deepEqual(persisted.load(), { value: bed, status: 'saved' })
})

test('untrustworthy documents are rejected whole', () => {
  const storage = memoryStorage()
  const persisted = createBedStore(storage)
  const bad = [
    { version: 1, startedAt: null, plots: [null, null], picked: 0 },
    { version: 1, startedAt: null, plots: [{ crop: 'basil', plantedAt: T0, wateredAt: T0, growth: 0 }, null, null], picked: 0 },
    { version: 1, startedAt: null, plots: [{ crop: 'tomato', plantedAt: T0, wateredAt: T0 - 1, growth: 0 }, null, null], picked: 0 },
    { version: 1, startedAt: null, plots: [{ crop: 'tomato', plantedAt: T0, wateredAt: T0, growth: -1 }, null, null], picked: 0 },
    { version: 1, startedAt: 'yesterday', plots: [null, null, null], picked: 0 },
  ]
  for (const document of bad) {
    storage.data.set('bed', JSON.stringify(document))
    assert.equal(persisted.load().status, 'invalid', JSON.stringify(document))
  }
})

test('a teneke only takes its own plants', () => {
  const storage = memoryStorage()
  const persisted = tenekeStore('tin', () => storage)
  storage.data.set('tin', JSON.stringify({ version: 1, planting: { crop: 'tomato', plantedAt: T0, wateredAt: T0, growth: 0 }, picked: 0 }))
  assert.equal(persisted.load().status, 'invalid')
  const basil = { planting: sow('basil', T0), picked: 1, speed: 1 }
  persisted.save(basil)
  assert.deepEqual(persisted.load().value, basil)
})

function createBedStore(storage: StorageLike) {
  return bedStore('bed', () => storage)
}
