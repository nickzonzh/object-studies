import type { WhiteboardLabels } from './types.js'

/** Every user-visible string the whiteboard renders. English by default. */
export const defaultLabels: WhiteboardLabels = {
  board: 'Whiteboard',
  surface: 'Drawing surface',
  instructions:
    'Choose a marker or the eraser from the tray, then draw on the board. Drawing needs a mouse, pen or touch.',
  toolGroup: 'Whiteboard tools',
  eraser: 'Eraser',
  controlGroup: 'Board actions',
  undo: 'Undo',
  redo: 'Redo',
  clear: 'Clear',
  save: 'Save PNG',
  undone: 'Undid the last mark.',
  redone: 'Redid the last mark.',
  cleared: 'Board cleared.',
  saveFailed: 'This board could not be saved on this device. Use Save PNG to keep a copy.',
  storageInvalid: 'The saved board could not be opened. New marks will replace it.',
  exportFailed: 'The PNG could not be created. Please try again.',
}
