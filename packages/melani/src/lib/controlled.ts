import { createGestureHistory, type GestureHistory } from 'object-studies-core'
import type { Stroke } from './strokes.js'

/** The same drawing: the same strokes in the same order, whatever array holds them. */
export const sameDrawing = (a: readonly Stroke[], b: readonly Stroke[]) =>
  a === b || (a.length === b.length && a.every((stroke, i) => stroke === b[i]))

/**
 * The history a controlled board acts on. Its owner may keep, copy, replace or
 * refuse the drawing the board last handed out; anything but that drawing is a
 * different document, whose past the board does not know.
 */
export const reconcile = (history: GestureHistory<Stroke>, owned: readonly Stroke[] | undefined) =>
  !owned || sameDrawing(owned, history.strokes()) ? history : createGestureHistory<Stroke>(owned)
