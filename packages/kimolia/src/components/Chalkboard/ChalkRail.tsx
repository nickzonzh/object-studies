import { useState, type MouseEvent, type PointerEvent } from 'react'
import {
  createTapActivation,
  type ActivationSource,
  type TapResult,
} from 'object-studies-core'
import type { ChalkboardLabels } from '../../labels.js'
import type { ToolId } from '../../tools/types.js'
import { ChalkPiece } from './ChalkPiece.js'
import { Duster } from './Duster.js'

const chalkColors = ['white', 'yellow', 'blue', 'pink'] as const

type ChalkRailProps = {
  selected: ToolId | null
  labels: ChalkboardLabels
  instructionsId: string
  onSelect: (id: ToolId, activation: ActivationSource) => void
}

export function ChalkRail({
  selected,
  labels,
  instructionsId,
  onSelect,
}: ChalkRailProps) {
  // One tracker for the whole rail: the pressed slot is read from the element
  // the gesture started on, not from the element it ended over.
  const [tap] = useState(createTapActivation)
  const select = (hit: TapResult | null) => {
    if (hit) onSelect(hit.target.dataset.slot as ToolId, hit.source)
  }
  const handlers = {
    onPointerDown: tap.pointerDown,
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) =>
      select(tap.pointerUp(event)),
    onPointerCancel: tap.pointerCancel,
    onClick: (event: MouseEvent<HTMLButtonElement>) =>
      select(tap.click(event)),
  }
  return (
    <div
      className="kimolia-rail"
      role="group"
      aria-label={labels.toolGroup}
    >
      <div className="kimolia-rail-bed" aria-hidden="true" />
      <div className="kimolia-rail-groove" aria-hidden="true" />
      <div className="kimolia-rail-dust" aria-hidden="true" />
      <div className="kimolia-chalk-set">
        {chalkColors.map((color) => (
          <button
            className="kimolia-slot kimolia-slot--chalk"
            data-slot={color}
            type="button"
            key={color}
            aria-label={labels.chalk[color]}
            aria-pressed={selected === color}
            aria-describedby={instructionsId}
            {...handlers}
          >
            <span aria-hidden="true">
              <ChalkPiece color={color} />
            </span>
          </button>
        ))}
      </div>
      <button
        className="kimolia-slot kimolia-slot--duster"
        data-slot="duster"
        type="button"
        aria-label={labels.duster}
        aria-pressed={selected === 'duster'}
        aria-describedby={instructionsId}
        {...handlers}
      >
        <span aria-hidden="true">
          <Duster />
        </span>
      </button>
      <div className="kimolia-rail-lip" aria-hidden="true">
        <span className="kimolia-rail-brand">KIMOLIA</span>
      </div>
    </div>
  )
}
