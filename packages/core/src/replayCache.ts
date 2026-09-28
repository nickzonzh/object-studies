export const CHECKPOINT_INTERVAL = 24
const MAX_BYTES = 32 * 1024 * 1024
const MAX_IMAGES = 4

type Snapshot<Stroke> = {
  strokes: Stroke[]
  image: HTMLCanvasElement
  checkpoint: boolean
}

export type ReplayCache<Stroke> = {
  /** Stores the canvas as the raster of `strokes`, if it is worth keeping. */
  capture: (strokes: readonly Stroke[], checkpoint?: boolean) => void
  /** Paints the longest usable prefix and returns how many strokes it covers. */
  restore: (strokes: readonly Stroke[]) => number
  clear: () => void
}

/**
 * A few completed raster prefixes accelerate replay; stroke records remain
 * authoritative. Prefixes match by stroke identity, so a new branch after Undo
 * or Clear can never reuse an unrelated image. Budget excludes the main canvas
 * and any scratch surfaces the caller keeps.
 */
export function createReplayCache<Stroke>(
  canvas: HTMLCanvasElement,
): ReplayCache<Stroke> {
  const snapshots: Snapshot<Stroke>[] = []
  const samePrefix = (snapshot: Snapshot<Stroke>, strokes: readonly Stroke[]) =>
    snapshot.strokes.length <= strokes.length &&
    snapshot.strokes.every((stroke, index) => stroke === strokes[index])
  // An image taken at another size would paint the wrong picture.
  const fits = (snapshot: Snapshot<Stroke>) =>
    snapshot.image.width === canvas.width &&
    snapshot.image.height === canvas.height
  const release = (snapshot: Snapshot<Stroke>) => {
    snapshot.image.width = snapshot.image.height = 0
  }
  return {
    capture(strokes, checkpoint = false) {
      if (!strokes.length || !canvas.width || !canvas.height) return
      for (let index = snapshots.length - 1; index >= 0; index--)
        if (!fits(snapshots[index])) release(snapshots.splice(index, 1)[0])
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
    restore(strokes) {
      let best: Snapshot<Stroke> | undefined
      for (const snapshot of snapshots) {
        if (
          (!best || snapshot.strokes.length > best.strokes.length) &&
          fits(snapshot) &&
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
