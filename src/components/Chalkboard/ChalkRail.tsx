import { ChalkPiece } from './ChalkPiece'
import { Duster } from './Duster'
import { useRef, type HTMLAttributes } from 'react'
import { toolLabels, type Activation, type ToolId } from '../../tools/types'

const chalkColors = ['white', 'yellow', 'blue', 'pink'] as const

type ChalkRailProps = {
  selected: ToolId | null
  onSelect: (id: ToolId, activation: Activation) => void
}

export function ChalkRail({ selected, onSelect }: ChalkRailProps) {
  const input = useRef<Activation>('pointer')
  const touchStart = useRef<{
    pointer: number
    x: number
    y: number
    tool: ToolId
  } | null>(null)
  const toolEvents: HTMLAttributes<HTMLButtonElement> = {
    onPointerDown(event) {
      if (!event.isPrimary) return
      input.current = event.pointerType === 'touch' ? 'touch' : 'pointer'
      touchStart.current =
        event.pointerType === 'touch'
          ? {
              pointer: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              tool: event.currentTarget.dataset.slot as ToolId,
            }
          : null
    },
    onPointerUp(event) {
      const start = touchStart.current
      if (!start || event.pointerId !== start.pointer) return
      touchStart.current = null
      const rect = event.currentTarget.getBoundingClientRect()
      if (
        Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12 &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        // Touch selection must not depend on a later compatibility click,
        // which browsers can suppress immediately after a captured drawing drag.
        onSelect(start.tool, 'touch')
      }
    },
    onPointerCancel(event) {
      if (event.pointerId === touchStart.current?.pointer)
        touchStart.current = null
    },
    onClick(event) {
      if (input.current === 'touch' && event.detail > 0) return
      onSelect(
        event.currentTarget.dataset.slot as ToolId,
        event.detail === 0 ? 'keyboard' : 'pointer',
      )
    },
  }
  return (
    <div className="chalk-rail" role="group" aria-label="Chalk and duster">
      <div className="rail-bed" aria-hidden="true" />
      <div className="rail-groove" aria-hidden="true" />
      <div className="rail-dust" aria-hidden="true" />
      <div className="chalk-set">
        {chalkColors.map((color) => (
          <button
            className="tool-slot chalk-slot"
            data-slot={color}
            type="button"
            key={color}
            aria-label={toolLabels[color]}
            aria-pressed={selected === color}
            aria-describedby="tool-instructions"
            {...toolEvents}
          >
            <span aria-hidden="true">
              <ChalkPiece color={color} />
            </span>
          </button>
        ))}
      </div>
      <button
        className="tool-slot duster-slot"
        data-slot="duster"
        type="button"
        aria-label={toolLabels.duster}
        aria-pressed={selected === 'duster'}
        aria-describedby="tool-instructions"
        {...toolEvents}
      >
        <span aria-hidden="true">
          <Duster />
        </span>
      </button>
      <div className="rail-lip" aria-hidden="true">
        <span className="rail-brand">KIMOLIA</span>
      </div>
    </div>
  )
}
