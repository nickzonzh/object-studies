// Paints pieces off the main thread. The painters draw on OffscreenCanvas here
// (see createContext), and the finished maps go back as bitmaps, moved rather
// than copied.

import { canvasBlurs } from './painter.js'
import { SHAPES } from './shapes.js'
import { paintVessel } from './styles.js'
import type { PaintReply, PaintRequest } from './paint.js'

const reply = (message: PaintReply, transfer: Transferable[] = []) => self.postMessage(message, { transfer })

// Tells the page whether painting here would look the same as on the main thread.
reply({ kind: 'ready', blurs: canvasBlurs() })

self.addEventListener('message', (event: MessageEvent<PaintRequest>) => {
  const { id, shape, style, palette, seed, detail } = event.data
  try {
    const s = paintVessel(SHAPES[shape], style, palette, seed, detail)
    if (!('transferToImageBitmap' in s.color) || !('transferToImageBitmap' in s.mat)) throw new Error('painted without OffscreenCanvas')
    const color = s.color.transferToImageBitmap()
    const mat = s.mat.transferToImageBitmap()
    reply({ kind: 'painted', id, color, mat, finish: s.finish }, [color, mat])
  } catch (err) {
    reply({ kind: 'failed', id, message: err instanceof Error ? err.message : String(err) })
  }
})
