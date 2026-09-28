import {
  useEffect,
  useId,
  useImperativeHandle,
  useState,
  type CSSProperties,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { ChalkRail } from './ChalkRail.js'
import { ActiveTools } from './ActiveTools.js'
import { UtilityButton } from './UtilityButton.js'
import { useChalkboard } from '../../hooks/useChalkboard.js'
import { applyMaterials } from '../../materials.js'
import { copyTheme } from '../../theme.js'
import { mergeLabels, type ChalkboardLabelOverrides } from '../../labels.js'
import type { DrawingStroke } from '../../drawing/types.js'
import '../../styles/chalkboard.css'
import '../../styles/timber.css'
import '../../styles/chalk.css'
import '../../styles/duster.css'
import '../../styles/interaction.css'

export type ChalkboardHandle = {
  undo: () => void
  redo: () => void
  clear: () => void
  /** The slate and its marks as an image; the frame is not included. */
  toBlob: (type?: string) => Promise<Blob>
  getStrokes: () => readonly DrawingStroke[]
}

export type ChalkboardProps = {
  /** Controlled drawing. Pair with `onStrokesChange`. */
  strokes?: readonly DrawingStroke[]
  /** Starting drawing for an uncontrolled board with nothing saved yet. */
  defaultStrokes?: readonly DrawingStroke[]
  onStrokesChange?: (strokes: readonly DrawingStroke[]) => void
  /** Off by default: opt in with a key to keep the drawing on the device. */
  persistence?: false | { key: string }
  exportFileName?: string
  /** The built-in undo / redo / clear / save bar. */
  showControls?: boolean
  labels?: ChalkboardLabelOverrides
  /** 0–1. How much old chalk haze the slate has kept. Overrides `--kimolia-wear`. */
  wear?: number
  /** Where the flying tools are portalled; a body-level element by default. */
  portalContainer?: HTMLElement | null
  className?: string
  style?: CSSProperties
  ref?: Ref<ChalkboardHandle>
}

export function Chalkboard({
  strokes,
  defaultStrokes,
  onStrokesChange,
  persistence = false,
  exportFileName = 'kimolia-board.png',
  showControls = true,
  labels: labelOverrides,
  wear,
  portalContainer,
  className,
  style,
  ref,
}: ChalkboardProps) {
  const labels = mergeLabels(labelOverrides)
  const instructionsId = useId()
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const {
    boardRef,
    surfaceRef,
    overlayRef,
    canvasRef,
    curtainRef,
    selected,
    hasMarks,
    canUndo,
    canRedo,
    saveStatus,
    exportStatus,
    rendering,
    select,
    putBack,
    clear,
    undo,
    redo,
    savePng,
    toBlob,
    getStrokes,
  } = useChalkboard({
    overlay: portal,
    strokes,
    defaultStrokes,
    onStrokesChange,
    persistence,
    exportFileName,
  })

  // The tool layer and its textures belong to the document, not to the render:
  // both are created here so the component renders identically on a server.
  // The layer is always this board's own element, even inside a consumer's
  // container: it carries the portal styles, and textures and theme are never
  // written onto (or left behind on) somebody else's node.
  useEffect(() => {
    const root = boardRef.current!
    applyMaterials(root)
    const node = document.createElement('div')
    node.className = 'kimolia-tool-portal'
    ;(portalContainer ?? document.body).append(node)
    applyMaterials(node)
    copyTheme(root, node)
    setPortal(node)
    return () => {
      node.remove()
      setPortal(null)
    }
  }, [portalContainer, boardRef])

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    clear,
    toBlob,
    getStrokes,
  }))

  const failure =
    exportStatus === 'error'
      ? labels.exportFailed
      : saveStatus === 'unavailable'
        ? labels.storageUnavailable
        : saveStatus === 'invalid'
          ? labels.storageInvalid
          : saveStatus === 'full'
            ? labels.storageFull
            : ''
  const note = rendering
    ? labels.updating
    : failure ||
      (saveStatus === 'saved' || saveStatus === 'saving'
        ? labels.savedOnDevice
        : '')

  return (
    <div
      className={className ? `kimolia ${className}` : 'kimolia'}
      style={
        wear === undefined
          ? style
          : ({ ...style, '--kimolia-wear': wear } as CSSProperties)
      }
    >
      <div
        className="kimolia-board"
        ref={boardRef}
        role="group"
        aria-label={labels.board}
      >
        <div className="kimolia-construction">
          <div className="kimolia-plank kimolia-plank--top" aria-hidden="true" />
          <div
            className="kimolia-plank kimolia-plank--right"
            aria-hidden="true"
          />
          <div
            className="kimolia-plank kimolia-plank--bottom"
            aria-hidden="true"
          />
          <div
            className="kimolia-plank kimolia-plank--left"
            aria-hidden="true"
          />
          <div className="kimolia-recess">
            <div
              className="kimolia-slate"
              ref={surfaceRef}
              tabIndex={0}
              role="application"
              aria-label={labels.surface}
              aria-busy={rendering}
              aria-describedby={instructionsId}
            >
              <div className="kimolia-residue" aria-hidden="true" />
              <canvas
                className="kimolia-canvas"
                ref={canvasRef}
                aria-hidden="true"
              />
              <canvas
                className="kimolia-canvas"
                ref={curtainRef}
                aria-hidden="true"
                hidden
              />
            </div>
          </div>
          <ChalkRail
            selected={selected}
            labels={labels}
            instructionsId={instructionsId}
            onSelect={select}
          />
        </div>
      </div>
      {portal && createPortal(<ActiveTools ref={overlayRef} />, portal)}
      <div className="kimolia-caption">
        <span className="kimolia-held">
          <span className="kimolia-held-dot" aria-hidden="true" />
          {selected
            ? labels.inHand.replace(
                '{tool}',
                selected === 'duster'
                  ? labels.duster
                  : labels.chalk[selected],
              )
            : labels.empty}
        </span>
        <UtilityButton
          className="kimolia-action kimolia-action--put-back"
          disabled={!selected}
          onActivate={putBack}
        >
          {labels.putBack}
          <span aria-hidden="true"> ↙</span>
        </UtilityButton>
      </div>
      {showControls && (
        <div className="kimolia-controls">
          <div
            className="kimolia-control-group"
            role="group"
            aria-label={labels.controlGroup}
          >
            <UtilityButton
              className="kimolia-action"
              disabled={!canUndo}
              onActivate={undo}
              aria-keyshortcuts="Control+Z Meta+Z"
            >
              {labels.undo}
            </UtilityButton>
            <UtilityButton
              className="kimolia-action"
              disabled={!canRedo}
              onActivate={redo}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
            >
              {labels.redo}
            </UtilityButton>
            <UtilityButton
              className="kimolia-action"
              disabled={!hasMarks}
              onActivate={clear}
            >
              {labels.clear}
            </UtilityButton>
            <UtilityButton
              className="kimolia-action"
              disabled={exportStatus === 'exporting' || rendering}
              onActivate={savePng}
            >
              {exportStatus === 'exporting' ? labels.saving : labels.save}
            </UtilityButton>
          </div>
          <span className="kimolia-note" aria-hidden="true">
            {note}
          </span>
        </div>
      )}
      <p className="kimolia-hint">
        {selected === 'duster' ? labels.dusterHint : labels.chalkHint}
      </p>
      <p className="kimolia-sr-only" id={instructionsId}>
        {labels.instructions}
      </p>
      {/* Only failures are announced: an autosave that worked is not news. */}
      <span className="kimolia-sr-only" role="status">
        {failure}
      </span>
    </div>
  )
}
