import { useId } from 'react'
import { useBoard } from '../hooks/useBoard.js'
import { DEFAULT_MARKERS, ERASER_ID, TOOL_VARIABLES } from '../lib/tools.js'
import type { WhiteboardLabels, WhiteboardProps } from '../types.js'
import { EraserArt, MarkerArt } from './ToolArt.js'
import '../styles.css'

const DEFAULT_LABELS: WhiteboardLabels = {
  board: 'Whiteboard',
  surface: 'Drawing surface',
  instructions:
    'Choose a marker or the eraser from the tray, then draw on the  Drawing needs a mouse, pen or touch.',
  tools: 'Whiteboard tools',
  eraser: 'Eraser',
  actions: 'Board actions',
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear',
  save: 'Save PNG',
  undone: 'Undid the last mark.',
  redone: 'Redid the last mark.',
  cleared: 'Board cleared.',
  saveFailed: 'This board could not be saved on this device. Use Save PNG to keep a copy.',
}

const CORNERS = ['nw', 'ne', 'se', 'sw'] as const

export function Whiteboard({
  markers = DEFAULT_MARKERS,
  defaultStrokes,
  strokes,
  onStrokesChange,
  persistence = false,
  exportFileName = 'aspro-board.png',
  showControls = true,
  labels,
  brand = 'ASPRO',
  className,
  style,
  ref,
}: WhiteboardProps) {
  const text = { ...DEFAULT_LABELS, ...labels }
  const instructionsId = useId()
  const {
    rootRef, objectRef, surfaceRef, canvasRef, objectProps, surfaceProps, slotProps,
    activeTool, announcement, canUndo, canRedo, hasMarks, undo, redo, clear, save,
  } = useBoard({
    markers, defaultStrokes, strokes, onStrokesChange, persistence,
    exportFileName, labels: text, ref,
  })
  const tools = [...markers.map((marker) => marker.id), ERASER_ID]

  return (
    <div
      ref={rootRef}
      className={['aspro', showControls ? '' : 'aspro--bare', className].filter(Boolean).join(' ')}
      style={{ ...TOOL_VARIABLES, ...style }}
      role="group"
      aria-label={text.board}
    >
      <div className="aspro-object" ref={objectRef} {...objectProps}>
        <div className="aspro-frame">
          <span className="aspro-frame-sheen" aria-hidden="true" />
          {CORNERS.map((corner) => (
            <span key={corner} className={`aspro-cap aspro-cap--${corner}`} aria-hidden="true" />
          ))}
          <div
            className={`aspro-surface${activeTool ? ' aspro-surface--armed' : ''}`}
            ref={surfaceRef}
          >
            <span className="aspro-gloss" aria-hidden="true" />
            <canvas
              ref={canvasRef}
              className="aspro-canvas"
              aria-label={text.surface}
              aria-describedby={instructionsId}
              {...surfaceProps}
            />
            {brand ? <span className="aspro-watermark" aria-hidden="true">{brand}</span> : null}
          </div>
        </div>
        <div className="aspro-tray" role="group" aria-label={text.tools}>
          <div className="aspro-tray-well">
            {markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                className="aspro-slot aspro-slot--marker"
                data-aspro-slot={marker.id}
                aria-label={marker.label}
                aria-pressed={activeTool === marker.id}
                {...slotProps}
              >
                <MarkerArt marker={marker} brand={brand} />
              </button>
            ))}
            <button
              type="button"
              className="aspro-slot aspro-slot--eraser"
              data-aspro-slot={ERASER_ID}
              aria-label={text.eraser}
              aria-pressed={activeTool === ERASER_ID}
              {...slotProps}
            >
              <EraserArt brand={brand} />
            </button>
          </div>
          <span className="aspro-tray-lip" aria-hidden="true" />
        </div>
      </div>

      {showControls ? (
        <div className="aspro-controls" role="group" aria-label={text.actions}>
          <button type="button" onClick={undo} disabled={!canUndo}>{text.undo}</button>
          <button type="button" onClick={redo} disabled={!canRedo}>{text.redo}</button>
          <span className="aspro-controls-divider" aria-hidden="true" />
          <button type="button" onClick={clear} disabled={!hasMarks}>{text.clear}</button>
          <button type="button" onClick={save}>{text.save}</button>
        </div>
      ) : null}

      <p className="aspro-offscreen" id={instructionsId}>{text.instructions}</p>
      <p className="aspro-offscreen" role="status">{announcement}</p>

      {tools.map((id) => (
        <div key={id} className="aspro-flight" data-aspro-flight={id} aria-hidden="true" hidden>
          <span className="aspro-flight-body">
            {id === ERASER_ID
              ? <EraserArt brand={brand} />
              : <MarkerArt marker={markers.find((marker) => marker.id === id)!} brand={brand} />}
          </span>
        </div>
      ))}
    </div>
  )
}
