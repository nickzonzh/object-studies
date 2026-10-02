import { type CSSProperties, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { type CropId, gardenHours, harvest, readPlanting, sow, water } from '../lib/garden.js'
import { type BedDocument, bedStore, emptyBed, rescaleBed } from '../lib/documents.js'
import { actionTime, useGardenClock, useStoredDocument } from '../lib/hooks.js'
import { type Light, resolveLight } from '../lib/light.js'
import { type KiposLabelOverrides, type KiposLabels, cropSlots, fill, mergeLabels, stageName } from '../labels.js'
import { Plant } from './Plant.js'
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
        <div className="kipos-bed__shadow" />
        <div className="kipos-bed__soil" />
        <div className="kipos-bed__face" aria-hidden="true">
          {[5, 4, 5].map((count, row) => (
            <span key={row} className="kipos-bed__course">
              {Array.from({ length: count }, (_, i) => (
                <i key={i} className="kipos-stone" style={{ flexGrow: 2 + ((row * 7 + i * 3) % 4) }} />
              ))}
            </span>
          ))}
        </div>

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
          <span className="kipos-tray__wood" aria-hidden="true" />
          {BED_CROPS.map((crop, index) => (
            <button
              key={crop}
              type="button"
              className={`kipos-packet kipos-packet--${crop}`}
              style={{ '--slot': index } as CSSProperties}
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
            </button>
          ))}
          <button
            type="button"
            className="kipos-can"
            aria-pressed={hand === 'can'}
            aria-label={labels.wateringCan}
            onClick={() => take('can')}
          >
            <i className="kipos-can__handle" />
            <i className="kipos-can__spout" />
            <i className="kipos-can__rose" />
            <i className="kipos-can__body" />
            <i className="kipos-can__lip" />
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
