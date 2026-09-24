import { random } from './random'
import type { ChalkPoint, DusterStroke } from './types'

function feltBrush(brush: HTMLCanvasElement, seed: number) {
  const ctx = brush.getContext('2d')!
  const image = ctx.createImageData(brush.width, brush.height)
  const next = random(seed)
  const fibres = Array.from({ length: brush.height }, () =>
    next() < 0.12 ? 0.1 + next() * 0.1 : 0.84 + next() * 0.16,
  )
  for (let y = 0; y < brush.height; y++) {
    for (let x = 0; x < brush.width; x++) {
      // A rounded felt rectangle, with soft edges and fine longitudinal gaps.
      const qx = Math.abs(x + 0.5 - 64) - 58
      const qy = Math.abs(y + 0.5 - 24) - 18
      const distance =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        5
      const edge = Math.max(0, Math.min(1, -distance / 2.5))
      image.data[(y * brush.width + x) * 4 + 3] = Math.round(
        255 * edge * fibres[y] * (0.91 + next() * 0.09),
      )
    }
  }
  ctx.putImageData(image, 0, 0)
  return brush
}

export function createDusterRenderer(canvas: HTMLCanvasElement) {
  // Reused scratch surfaces. A mask is applied to the pre-pass image only once,
  // at a capped strength, so overlapping stamps cannot erase the ghost in one sweep.
  const base = document.createElement('canvas')
  const mask = document.createElement('canvas')
  const brush = document.createElement('canvas')
  brush.width = 128
  brush.height = 48
  const baseCtx = base.getContext('2d')!
  const maskCtx = mask.getContext('2d')!
  const ctx = canvas.getContext('2d')!
  return {
    begin(stroke: DusterStroke) {
      for (const scratch of [base, mask]) {
        if (
          scratch.width !== canvas.width ||
          scratch.height !== canvas.height
        ) {
          scratch.width = canvas.width
          scratch.height = canvas.height
        }
      }
      feltBrush(brush, stroke.seed)
      const sx = canvas.width / stroke.space.width
      const sy = canvas.height / stroke.space.height
      let dirty: {
        left: number
        top: number
        right: number
        bottom: number
      } | null = null
      const startPass = () => {
        baseCtx.clearRect(0, 0, base.width, base.height)
        baseCtx.drawImage(canvas, 0, 0)
        maskCtx.resetTransform()
        maskCtx.clearRect(0, 0, mask.width, mask.height)
        maskCtx.setTransform(sx, 0, 0, sy, 0, 0)
        dirty = null
      }
      const flush = () => {
        if (!dirty) return
        const x = Math.max(0, Math.floor(dirty.left))
        const y = Math.max(0, Math.floor(dirty.top))
        const w = Math.min(canvas.width, Math.ceil(dirty.right)) - x
        const h = Math.min(canvas.height, Math.ceil(dirty.bottom)) - y
        if (w > 0 && h > 0) {
          ctx.save()
          ctx.resetTransform()
          ctx.clearRect(x, y, w, h)
          ctx.drawImage(base, x, y, w, h, x, y, w, h)
          ctx.globalCompositeOperation = 'destination-out'
          ctx.globalAlpha = 0.82
          ctx.drawImage(mask, x, y, w, h, x, y, w, h)
          ctx.restore()
        }
        dirty = null
      }
      startPass()
      return {
        stamp(point: ChalkPoint) {
          const x = point.x - stroke.width / 2
          const y = point.y - stroke.height / 2
          maskCtx.drawImage(brush, x, y, stroke.width, stroke.height)
          const bounds = {
            left: x * sx - 1,
            top: y * sy - 1,
            right: (x + stroke.width) * sx + 1,
            bottom: (y + stroke.height) * sy + 1,
          }
          dirty = dirty
            ? {
                left: Math.min(dirty.left, bounds.left),
                top: Math.min(dirty.top, bounds.top),
                right: Math.max(dirty.right, bounds.right),
                bottom: Math.max(dirty.bottom, bounds.bottom),
              }
            : bounds
        },
        flush,
        nextPass() {
          flush()
          startPass()
        },
      }
    },
    destroy() {
      base.width = base.height = mask.width = mask.height = 0
      brush.width = brush.height = 0
    },
  }
}
