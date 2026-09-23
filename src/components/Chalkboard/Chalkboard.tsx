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
  const { boardRef, surfaceRef, overlayRef, selected, select, putBack } =
    useToolInteraction()
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
              aria-label="Slate practice surface"
              aria-describedby="tool-instructions tool-study-note"
            >
              <div className="slate-residue" aria-hidden="true" />
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
            : 'Pick up a tool. Try its weight.'}
        </span>
        <button
          className="put-back"
          type="button"
          disabled={!selected}
          onClick={(event) => putBack(event.detail === 0)}
        >
          Put back<span aria-hidden="true"> ↙</span>
        </button>
      </figcaption>
      <p className="tool-study-note" id="tool-study-note">
        A study in movement. Marks come next.
      </p>
      <p className="sr-only" id="tool-instructions">
        Choose a tool, then move or press on the slate. Choose it again, use Put
        back, or press Escape to return it. Keyboard selection moves focus to
        the slate: use arrow keys to move, Shift for larger steps, and hold
        Space to touch the surface. No drawing yet.
      </p>
    </figure>
  )
}
