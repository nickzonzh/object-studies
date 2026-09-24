import type { CSSProperties, Ref } from 'react'
import type { Stroke } from './lib/strokes.js'

export type { Bounds, Point, Stroke, StrokeTool } from './lib/strokes.js'

/** A marker in the tray. `color` is the plastic; `ink` is what it draws with. */
export type Marker = {
  id: string
  /** Accessible name of the tray button, e.g. `Black marker`. */
  label: string
  color: string
  ink: string
}

/** A marker id, or the built-in eraser. */
export type ToolId = string

export type WhiteboardLabels = {
  /** Accessible name of the whole board. */
  board: string
  /** Accessible name of the drawing surface. */
  surface: string
  /** How to use the board, read out with the surface. */
  instructions: string
  tools: string
  eraser: string
  actions: string
  undo: string
  redo: string
  clear: string
  save: string
  /** Announced after the matching action. */
  undone: string
  redone: string
  cleared: string
  /** Announced once if the board cannot be kept on the device. */
  saveFailed: string
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
  /** Starting drawing for an uncontrolled board. */
  defaultStrokes?: readonly Stroke[]
  /** Drawing to display. Providing it makes the board controlled. */
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
  className?: string
  style?: CSSProperties
  ref?: Ref<WhiteboardHandle>
}
