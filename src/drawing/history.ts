import type { DrawingStroke } from './types'

type Action =
  | { kind: 'draw'; strokes: DrawingStroke[] }
  | { kind: 'clear'; strokes: DrawingStroke[] }

export type HistoryState = {
  hasMarks: boolean
  canUndo: boolean
  canRedo: boolean
}

// One action per gesture, even when clipping splits it into several strokes.
// Clear retains the preceding records; snapshots never duplicate point arrays.
export function createDrawingHistory(initial: DrawingStroke[] = []) {
  let strokes = [...initial]
  const past: Action[] = []
  const future: Action[] = []
  return {
    strokes: () => strokes,
    state: (): HistoryState => ({
      hasMarks: strokes.length > 0,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    }),
    commit(gesture: DrawingStroke[]) {
      if (!gesture.length) return
      past.push({ kind: 'draw', strokes: gesture })
      strokes.push(...gesture)
      future.length = 0
    },
    clear() {
      if (!strokes.length) return
      past.push({ kind: 'clear', strokes })
      strokes = []
      future.length = 0
    },
    undo() {
      const action = past.pop()
      if (!action) return
      if (action.kind === 'clear') strokes = [...action.strokes]
      else strokes.splice(strokes.length - action.strokes.length)
      future.push(action)
    },
    redo() {
      const action = future.pop()
      if (!action) return
      if (action.kind === 'clear') strokes = []
      else strokes.push(...action.strokes)
      past.push(action)
    },
  }
}
