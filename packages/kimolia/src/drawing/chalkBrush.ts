import { seededRandom } from 'object-studies-core'
import type { ChalkColor, ChalkStamp } from './types.js'

/** The stylesheet's defaults, for a page that has not loaded it. */
export const defaultChalkColors: Record<ChalkColor, string> = {
  white: '#f0ead8',
  yellow: '#e2d288',
  blue: '#9cbfcd',
  pink: '#dfabaf',
}

export type ChalkBrushes = {
  stamp: (ctx: CanvasRenderingContext2D, color: ChalkColor, stamp: ChalkStamp) => void
  clear: () => void
}

const SIZE = 48

/**
 * One rasterised stamp per colour: coarse pores, a lobed outline and a broken
 * edge, so a mark never reads as a clean airbrushed dot however small it gets.
 */
export function createChalkBrushes(
  colors: Record<ChalkColor, string> = defaultChalkColors,
): ChalkBrushes {
  const next = seededRandom(0xc4a1c)
  const mask = new Float32Array(SIZE * SIZE)
  // A few low-order lobes make the rim uneven; the chalk is not a cylinder.
  const lobes = Array.from({ length: 5 }, () => 0.86 + next() * 0.24)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = (x + 0.5 - SIZE / 2) / (SIZE * 0.46)
      const ny = (y + 0.5 - SIZE / 2) / (SIZE * 0.46)
      const radius = Math.hypot(nx, ny)
      const lobe =
        lobes[
          Math.floor(
            ((Math.atan2(ny, nx) + Math.PI) / (Math.PI * 2)) * lobes.length,
          ) % lobes.length
        ]
      const edge = Math.max(0, Math.min(1, (lobe - radius) * 4.2))
      const pore = next()
      // Coarse pores and a broken edge remain visible when the stamp shrinks.
      mask[y * SIZE + x] = pore < 0.28 ? 0 : edge * (0.12 + next() * 0.72)
    }
  }
  const brushes = new Map<ChalkColor, HTMLCanvasElement>()
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const probeCtx = probe.getContext('2d', { willReadFrequently: true })!
  const paint = new Map<ChalkColor, string>()
  for (const [color, value] of Object.entries(colors) as [
    ChalkColor,
    string,
  ][]) {
    // Resolve whatever CSS colour the theme provides down to bytes we can
    // write into image data — the same value paints the dust specks.
    probeCtx.clearRect(0, 0, 1, 1)
    probeCtx.fillStyle = '#000'
    probeCtx.fillStyle = value
    const resolved = probeCtx.fillStyle
    probeCtx.fillRect(0, 0, 1, 1)
    const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data
    paint.set(color, typeof resolved === 'string' ? resolved : value)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.createImageData(SIZE, SIZE)
    for (let i = 0; i < mask.length; i++) {
      pixels.data[i * 4] = r
      pixels.data[i * 4 + 1] = g
      pixels.data[i * 4 + 2] = b
      pixels.data[i * 4 + 3] = Math.round(mask[i] * 255)
    }
    ctx.putImageData(pixels, 0, 0)
    brushes.set(color, canvas)
  }
  probe.width = probe.height = 0

  return {
    stamp(ctx, color, stamp) {
      const height = stamp.size * stamp.squash
      ctx.save()
      ctx.translate(stamp.x, stamp.y)
      ctx.rotate(stamp.angle)
      ctx.globalAlpha = Math.min(1, stamp.opacity)
      ctx.drawImage(
        brushes.get(color)!,
        -stamp.size / 2,
        -height / 2,
        stamp.size,
        height,
      )
      ctx.restore()
      if (stamp.dust) {
        ctx.fillStyle = paint.get(color)!
        ctx.globalAlpha = stamp.dust.opacity
        ctx.beginPath()
        ctx.arc(stamp.dust.x, stamp.dust.y, stamp.dust.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    },
    clear() {
      for (const canvas of brushes.values()) canvas.width = canvas.height = 0
      brushes.clear()
    },
  }
}
