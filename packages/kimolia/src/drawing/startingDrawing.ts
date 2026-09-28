import { replayProblem } from './boardStorage.js'
import type { DrawingStroke } from './types.js'

/**
 * Strokes from props are replayed just like stored ones, so they meet the
 * same replay limits — and a drawing that breaks them fails loudly instead of
 * occupying the board for minutes.
 */
export function replayable(strokes: readonly DrawingStroke[], prop: string) {
  const problem = replayProblem(strokes)
  if (problem) throw new Error(`kimolia: \`${prop}\` cannot be drawn: ${problem}`)
  return strokes
}

/**
 * The owner's strokes, then the drawing saved under the board's key, then the
 * template. A saved drawing, even an empty one, is the user's work: if the
 * template won, the first new stroke would autosave it over theirs.
 */
export function startingDrawing(
  controlled: readonly DrawingStroke[] | undefined,
  saved: readonly DrawingStroke[] | null | undefined,
  template: readonly DrawingStroke[] | undefined,
): readonly DrawingStroke[] {
  if (controlled) return replayable(controlled, 'strokes')
  return saved ?? replayable(template ?? [], 'defaultStrokes')
}
