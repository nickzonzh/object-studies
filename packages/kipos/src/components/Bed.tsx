import { type CSSProperties, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { type CropId, gardenHours, harvest, readPlanting, sow, water } from '../lib/garden.js'
import { type BedDocument, bedStore, emptyBed, rescaleBed } from '../lib/documents.js'
import { actionTime, useGardenClock, useStoredDocument } from '../lib/hooks.js'
import { type Light, resolveLight } from '../lib/light.js'
import { type KiposLabelOverrides, type KiposLabels, cropSlots, fill, mergeLabels, stageName } from '../labels.js'
import { seededRandom } from 'object-studies-core'
import { Plant } from './Plant.js'
import '../art.css'
import '../styles.css'

export type BedProps = {
  /** Where the garden is kept between visits. Pass `false` to keep it for this page view only. */
  persistence?: false | { key: string }
  /** Garden hours per real hour. 1 is real time; 60 makes a garden day pass in 24 minutes. */
  speed?: number
  /** The light falling on the bed. `'auto'` follows the visitor's clock. */
  light?: Light | 'auto'
  /** The line under the bed that says what to do next. */
  showHint?: boolean
  labels?: KiposLabelOverrides
  className?: string
  style?: CSSProperties
}

const BED_CROPS: CropId[] = ['tomato', 'cucumber', 'watermelon']
type Hand = CropId | 'can' | null

const POUR_MS = 1400

function plotLabel(labels: KiposLabels, index: number, bed: BedDocument, now: number, speed: number) {
  const name = fill(labels.plot, { n: index + 1 })
  const planting = bed.plots[index]
  if (!planting) return `${name}: ${labels.emptyPlot}`
  const state = readPlanting(planting, now, speed)
  const soil = state.wilted ? labels.wilted : state.thirsty ? labels.thirsty : labels.wet
  return `${name}: ${labels.crops[planting.crop]}, ${stageName(labels, planting.crop, state.stage)}, ${soil}`
}

/**
 * A raised stone bed with three plots, a tray of seed packets and a watering
 * can. Plants grow over real days while their soil is wet, wilt when it dries,
 * and recover when watered.
 */
export function Bed({
  persistence = { key: 'kipos:bed' },
  speed = 1,
  light = 'auto',
  showHint = true,
  labels: labelOverrides,
  className = '',
  style,
}: BedProps) {
  const labels = mergeLabels(labelOverrides)
  const instructionsId = useId()
  const key = persistence === false ? null : persistence.key
  const store = useMemo(() => (key === null ? null : bedStore(key)), [key])
  const [bed, update] = useStoredDocument(store, emptyBed)
  const now = useGardenClock(speed)
  // Times are kept at the speed they ran at; a new speed keeps the garden hours already passed.
  useEffect(() => update((current) => rescaleBed(current, actionTime(), speed)), [bed.speed, speed, update])
  const [hand, setHand] = useState<Hand>(null)
  const [message, setMessage] = useState('')
  const [pouring, setPouring] = useState<{ plot: number; id: number } | null>(null)
  const pourTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(pourTimer.current), [])

  const take = (next: Hand) => {
    setHand((current) => (current === next ? null : next))
    setMessage('')
  }

  const pour = (plot: number) => {
    clearTimeout(pourTimer.current)
    setPouring({ plot, id: actionTime() })
    pourTimer.current = setTimeout(() => setPouring(null), POUR_MS)
  }

  const tendPlot = (index: number) => {
    const t = actionTime()
    const planting = bed.plots[index]
    const setPlot = (next: (typeof bed.plots)[number], picked = 0) =>
      update((current) => ({
        ...current,
        startedAt: current.startedAt ?? t,
        plots: current.plots.map((p, i) => (i === index ? next : p)),
        picked: current.picked + picked,
      }))

    if (hand === 'can') {
      if (!planting) return setMessage(labels.nothingToWater)
      const wasWilted = readPlanting(planting, t, speed).wilted
      setPlot(water(planting, t, speed))
      pour(index)
      return setMessage(wasWilted ? fill(labels.revived, cropSlots(labels, planting.crop)) : labels.watered)
    }
    if (hand) {
      if (planting) return setMessage(labels.plotTaken)
      setPlot(sow(hand, t))
      pour(index)
      setHand(null)
      return setMessage(fill(labels.sown, cropSlots(labels, hand)))
    }
    if (!planting) return setMessage(labels.idleHint)
    const slots = cropSlots(labels, planting.crop)
    if (!readPlanting(planting, t, speed).ripe) return setMessage(fill(labels.notRipe, slots))
    const kept = harvest(planting, t, speed)
    setPlot(kept, 1)
    setMessage(fill(kept ? labels.picked : labels.pickedLast, slots))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && hand) {
      event.stopPropagation()
      setHand(null)
      setMessage('')
    }
  }

  const lit = resolveLight(light, now)
  const days = bed.startedAt && now ? Math.floor(gardenHours(bed.startedAt, now, speed) / 24) + 1 : null
  const hint =
    message ||
    (hand === 'can' ? labels.canHint : hand ? fill(labels.seedHint, cropSlots(labels, hand)) : labels.idleHint)

  return (
    <div
      className={`kipos kipos-bed${hand ? ' kipos-bed--holding' : ''} ${className}`.trim()}
      style={style}
      role="group"
      aria-label={labels.bed}
      aria-describedby={instructionsId}
      data-light={lit}
      onKeyDown={onKeyDown}
    >
      <p id={instructionsId} className="kipos-sr-only">
        {labels.bedInstructions}
      </p>
      <div className="kipos-bed__scene">
        <div className="kipos-bed__ground" aria-hidden="true" />
        <div className="kipos-bed__back" aria-hidden="true" />
        <div className="kipos-bed__soil" aria-hidden="true" />
        <div className="kipos-bed__face" aria-hidden="true">
          {STONES.map((stone, index) => (
            <i key={index} className="kipos-stone" style={stone} />
          ))}
        </div>
        <div className="kipos-bed__coping" aria-hidden="true">
          {COPING.map((stone, index) => (
            <i key={index} className="kipos-capstone" style={stone} />
          ))}
        </div>
        <i className="kipos-trowel kipos-sprite--trowel" aria-hidden="true" />

        {bed.plots.map((planting, index) => {
          const state = planting ? readPlanting(planting, now, speed) : null
          const wet = state ? state.moisture : 0.15
          return (
            <button
              key={index}
              type="button"
              className={`kipos-plot${state?.ripe && !hand ? ' kipos-plot--ripe' : ''}`}
              style={{ '--plot': index, '--wet': Math.round(wet * 20) / 20 } as CSSProperties}
              aria-label={plotLabel(labels, index, bed, now, speed)}
              onClick={() => tendPlot(index)}
            >
              <span className="kipos-plot__soil" />
              {!planting && (
                // Last season's canes, left standing in the empty plot until something is sown.
                <span className={`kipos-idle kipos-idle--${index % 3}`} aria-hidden="true">
                  <i className="kipos-idle__cane kipos-sprite--cane" />
                  <i className="kipos-idle__cane kipos-sprite--cane" />
                  <i className="kipos-idle__cane kipos-sprite--cane" />
                  <i className="kipos-idle__tie kipos-sprite--tie-cream" />
                </span>
              )}
              {planting && state && (
                <Plant
                  crop={planting.crop}
                  progress={state.progress}
                  wilted={state.wilted}
                  seed={(planting.plantedAt % 100_000) + index}
                />
              )}
              {pouring?.plot === index && (
                <span key={pouring.id} className="kipos-pour" aria-hidden="true">
                  <i /><i /><i /><i /><i />
                </span>
              )}
            </button>
          )
        })}

        {days !== null && (
          <span className="kipos-tag" aria-hidden="true">
            <span>{fill(labels.dayTag, { n: days })}</span>
            {bed.picked > 0 && <span className="kipos-tag__count">{fill(labels.pickedTag, { n: bed.picked })}</span>}
          </span>
        )}

        <div className="kipos-tray" role="group" aria-label={labels.tray}>
          <span className="kipos-tray__wood" aria-hidden="true">
            <span className="kipos-tray__brand" lang="el">
              ΚΗΠΟΣ · KIPOS
            </span>
          </span>
          {BED_CROPS.map((crop, index) => [
            <span
              key={`${crop}-shadow`}
              className="kipos-packet-shadow"
              style={{ '--slot': index, '--tilt': TILTS[index] } as CSSProperties}
              aria-hidden="true"
            />,
            <button
              key={crop}
              type="button"
              className={`kipos-packet kipos-packet--${crop}`}
              style={{ '--slot': index, '--tilt': TILTS[index] } as CSSProperties}
              aria-pressed={hand === crop}
              aria-label={fill(labels.seedPacket, cropSlots(labels, crop))}
              onClick={() => take(crop)}
            >
              <span className="kipos-packet__band" lang="el" aria-hidden="true">
                {GREEK[crop]}
              </span>
              <span className="kipos-packet__name" aria-hidden="true">
                {labels.crops[crop]}
              </span>
              <span className="kipos-packet__sub" aria-hidden="true">
                {LATIN[crop]} · σπόροι
              </span>
              <i className="kipos-packet__art" aria-hidden="true" />
              <i className="kipos-packet__count" aria-hidden="true">
                {PACKET_NO[crop]}
              </i>
            </button>,
          ])}
          <button
            type="button"
            className="kipos-can"
            aria-pressed={hand === 'can'}
            aria-label={labels.wateringCan}
            onClick={() => take('can')}
          >
            <i className="kipos-can__shadow" />
            <i className="kipos-can__metal" />
          </button>
        </div>
      </div>
      {showHint ? (
        <p className="kipos-hint" aria-live="polite">
          {hint}
        </p>
      ) : (
        <p className="kipos-sr-only" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  )
}

// How each packet lies on the board.
const TILTS = ['-4deg', '2.5deg', '-1.5deg']

const PACKET_NO: Record<CropId, string> = {
  tomato: 'Νο 12',
  cucumber: 'Νο 7',
  watermelon: 'Νο 31',
  basil: 'Νο 3',
  geranium: 'Νο 18',
}

// The bed's stonework, laid once from a fixed seed so every bed is built the same.
const STONES: CSSProperties[] = (() => {
  const random = seededRandom(1907)
  const stones: CSSProperties[] = []
  const courses = [
    { top: 0, height: 50 },
    { top: 54, height: 46 },
  ]
  for (const [row, course] of courses.entries()) {
    let x = row ? -40 : 0
    while (x < 908) {
      const width = 88 + random() * 96
      const left = Math.max(0, x)
      const right = Math.min(908, x + width)
      if (right - left > 24) {
        const r = () => `${Math.round(6 + random() * 12)}%`
        stones.push({
          left: `calc(var(--kipos-u) * ${left.toFixed(1)})`,
          top: `calc(var(--kipos-u) * ${(course.top + random() * 3).toFixed(1)})`,
          width: `calc(var(--kipos-u) * ${(right - left).toFixed(1)})`,
          height: `calc(var(--kipos-u) * ${(course.height - random() * 4).toFixed(1)})`,
          borderRadius: `${r()} ${r()} ${r()} ${r()} / ${r()} ${r()} ${r()} ${r()}`,
          backgroundPosition: `${Math.round(random() * 256)}px ${Math.round(random() * 256)}px`,
          '--tone': (0.9 + random() * 0.14).toFixed(3),
        } as CSSProperties)
      }
      x += width + 6
    }
  }
  return stones
})()

const COPING: CSSProperties[] = (() => {
  const random = seededRandom(311)
  const stones: CSSProperties[] = []
  let x = 0
  while (x < 940) {
    const width = Math.min(940 - x, 140 + random() * 70)
    stones.push({
      left: `calc(var(--kipos-u) * ${x.toFixed(1)})`,
      width: `calc(var(--kipos-u) * ${(width - 4).toFixed(1)})`,
      backgroundPosition: `0 0, ${Math.round(random() * 256)}px ${Math.round(random() * 256)}px`,
      '--tone': (0.94 + random() * 0.1).toFixed(3),
    } as CSSProperties)
    x += width
  }
  return stones
})()

const GREEK: Record<CropId, string> = {
  tomato: 'ΝΤΟΜΑΤΑ',
  cucumber: 'ΑΓΓΟΥΡΙ',
  watermelon: 'ΚΑΡΠΟΥΖΙ',
  basil: 'ΒΑΣΙΛΙΚΟΣ',
  geranium: 'ΓΕΡΑΝΙ',
}

const LATIN: Record<CropId, string> = {
  tomato: 'Domata',
  cucumber: 'Angouri',
  watermelon: 'Karpouzi',
  basil: 'Vasilikos',
  geranium: 'Gerani',
}
