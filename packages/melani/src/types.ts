import type { CSSProperties, Ref } from 'react'
import type { Stroke } from './lib/strokes.js'

export type { Point, Stroke, StrokeTool } from './lib/strokes.js'

/** A marker in the tray. `color` is the plastic; `ink` is what it draws with. */
export type Marker = {
  id: string
  /** Accessible name of the tray button, e.g. `Black marker`. */
  label: string
  color: string
  ink: string
}

export type WhiteboardLabels = {
  /** Accessible name of the whole board. */
  board: string
  /** Accessible name of the drawing surface. */
  surface: string
  /** How to use the board, read out with the surface. */
  instructions: string
  /** Accessible name of the tray. */
  toolGroup: string
  eraser: string
  /** Accessible name of the undo/redo/clear/save bar. */
  controlGroup: string
  undo: string
  redo: string
  clear: string
  save: string
  /** Announced after the matching action. */
  undone: string
  redone: string
  cleared: string
  /** Announced each time the board stops being kept on the device. */
  saveFailed: string
  /** Announced when a saved board exists but cannot be opened. */
  storageInvalid: string
  /** Announced when Save PNG fails. */
  exportFailed: string
}

export type WhiteboardHandle = {
  undo: () => void
  redo: () => void
  clear: () => void
  /** The board as an image, on the board colour rather than transparency. */
  toBlob: (type?: string) => Promise<Blob>
  getStrokes: () => readonly Stroke[]
}

export type WhiteboardProps = {
  /** Tray contents. Defaults to black, blue, red and green. */
  markers?: readonly Marker[]
  /** Starting drawing for an uncontrolled board. A malformed stroke throws. */
  defaultStrokes?: readonly Stroke[]
  /**
   * Drawing to display. Providing it makes the board controlled. Strokes are
   * compared by identity, so keep the ones the board hands you. A malformed
   * stroke throws.
   */
  strokes?: readonly Stroke[]
  onStrokesChange?: (strokes: readonly Stroke[]) => void
  /** Off by default: a component should not claim storage unasked. */
  persistence?: false | { key: string }
  exportFileName?: string
  /** Built-in undo/redo/clear/save bar. */
  showControls?: boolean
  labels?: Partial<WhiteboardLabels>
  /** Text printed on the tools and the board. Pass `''` for unbranded. */
  brand?: string
  /** Where the flying tools are portalled; a body-level element by default. */
  portalContainer?: HTMLElement | null
  className?: string
  style?: CSSProperties
  ref?: Ref<WhiteboardHandle>
}
