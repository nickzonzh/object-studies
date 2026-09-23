import { ChalkRail } from './ChalkRail'
import { ActiveTools } from './ActiveTools'
import { UtilityButton } from './UtilityButton'
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
    canUndo,
    canRedo,
    saveStatus,
    exportStatus,
    select,
    putBack,
    clear,
    undo,
    redo,
    savePng,
  } = useToolInteraction()
  const saveMessages = {
    idle: 'Saved on this device as you draw.',
    saving: 'Saving…',
    saved: 'Saved on this device.',
    unavailable: 'Device saving is unavailable. Use Save PNG to keep a copy.',
    invalid:
      'The saved drawing could not be opened. New marks will replace it.',
    full: 'This drawing is too large to autosave. Use Save PNG to keep a copy.',
  }
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
        <UtilityButton
          className="put-back"
          type="button"
          disabled={!selected}
          onActivate={putBack}
        >
          Put back<span aria-hidden="true"> ↙</span>
        </UtilityButton>
        <div className="utility-row">
          <div
            className="board-utilities"
            role="group"
            aria-label="Drawing controls"
          >
            <UtilityButton
              className="put-back"
              type="button"
              disabled={!canUndo}
              onActivate={undo}
              aria-keyshortcuts="Control+Z Meta+Z"
            >
              Undo
            </UtilityButton>
            <UtilityButton
              className="put-back"
              type="button"
              disabled={!canRedo}
              onActivate={redo}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            >
              Redo
            </UtilityButton>
            <UtilityButton
              className="put-back"
              type="button"
              disabled={!hasMarks}
              onActivate={clear}
            >
              Clear
            </UtilityButton>
            <UtilityButton
              className="put-back"
              type="button"
              disabled={exportStatus === 'exporting'}
              onActivate={savePng}
            >
              {exportStatus === 'exporting' ? 'Preparing…' : 'Save PNG'}
            </UtilityButton>
          </div>
          <span className="save-note" role="status">
            {exportStatus === 'error'
              ? 'The PNG could not be created. Please try again.'
              : saveMessages[saveStatus]}
          </span>
        </div>
      </figcaption>
      <p className="tool-study-note" id="tool-study-note">
        {selected === 'duster'
          ? 'Sweep to lift the chalk. Wipe again for a cleaner slate.'
          : 'A little pressure, a little dust. Something worth keeping.'}
      </p>
      <p className="sr-only" id="tool-instructions">
        Choose chalk, then drag on the slate to draw. Choose it again, use Put
        back, or press Escape to return it. Keyboard selection moves focus to
        the slate: use arrow keys to move, Shift for larger steps, and hold
        Space or Enter while moving to draw or erase. The duster leaves faint
        residue; repeated passes remove more. Undo and Redo also work with
        Control or Command Z, and Shift Z to redo, while the board or its
        controls have focus. Clear can be undone. The drawing saves on this
        device; undo history lasts until you refresh. Save PNG downloads the
        slate only.
      </p>
    </figure>
  )
}
