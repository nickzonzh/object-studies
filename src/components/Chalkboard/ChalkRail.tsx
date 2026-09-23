import { ChalkPiece } from './ChalkPiece'
import { Duster } from './Duster'
import { useRef } from 'react'
import { toolLabels, type Activation, type ToolId } from '../../tools/types'

const chalkColors = ['white', 'yellow', 'blue', 'pink'] as const

type ChalkRailProps = {
  selected: ToolId | null
  onSelect: (id: ToolId, activation: Activation) => void
}

export function ChalkRail({ selected, onSelect }: ChalkRailProps) {
  const input = useRef<Activation>('pointer')
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
            onPointerDown={(event) => {
              input.current =
                event.pointerType === 'touch' ? 'touch' : 'pointer'
            }}
            onClick={(event) =>
              onSelect(color, event.detail === 0 ? 'keyboard' : input.current)
            }
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
        onPointerDown={(event) => {
          input.current = event.pointerType === 'touch' ? 'touch' : 'pointer'
        }}
        onClick={(event) =>
          onSelect('duster', event.detail === 0 ? 'keyboard' : input.current)
        }
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
