import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react'
import { harvest, readPlanting, sow, water } from '../lib/garden.js'
import { emptyTeneke, rescaleTeneke, tenekeStore } from '../lib/documents.js'
import { actionTime, useGardenClock, useStoredDocument } from '../lib/hooks.js'
import { type Light, resolveLight } from '../lib/light.js'
import { type KiposLabelOverrides, cropSlots, fill, mergeLabels, stageName } from '../labels.js'
import { Plant } from './Plant.js'
import '../styles.css'

export type TenekePlant = 'basil' | 'geranium'

export type TenekeProps = {
  /** What grows in the tin. */
  plant?: TenekePlant
  /** Where the tin is kept between visits; each tin on a page needs its own key. `false` keeps it for this page view only. */
  persistence?: false | { key: string }
  /** Garden hours per real hour. */
  speed?: number
  /** The light falling on the tin. `'auto'` follows the visitor's clock. */
  light?: Light | 'auto'
  /** A small line under the tin saying how it is doing. */
  showStatus?: boolean
  labels?: KiposLabelOverrides
  className?: string
  style?: CSSProperties
}

const POUR_MS = 1400

/**
 * A whitewashed olive oil tin with basil or a geranium in it. Press it to
 * water. Small enough for a sidebar.
 */
export function Teneke({
  plant = 'basil',
  persistence,
  speed = 1,
  light = 'auto',
  showStatus = false,
  labels: labelOverrides,
  className = '',
  style,
}: TenekeProps) {
  const labels = mergeLabels(labelOverrides)
  const instructionsId = useId()
  const key = persistence === false ? null : (persistence?.key ?? `kipos:teneke:${plant}`)
  const store = useMemo(() => (key === null ? null : tenekeStore(key)), [key])
  const [tin, update] = useStoredDocument(store, emptyTeneke)
  const now = useGardenClock(speed)
  // Times are kept at the speed they ran at; a new speed keeps the garden hours already passed.
  useEffect(() => update((current) => rescaleTeneke(current, actionTime(), speed)), [tin.speed, speed, update])
  const [message, setMessage] = useState('')
  const [pourId, setPourId] = useState<number | null>(null)
  const pourTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(pourTimer.current), [])

  // A tin that held something else grows what it is asked to now.
  const planting = tin.planting?.crop === plant ? tin.planting : null
  const state = planting ? readPlanting(planting, now, speed) : null
  const slots = cropSlots(labels, plant)

  const pour = () => {
    clearTimeout(pourTimer.current)
    setPourId(actionTime())
    pourTimer.current = setTimeout(() => setPourId(null), POUR_MS)
  }

  const press = () => {
    const t = actionTime()
    pour()
    if (!planting) {
      update((current) => ({ ...current, planting: sow(plant, t) }))
      return setMessage(fill(labels.sown, slots))
    }
    const wasWilted = readPlanting(planting, t, speed).wilted
    update((current) => ({ ...current, planting: water(planting, t, speed) }))
    setMessage(wasWilted ? fill(labels.revived, slots) : labels.watered)
  }

  const pinch = () => {
    if (!planting) return
    const kept = harvest(planting, actionTime(), speed)
    if (kept === planting) return
    update((current) => ({ ...current, planting: kept, picked: current.picked + 1 }))
    setMessage(labels.pinched)
  }

  const status = state
    ? `${stageName(labels, plant, state.stage)}, ${state.wilted ? labels.wilted : state.thirsty ? labels.thirsty : labels.wet}`
    : labels.emptyPlot
  const lit = resolveLight(light, now)
  const canPinch = Boolean(state?.ripe && plant === 'basil')

  return (
    <div
      className={`kipos kipos-teneke kipos-teneke--${plant} ${className}`.trim()}
      style={style}
      data-light={lit}
    >
      <p id={instructionsId} className="kipos-sr-only">
        {labels.tenekeInstructions}
      </p>
      <div className="kipos-teneke__scene">
        <span className="kipos-teneke__shadow" aria-hidden="true" />
        <button
          type="button"
          className="kipos-teneke__tin"
          style={{ '--wet': state ? Math.round(state.moisture * 20) / 20 : 0.15 } as CSSProperties}
          aria-label={planting ? `${fill(labels.teneke, slots)}: ${status}` : fill(labels.sowTeneke, slots)}
          aria-describedby={instructionsId}
          onClick={press}
        >
          <span className="kipos-teneke__soil" />
          {planting && state && (
            <Plant crop={plant} progress={state.progress} wilted={state.wilted} seed={planting.plantedAt % 100_000} />
          )}
          <span className="kipos-teneke__body" aria-hidden="true" />
          <span className="kipos-teneke__rim" aria-hidden="true" />
          {pourId !== null && (
            <span key={pourId} className="kipos-pour" aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
          )}
        </button>
        {canPinch && (
          <button type="button" className="kipos-teneke__pinch" onClick={pinch}>
            {labels.pinch}
          </button>
        )}
      </div>
      <p className={showStatus ? 'kipos-teneke__status' : 'kipos-sr-only'} aria-live="polite">
        {showStatus ? message || status : message}
      </p>
    </div>
  )
}
