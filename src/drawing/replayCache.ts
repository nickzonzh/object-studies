import type { DrawingStroke } from './types'

export const CHECKPOINT_INTERVAL = 24
const MAX_BYTES = 32 * 1024 * 1024
const MAX_IMAGES = 4

type Snapshot = {
  strokes: DrawingStroke[]
  image: HTMLCanvasElement
  checkpoint: boolean
}

// A few completed raster prefixes accelerate replay; stroke records remain
// authoritative. Budget excludes the main canvas and the duster's scratch pair.
export function createReplayCache(canvas: HTMLCanvasElement) {
  const snapshots: Snapshot[] = []
  const samePrefix = (snapshot: Snapshot, strokes: DrawingStroke[]) =>
    snapshot.strokes.length <= strokes.length &&
    snapshot.strokes.every((stroke, index) => stroke === strokes[index])
  const release = (snapshot: Snapshot) => {
    snapshot.image.width = snapshot.image.height = 0
  }
  return {
    capture(strokes: DrawingStroke[], checkpoint = false) {
      if (!strokes.length) return
      const capacity = Math.min(
        MAX_IMAGES,
        Math.floor(MAX_BYTES / (canvas.width * canvas.height * 4)),
      )
      if (!capacity) return
      const existing = snapshots.find(
        (snapshot) =>
          snapshot.strokes.length === strokes.length &&
          samePrefix(snapshot, strokes),
      )
      if (existing) {
        existing.checkpoint ||= checkpoint
        return
      }
      // On a very large canvas, keep the one affordable periodic prefix rather
      // than replacing it with a newer image that the next Undo cannot use.
      if (
        capacity === 1 &&
        !checkpoint &&
        snapshots.some(
          (snapshot) => snapshot.checkpoint && samePrefix(snapshot, strokes),
        )
      )
        return
      // Reuse the recent image first, preserving older periodic checkpoints.
      let reuse = snapshots.findIndex((snapshot) => !snapshot.checkpoint)
      if (reuse < 0 && snapshots.length >= capacity) reuse = 0
      const image =
        reuse >= 0
          ? snapshots.splice(reuse, 1)[0].image
          : document.createElement('canvas')
      if (image.width !== canvas.width || image.height !== canvas.height) {
        image.width = canvas.width
        image.height = canvas.height
      }
      const ctx = image.getContext('2d')!
      ctx.globalCompositeOperation = 'copy'
      ctx.drawImage(canvas, 0, 0)
      snapshots.push({ strokes: [...strokes], image, checkpoint })
    },
    restore(strokes: DrawingStroke[]) {
      let best: Snapshot | undefined
      for (const snapshot of snapshots) {
        if (
          (!best || snapshot.strokes.length > best.strokes.length) &&
          samePrefix(snapshot, strokes)
        )
          best = snapshot
      }
      if (!best) return 0
      const ctx = canvas.getContext('2d')!
      ctx.save()
      ctx.resetTransform()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'copy'
      ctx.drawImage(best.image, 0, 0)
      ctx.restore()
      return best.strokes.length
    },
    clear() {
      snapshots.forEach(release)
      snapshots.length = 0
    },
  }
}
