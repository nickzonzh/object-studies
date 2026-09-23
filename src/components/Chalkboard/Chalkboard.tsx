import { ChalkRail } from './ChalkRail'
import { ActiveTools } from './ActiveTools'
import { useToolInteraction } from '../../hooks/useToolInteraction'
import { toolLabels } from '../../tools/types'
import '../../styles/chalkboard.css'
import '../../styles/timber.css'
import '../../styles/chalk.css'
import '../../styles/duster.css'
import '../../styles/interaction.css'

export function Chalkboard() {
  const {
    boardRef,
    surfaceRef,
    overlayRef,
    canvasRef,
    selected,
    hasMarks,
    select,
    putBack,
    clear,
  } = useToolInteraction()
  return (
    <figure className="object-study">
      <div
        className="chalkboard"
        ref={boardRef}
        role="group"
        aria-label="Kimolia chalkboard"
      >
        <div className="board-construction">
          <div className="frame-plank frame-plank--top" aria-hidden="true" />
          <div className="frame-plank frame-plank--right" aria-hidden="true" />
          <div className="frame-plank frame-plank--bottom" aria-hidden="true" />
          <div className="frame-plank frame-plank--left" aria-hidden="true" />
          <div className="slate-recess">
            <div
              className="slate-surface"
              ref={surfaceRef}
              tabIndex={0}
              role="group"
              aria-label="Chalkboard drawing surface"
              aria-describedby="tool-instructions tool-study-note"
            >
              <div className="slate-residue" aria-hidden="true" />
              <canvas
                className="chalk-canvas"
                ref={canvasRef}
                aria-hidden="true"
              />
            </div>
          </div>
          <ChalkRail selected={selected} onSelect={select} />
        </div>
      </div>
      <ActiveTools ref={overlayRef} />
      <figcaption>
        <span className="material-note" role="status">
          <span className="material-swatch" aria-hidden="true" />
          {selected
            ? `${toolLabels[selected]} in hand.`
            : 'Pick up chalk. Make your mark.'}
        </span>
        <div className="board-utilities">
          <button
            className="put-back"
            type="button"
            disabled={!hasMarks}
            onClick={clear}
          >
            Clear
          </button>
          <button
            className="put-back"
            type="button"
            disabled={!selected}
            onClick={(event) => putBack(event.detail === 0)}
          >
            Put back<span aria-hidden="true"> ↙</span>
          </button>
        </div>
      </figcaption>
      <p className="tool-study-note" id="tool-study-note">
        {selected === 'duster'
          ? 'Sweep to lift the chalk. Wipe again for a cleaner slate.'
          : 'A little pressure, a little dust. Marks last until you refresh.'}
      </p>
      <p className="sr-only" id="tool-instructions">
        Choose chalk, then drag on the slate to draw. Choose it again, use Put
        back, or press Escape to return it. Keyboard selection moves focus to
        the slate: use arrow keys to move, Shift for larger steps, and hold
        Space or Enter while moving to draw or erase. The duster leaves faint
        residue; repeated passes remove more. Clear removes all marks.
      </p>
    </figure>
  )
}
