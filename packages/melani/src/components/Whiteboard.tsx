import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBoard } from '../hooks/useBoard.js'
import { defaultLabels } from '../labels.js'
import { defaultMarkers, ERASER_ID, TOOL_VARIABLES } from '../lib/tools.js'
import type { WhiteboardProps } from '../types.js'
import { EraserArt, MarkerArt } from './ToolArt.js'
import '../styles.css'

const CORNERS = ['nw', 'ne', 'se', 'sw'] as const

export function Whiteboard({
  markers = defaultMarkers,
  defaultStrokes,
  strokes,
  onStrokesChange,
  persistence = false,
  exportFileName = 'melani-board.png',
  showControls = true,
  labels,
  brand = 'MELANI',
  portalContainer,
  className,
  style,
  ref,
}: WhiteboardProps) {
  const text = { ...defaultLabels, ...labels }
  const instructionsId = useId()
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const {
    rootRef, objectRef, surfaceRef, lightRef, sheenRef, canvasRef, layerRef, objectProps, surfaceProps, slotProps,
    activeTool, announcement, canUndo, canRedo, hasMarks, undo, redo, clear, save,
  } = useBoard({
    markers, defaultStrokes, strokes, onStrokesChange, persistence,
    exportFileName, labels: text, overlay: portal, ref,
  })
  const tools = [...markers.map((marker) => marker.id), ERASER_ID]

  // Tools in the air are posed in viewport coordinates, so they fly outside any
  // transformed or clipping ancestor. The node is made after mount, which keeps
  // the server render and the first client render identical, and it is always
  // the component's own: a consumer's container is never restyled.
  useEffect(() => {
    const node = document.createElement('div')
    node.className = 'melani-tool-portal'
    // The printed brand keeps the board's typeface in the air.
    node.style.fontFamily = getComputedStyle(rootRef.current!).fontFamily
    ;(portalContainer ?? document.body).append(node)
    setPortal(node)
    return () => {
      node.remove()
      setPortal(null)
    }
  }, [portalContainer, rootRef])

  return (
    <div
      ref={rootRef}
      className={['melani', activeTool ? 'melani--holding' : '', showControls ? '' : 'melani--bare', className].filter(Boolean).join(' ')}
      style={{ ...TOOL_VARIABLES, ...style }}
      role="group"
      aria-label={text.board}
    >
      <div className="melani-object" ref={objectRef} {...objectProps}>
        <div className="melani-frame">
          <span className="melani-frame-sheen" ref={sheenRef} aria-hidden="true" />
          {CORNERS.map((corner) => (
            <span key={corner} className={`melani-cap melani-cap--${corner}`} aria-hidden="true" />
          ))}
          <div
            className={`melani-surface${activeTool ? ' melani-surface--armed' : ''}`}
            ref={surfaceRef}
          >
            <span className="melani-gloss" ref={lightRef} aria-hidden="true" />
            <canvas
              ref={canvasRef}
              className="melani-canvas"
              aria-label={text.surface}
              aria-describedby={instructionsId}
              {...surfaceProps}
            />
            {brand ? <span className="melani-watermark" aria-hidden="true">{brand}</span> : null}
          </div>
        </div>
        <div className="melani-tray" role="group" aria-label={text.toolGroup}>
          <div className="melani-tray-well">
            {markers.map((marker) => (
              <button
                key={marker.id}
                type="button"
                className="melani-slot melani-slot--marker"
                data-melani-slot={marker.id}
                aria-label={marker.label}
                aria-pressed={activeTool === marker.id}
                {...slotProps}
              >
                <MarkerArt marker={marker} brand={brand} />
              </button>
            ))}
            <button
              type="button"
              className="melani-slot melani-slot--eraser"
              data-melani-slot={ERASER_ID}
              aria-label={text.eraser}
              aria-pressed={activeTool === ERASER_ID}
              {...slotProps}
            >
              <EraserArt brand={brand} />
            </button>
          </div>
          <span className="melani-tray-lip" aria-hidden="true" />
        </div>
      </div>

      {showControls ? (
        <div className="melani-controls" role="group" aria-label={text.controlGroup}>
          {/* aria-disabled rather than disabled: a button that disables itself
              under the keyboard would drop focus to the page. The actions
              themselves do nothing when there is nothing to do. */}
          <button type="button" onClick={undo} aria-disabled={!canUndo}>{text.undo}</button>
          <button type="button" onClick={redo} aria-disabled={!canRedo}>{text.redo}</button>
          <span className="melani-controls-divider" aria-hidden="true" />
          <button type="button" onClick={clear} aria-disabled={!hasMarks}>{text.clear}</button>
          <button type="button" onClick={save}>{text.save}</button>
        </div>
      ) : null}

      <p className="melani-offscreen" id={instructionsId}>{text.instructions}</p>
      <p className="melani-offscreen" role="status">{announcement}</p>

      {portal ? createPortal(
        <div ref={layerRef} className="melani-tool-layer" style={TOOL_VARIABLES}>
          {tools.map((id) => (
            <div key={id} className="melani-flight" data-melani-flight={id} aria-hidden="true" hidden>
              <span className="melani-flight-body">
                {id === ERASER_ID
                  ? <EraserArt brand={brand} />
                  : <MarkerArt marker={markers.find((marker) => marker.id === id)!} brand={brand} />}
              </span>
            </div>
          ))}
        </div>,
        portal,
      ) : null}
    </div>
  )
}
