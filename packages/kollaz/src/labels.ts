export type CraftTableLabels = {
  /** Accessible name of the whole table. */
  table: string
  /** Accessible name of the cutting mat. */
  mat: string
  /** How to use the mat, read out with it. */
  instructions: string
  /** Accessible name of the caddy. */
  toolGroup: string
  glue: string
  scissors: string
  texta: string
  pipeCleaners: string
  goldGlitter: string
  silverGlitter: string
  pinkGlitter: string
  tealGlitter: string
  sequins: string
  googlyEyes: string
  pomPoms: string
  stamp: string
  inkPad: string
  tape: string
  /** Accessible name of the bar with the paper stack and Tip off. */
  controlGroup: string
  /** Printed beside the paper stack. */
  newSheet: string
  /** Accessible name of the paper stack. */
  paperGroup: string
  /** Name and tooltip of each paper in the stack. */
  cobaltSheet: string
  blackSheet: string
  tomatoSheet: string
  sunflowerSheet: string
  kraftSheet: string
  tipOff: string
  /** Shown under the table, and read out, for whatever is in hand. */
  empty: string
  glueHint: string
  scissorsHint: string
  textaHint: string
  pipeCleanersHint: string
  glitterHint: string
  sequinsHint: string
  googlyEyesHint: string
  pomPomsHint: string
  stampHint: string
  /** The stamp in hand has no ink on it. */
  stampDryHint: string
  tapeHint: string
  /** Shown and read out after the matching event. */
  inkPadFirst: string
  stampDry: string
  stuckDown: string
  tapedDown: string
  tippedOff: string
  sheetChanged: string
}

/** Every user-visible string the craft table renders. English by default. */
export const defaultLabels: CraftTableLabels = {
  table: 'Craft table',
  mat: 'Cutting mat',
  instructions:
    'Pick up a tool from the caddy, then use it on the paper on the mat. With nothing in hand, drag the googly eyes, cut-out pieces and pipe cleaners around. Working on the mat needs a mouse, pen or touch. Escape puts the tool back.',
  toolGroup: 'Craft caddy',
  glue: 'Glue stick',
  scissors: 'Scissors',
  texta: 'Texta',
  pipeCleaners: 'Pipe cleaners',
  goldGlitter: 'Gold glitter',
  silverGlitter: 'Silver glitter',
  pinkGlitter: 'Pink glitter',
  tealGlitter: 'Teal glitter',
  sequins: 'Holographic sequins',
  googlyEyes: 'Googly eyes',
  pomPoms: 'Pom poms',
  stamp: 'Rubber stamp',
  inkPad: 'Ink pad',
  tape: 'Masking tape',
  controlGroup: 'Table actions',
  newSheet: 'New sheet',
  paperGroup: 'New sheet of paper',
  cobaltSheet: 'New cobalt sheet',
  blackSheet: 'New black sheet',
  tomatoSheet: 'New tomato sheet',
  sunflowerSheet: 'New sunflower sheet',
  kraftSheet: 'New kraft sheet',
  tipOff: 'Tip off loose bits',
  empty: 'Pick something up from the caddy. Drag the eyes, cut-out pieces and pipe cleaners around, or tap the mat to give it a knock.',
  glueHint: 'Draw with the glue. It goes on purple and dries clear in about 15 seconds.',
  scissorsHint: 'Cut all the way round a shape to lift it out, or cut from one edge to the other to split the sheet.',
  textaHint: 'Draw with the texta. It is permanent, so it goes wherever the paper goes.',
  pipeCleanersHint: 'Draw a path and a pipe cleaner bends along it, up to about 15 cm. Drag it, glue it or tape it down.',
  glitterHint: 'Hold down to shake. Glitter only sticks where the glue is still purple.',
  sequinsHint: 'Hold down to sprinkle sequins. Like glitter, they only stick to purple glue.',
  googlyEyesHint: 'Tap to stick an eye down. Tap the pot to put it back.',
  pomPomsHint: 'Tap to drop a pom pom. Pressed into purple glue it stays put. Anywhere else it rolls.',
  stampHint: 'Stamp the paper. Each print uses a little ink, so they fade as you go.',
  stampDryHint: 'Press the stamp on the ink pad first.',
  tapeHint: 'Drag to lay a strip of masking tape. Tape over a cut-out piece or a pipe cleaner holds it down.',
  inkPadFirst: 'Pick up the stamp, then press it on the ink pad.',
  stampDry: 'The stamp is dry. Press it on the ink pad.',
  stuckDown: 'Stuck down. The glue under it was still purple.',
  tapedDown: 'Taped down.',
  tippedOff: 'Tipped off everything that was not stuck down.',
  sheetChanged: 'Fresh sheet on the mat. Everything on the last one is gone.',
}
