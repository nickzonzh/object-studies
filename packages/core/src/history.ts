type Action<Stroke> =
  | { kind: 'draw'; strokes: Stroke[] }
  | { kind: 'clear'; strokes: Stroke[] }

export type HistoryState = {
  hasMarks: boolean
  canUndo: boolean
  canRedo: boolean
}

export type GestureHistory<Stroke> = {
  strokes: () => Stroke[]
  state: () => HistoryState
  commit: (gesture: Stroke[]) => void
  clear: () => void
  undo: () => void
  redo: () => void
}

/**
 * One action per gesture, even when clipping splits it into several strokes.
 * Clear retains the preceding records; snapshots never duplicate point arrays.
 * Strokes are compared by identity, so callers must treat them as immutable
 * once committed.
 */
export function createGestureHistory<Stroke>(
  initial: readonly Stroke[] = [],
): GestureHistory<Stroke> {
  let strokes = [...initial]
  const past: Action<Stroke>[] = []
  const future: Action<Stroke>[] = []
  return {
    strokes: () => strokes,
    state: () => ({
      hasMarks: strokes.length > 0,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
    }),
    commit(gesture: Stroke[]) {
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
