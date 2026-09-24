import { random } from './random.ts'
import type { ChalkColor, ChalkStamp } from './types.ts'

export const chalkColors: Record<ChalkColor, string> = {
  white: '#f3eddc',
  yellow: '#e8d991',
  blue: '#a2c4d2',
  pink: '#e0afb2',
}

export function createChalkBrushes() {
  const size = 48
  const next = random(0xc4a1c)
  const mask = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - size / 2) / (size * 0.46)
      const ny = (y + 0.5 - size / 2) / (size * 0.46)
      const radius = Math.hypot(nx, ny)
      const edge = Math.max(0, Math.min(1, (1 - radius) * 5))
      const pore = next()
      // Coarse pores and a broken edge remain visible when the stamp shrinks.
      mask[y * size + x] = pore < 0.28 ? 0 : edge * (0.12 + next() * 0.72)
    }
  }
  const brushes = new Map<ChalkColor, HTMLCanvasElement>()
  for (const [color, hex] of Object.entries(chalkColors)) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.createImageData(size, size)
    const rgb = [1, 3, 5].map((start) =>
      parseInt(hex.slice(start, start + 2), 16),
    )
    for (let i = 0; i < mask.length; i++) {
      pixels.data[i * 4] = rgb[0]
      pixels.data[i * 4 + 1] = rgb[1]
      pixels.data[i * 4 + 2] = rgb[2]
      pixels.data[i * 4 + 3] = Math.round(mask[i] * 255)
    }
    ctx.putImageData(pixels, 0, 0)
    brushes.set(color as ChalkColor, canvas)
  }
  return brushes
}

export function paintStamp(
  ctx: CanvasRenderingContext2D,
  brush: HTMLCanvasElement,
  color: ChalkColor,
  stamp: ChalkStamp,
) {
  ctx.save()
  ctx.translate(stamp.x, stamp.y)
  ctx.rotate(stamp.angle)
  ctx.globalAlpha = Math.min(1, stamp.opacity)
  ctx.drawImage(brush, -stamp.size / 2, -stamp.size / 2, stamp.size, stamp.size)
  ctx.restore()
  if (stamp.dust) {
    ctx.fillStyle = chalkColors[color]
    ctx.globalAlpha = stamp.dust.opacity
    ctx.beginPath()
    ctx.arc(stamp.dust.x, stamp.dust.y, stamp.dust.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}
