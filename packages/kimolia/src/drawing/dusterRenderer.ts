import { seededRandom } from 'object-studies-core'
import type { ChalkPoint, DusterStroke } from './types.js'

const BRUSH_WIDTH = 160
const BRUSH_HEIGHT = 72
/** The felt's soft halo, as a multiple of the footprint it actually presses. */
const HALO = 1.34
/** Share of the mark one pass may lift, so repeated wipes keep cleaning. */
const LIFT = 0.88
/** How far dust is dragged along the sweep, as a share of the felt height. */
const SMEAR = 0.22
/** Strength of the dust laid back down behind the felt. */
const SMEAR_ALPHA = 0.28
/** Offsets of each dust copy: [share of the drag, pixels across the sweep]. */
const SMEAR_SPREAD: readonly (readonly [number, number])[] = [
  [0.3, 1.4],
  [0.66, -1.1],
  [1, 0.5],
  [0.12, -2.2],
]
/**
 * Felt, not a rubber stamp: a solid core that fades outwards over a wide,
 * uneven margin, with longitudinal fibre gaps and worn ends. The margin is what
 * leaves a haze past the edge of the wipe instead of a cut rectangle.
 */
function feltBrush(brush: HTMLCanvasElement, seed: number) {
  const ctx = brush.getContext('2d')!
  const image = ctx.createImageData(brush.width, brush.height)
  const next = seededRandom(seed)
  const halfWidth = brush.width / 2
  const halfHeight = brush.height / 2
  // Pressed footprint inside the padded brush, leaving room for the halo.
  const coreX = halfWidth / HALO - 6
  const coreY = halfHeight / HALO - 5
  // Worn felt lifts unevenly: some fibre rows barely touch, and those leave
  // the streaks that make a wiped board look wiped.
  const fibres = Array.from({ length: brush.height }, () =>
    next() < 0.22 ? 0.2 + next() * 0.34 : 0.76 + next() * 0.24,
  )
  const ripple = Array.from({ length: 24 }, () => 0.72 + next() * 0.28)
  for (let y = 0; y < brush.height; y++) {
    for (let x = 0; x < brush.width; x++) {
      const qx = Math.abs(x + 0.5 - halfWidth) - coreX
      const qy = Math.abs(y + 0.5 - halfHeight) - coreY
      const distance =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0)
      // Inside the core the felt lifts fully; outside it falls away smoothly
      // over a margin whose reach wanders along the felt.
      const reach = 11 * ripple[Math.floor((x / brush.width) * ripple.length)]
      const fade = Math.max(0, Math.min(1, -distance / reach))
      const edge = fade * fade * (3 - 2 * fade)
      image.data[(y * brush.width + x) * 4 + 3] = Math.round(
        255 * edge * fibres[y] * (0.88 + next() * 0.12),
      )
    }
  }
  ctx.putImageData(image, 0, 0)
}

export function createDusterRenderer(canvas: HTMLCanvasElement) {
  // Reused scratch surfaces. A mask is applied to the pre-pass image only once,
  // at a capped strength, so overlapping stamps cannot erase the ghost in one
  // sweep; the smear layer carries lifted dust forward along the wipe.
  const base = document.createElement('canvas')
  const mask = document.createElement('canvas')
  const smear = document.createElement('canvas')
  const brush = document.createElement('canvas')
  brush.width = BRUSH_WIDTH
  brush.height = BRUSH_HEIGHT
  const baseCtx = base.getContext('2d')!
  const maskCtx = mask.getContext('2d')!
  const smearCtx = smear.getContext('2d')!
  const ctx = canvas.getContext('2d')!
  return {
    begin(stroke: DusterStroke) {
      for (const scratch of [base, mask, smear]) {
        if (scratch.width !== canvas.width || scratch.height !== canvas.height) {
          scratch.width = canvas.width
          scratch.height = canvas.height
        }
      }
      feltBrush(brush, stroke.seed)
      const sx = canvas.width / stroke.space.width
      const sy = canvas.height / stroke.space.height
      const width = stroke.width * HALO
      const height = stroke.height * HALO
      let dirty: {
        left: number
        top: number
        right: number
        bottom: number
      } | null = null
      let previous: ChalkPoint | null = null
      let drag = { x: 0, y: 0 }
      const startPass = () => {
        baseCtx.clearRect(0, 0, base.width, base.height)
        baseCtx.drawImage(canvas, 0, 0)
        maskCtx.resetTransform()
        maskCtx.clearRect(0, 0, mask.width, mask.height)
        maskCtx.setTransform(sx, 0, 0, sy, 0, 0)
        dirty = null
        previous = null
      }
      const flush = () => {
        if (!dirty) return
        const x = Math.max(0, Math.floor(dirty.left))
        const y = Math.max(0, Math.floor(dirty.top))
        const w = Math.min(canvas.width, Math.ceil(dirty.right)) - x
        const h = Math.min(canvas.height, Math.ceil(dirty.bottom)) - y
        if (w > 0 && h > 0) {
          // The dust the felt just picked up, dragged along the sweep. The
          // offset is taken on the source read so the layer keeps the dirty
          // rectangle's bounds — shifting the destination would print its edge.
          smearCtx.save()
          smearCtx.resetTransform()
          smearCtx.clearRect(x, y, w, h)
          smearCtx.globalAlpha = 0.3
          // Along the sweep, and a little either side of it, so the haze ends
          // up wider than the mark the felt lifted.
          const reach = Math.hypot(drag.x, drag.y) || 1
          for (const [along, across] of SMEAR_SPREAD) {
            const shiftX = drag.x * along - (drag.y / reach) * across
            const shiftY = drag.y * along + (drag.x / reach) * across
            smearCtx.drawImage(
              base,
              x - shiftX * sx,
              y - shiftY * sy,
              w,
              h,
              x,
              y,
              w,
              h,
            )
          }
          smearCtx.globalAlpha = 1
          smearCtx.globalCompositeOperation = 'destination-in'
          smearCtx.drawImage(mask, x, y, w, h, x, y, w, h)
          smearCtx.restore()

          ctx.save()
          ctx.resetTransform()
          ctx.clearRect(x, y, w, h)
          ctx.drawImage(base, x, y, w, h, x, y, w, h)
          ctx.globalCompositeOperation = 'destination-out'
          ctx.globalAlpha = LIFT
          ctx.drawImage(mask, x, y, w, h, x, y, w, h)
          ctx.globalCompositeOperation = 'source-over'
          ctx.globalAlpha = SMEAR_ALPHA
          ctx.drawImage(smear, x, y, w, h, x, y, w, h)
          ctx.restore()
        }
        dirty = null
      }
      startPass()
      return {
        stamp(point: ChalkPoint) {
          if (previous) {
            const dx = point.x - previous.x
            const dy = point.y - previous.y
            const length = Math.hypot(dx, dy)
            if (length > 1e-6) {
              const reach = (stroke.height * SMEAR) / length
              drag = { x: dx * reach, y: dy * reach }
            }
          }
          previous = point
          const x = point.x - width / 2
          const y = point.y - height / 2
          maskCtx.drawImage(brush, x, y, width, height)
          const bounds = {
            left: (x - Math.abs(drag.x)) * sx - 1,
            top: (y - Math.abs(drag.y)) * sy - 1,
            right: (x + width + Math.abs(drag.x)) * sx + 1,
            bottom: (y + height + Math.abs(drag.y)) * sy + 1,
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
      for (const scratch of [base, mask, smear, brush])
        scratch.width = scratch.height = 0
    },
  }
}
