import type { ChalkColor } from './drawing/types.js'

/** Every user-visible string the chalkboard renders. English by default. */
export type ChalkboardLabels = {
  board: string
  surface: string
  toolGroup: string
  chalk: Record<ChalkColor, string>
  duster: string
  controlGroup: string
  putBack: string
  undo: string
  redo: string
  clear: string
  save: string
  saving: string
  /** `{tool}` is replaced with the held tool's label. */
  inHand: string
  empty: string
  chalkHint: string
  dusterHint: string
  updating: string
  savedOnDevice: string
  storageUnavailable: string
  storageInvalid: string
  storageFull: string
  exportFailed: string
  instructions: string
}

export const defaultLabels: ChalkboardLabels = {
  board: 'Chalkboard',
  surface: 'Chalkboard drawing surface',
  toolGroup: 'Chalk and duster',
  chalk: {
    white: 'White chalk',
    yellow: 'Pale yellow chalk',
    blue: 'Dusty blue chalk',
    pink: 'Faded pink chalk',
  },
  duster: 'Chalkboard duster',
  controlGroup: 'Drawing controls',
  putBack: 'Put back',
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear',
  save: 'Save PNG',
  saving: 'Preparing…',
  inHand: '{tool} in hand.',
  empty: 'Pick up chalk. Make your mark.',
  chalkHint: 'A little pressure, a little dust. Something worth keeping.',
  dusterHint: 'Sweep to lift the chalk. Wipe again for a cleaner slate.',
  updating: 'Updating drawing…',
  savedOnDevice: 'Saved on this device.',
  storageUnavailable:
    'Saving on this device is unavailable. Use Save PNG to keep a copy.',
  storageInvalid:
    'The saved drawing could not be opened. New marks will replace it.',
  storageFull:
    'This drawing is too large to save on this device. Use Save PNG to keep a copy.',
  exportFailed: 'The PNG could not be created. Please try again.',
  instructions:
    'Choose chalk, then drag on the slate to draw. Choose it again, use Put back, or press Escape to return it. Keyboard selection moves focus to the slate: use arrow keys to move, Shift for larger steps, and hold Space or Enter while moving to draw or erase. The duster leaves faint residue; repeated passes remove more. Undo and Redo also work with Control or Command Z, and Shift Z to redo, while the board or its controls have focus. Clear can be undone. Save PNG downloads the slate only.',
}

export function mergeLabels(
  overrides: Partial<ChalkboardLabels> | undefined,
): ChalkboardLabels {
  if (!overrides) return defaultLabels
  return {
    ...defaultLabels,
    ...overrides,
    chalk: { ...defaultLabels.chalk, ...overrides.chalk },
  }
}
