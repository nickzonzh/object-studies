import { seededRandom } from 'object-studies-core'
import { hsla } from './colour.js'
import type { Material } from './materials.js'
import type { Bead } from './strand.js'

export type Canvas2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export type BeadBody = {
  canvas: HTMLCanvasElement | OffscreenCanvas
  /** Half-length and half-width, millimetres. */
  a: number
  b: number
}

/** Round beads are ellipses; olive beads are squarer superellipses. */
export const beadExponent = (material: Material): number => (material.shape === 'olive' ? 2.5 : 2)

/** Traces a bead outline centred on the origin, long axis along x. */
export function traceBead(ctx: Canvas2D, a: number, b: number, exponent: number): void {
  ctx.beginPath()
  for (let i = 0; i <= 40; i++) {
    const angle = (i / 40) * Math.PI * 2
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const x = a * Math.sign(cos) * Math.abs(cos) ** (2 / exponent)
    const y = b * Math.sign(sin) * Math.abs(sin) ** (2 / exponent)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/** A scratch 2D canvas, offscreen where the browser supports it. */
export function scratchCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: Canvas2D } | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    return ctx ? { canvas, ctx } : null
  }
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  return ctx ? { canvas, ctx } : null
}

/**
 * Paints one bead's body at `scale` device pixels per millimetre: its colour
 * and what is inside it (amber's inclusions, olive wood's grain, bone's pores,
 * the mati's eye, onyx's banding), seeded so a bead looks the same every time.
 * Lighting is added live when the bead is drawn, so it follows the bead's angle.
 */
export function bakeBead(bead: Bead, material: Material, scale: number): BeadBody | null {
  const a = bead.length / 2
  const b = bead.width / 2
  const w = Math.ceil((bead.length + 2) * scale)
  const h = Math.ceil((bead.width + 2) * scale)
  const scratch = scratchCanvas(w, h)
  if (!scratch) return null
  const { canvas, ctx } = scratch
  const random = seededRandom(bead.seed)
  ctx.translate(w / 2, h / 2)
  ctx.scale(scale, scale)
  const exponent = beadExponent(material)
  traceBead(ctx, a, b, exponent)
  ctx.save()
  ctx.clip()
  const hsl = bead.hsl
  ctx.fillStyle = hsla(hsl)
  ctx.fillRect(-a - 1, -b - 1, a * 2 + 2, b * 2 + 2)

  switch (material.figure) {
    case 'inclusions': {
      // Amber: a deeper rim, cloudy patches, flecks of bark and tiny bubbles.
      const rim = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(a, b))
      rim.addColorStop(0, hsla(hsl, 0))
      rim.addColorStop(0.65, hsla(hsl, 0.25, -6, 6))
      rim.addColorStop(1, hsla(hsl, 0.8, -16, 8))
      ctx.fillStyle = rim
      ctx.fillRect(-a, -b, a * 2, b * 2)
      const clouds = random() < 0.45 ? 2 + Math.floor(random() * 3) : 0
      for (let i = 0; i < clouds; i++) {
        const x = (random() * 2 - 1) * a * 0.6
        const y = (random() * 2 - 1) * b * 0.6
        const r = (0.35 + random() * 0.45) * b
        const cloud = ctx.createRadialGradient(x, y, 0, x, y, r)
        cloud.addColorStop(0, hsla(hsl, 0.32, 14, -18))
        cloud.addColorStop(1, hsla(hsl, 0, 14, -18))
        ctx.fillStyle = cloud
        ctx.beginPath()
        ctx.ellipse(x, y, r * (1 + random() * 0.6), r, random() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
      const flecks = Math.floor(random() * 3)
      for (let i = 0; i < flecks; i++) {
        ctx.fillStyle = hsla([hsl[0] - 10, 40, 12], 0.55 + random() * 0.3)
        ctx.beginPath()
        ctx.ellipse(
          (random() * 2 - 1) * a * 0.55,
          (random() * 2 - 1) * b * 0.55,
          0.15 + random() * 0.35,
          0.1 + random() * 0.2,
          random() * Math.PI,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      const bubbles = Math.floor(random() * 3)
      for (let i = 0; i < bubbles; i++) {
        const x = (random() * 2 - 1) * a * 0.5
        const y = (random() * 2 - 1) * b * 0.5
        const r = 0.12 + random() * 0.3
        ctx.strokeStyle = hsla(hsl, 0.5, 22, -10)
        ctx.lineWidth = 0.08
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (random() < 0.25) {
        // A hairline crack.
        ctx.strokeStyle = hsla(hsl, 0.35, 18, -12)
        ctx.lineWidth = 0.07
        ctx.beginPath()
        let x = (random() * 2 - 1) * a * 0.4
        let y = (random() * 2 - 1) * b * 0.4
        ctx.moveTo(x, y)
        for (let i = 0; i < 4; i++) {
          x += (random() * 2 - 1) * 1.6
          y += (random() * 2 - 1) * 1.6
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      break
    }
    case 'grain': {
      // Olive wood: growth rings wrapping round the bead, sometimes a knot.
      const rings = 9 + Math.floor(random() * 6)
      const phase = random() * Math.PI * 2
      const wave = 0.3 + random() * 0.5
      for (let ring = 0; ring < rings; ring++) {
        const angle = -Math.PI / 2 + ((ring + random() * 0.6) / rings) * Math.PI
        const dark = random() < 0.35
        ctx.strokeStyle = dark ? hsla(hsl, 0.75, -26, 8) : hsla(hsl, 0.35, -12, 4)
        ctx.lineWidth = dark ? 0.35 + random() * 0.45 : 0.15 + random() * 0.2
        ctx.beginPath()
        for (let i = 0; i <= 24; i++) {
          const x = -a + (i / 24) * a * 2
          const lean = angle + Math.sin(x * 0.45 + phase + ring * 0.7) * 0.18 * wave
          const y = Math.sin(lean) * b * Math.sqrt(Math.max(0, 1 - (Math.abs(x) / a) ** +exponent) + 0.05)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      if (random() < 0.3) {
        const x = (random() * 2 - 1) * a * 0.5
        const y = (random() * 2 - 1) * b * 0.4
        const knot = ctx.createRadialGradient(x, y, 0, x, y, 1.6)
        knot.addColorStop(0, hsla(hsl, 0.9, -32, 10))
        knot.addColorStop(1, hsla(hsl, 0, -32, 10))
        ctx.fillStyle = knot
        ctx.beginPath()
        ctx.ellipse(x, y, 2.2, 1.3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'pores': {
      // Ox bone: faint fibres along the bead, pores, and stained ends.
      for (let i = 0; i < 7; i++) {
        const y = (random() * 2 - 1) * b * 0.85
        ctx.strokeStyle = hsla(hsl, 0.12 + random() * 0.12, -10 - random() * 8)
        ctx.lineWidth = 0.15 + random() * 0.35
        ctx.beginPath()
        ctx.moveTo(-a, y)
        ctx.bezierCurveTo(-a / 3, y + (random() - 0.5), a / 3, y + (random() - 0.5), a, y + (random() - 0.5) * 1.5)
        ctx.stroke()
      }
      for (let i = 0; i < 28; i++) {
        ctx.fillStyle = hsla(hsl, 0.25 + random() * 0.3, -30)
        ctx.beginPath()
        ctx.arc((random() * 2 - 1) * a * 0.9, (random() * 2 - 1) * b * 0.9, 0.05 + random() * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const side of [-1, 1]) {
        const stain = ctx.createRadialGradient(side * a, 0, 0, side * a, 0, a * 0.9)
        stain.addColorStop(0, hsla([hsl[0] - 4, hsl[1] + 18, hsl[2] - 14], 0.55))
        stain.addColorStop(1, hsla([hsl[0] - 4, hsl[1] + 18, hsl[2] - 14], 0))
        ctx.fillStyle = stain
        ctx.fillRect(-a, -b, a * 2, b * 2)
      }
      break
    }
    case 'eye': {
      // Mati: white, light blue and dark blue rings, turned a little each bead.
      const depth = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(a, b))
      depth.addColorStop(0, hsla(hsl, 0, 8))
      depth.addColorStop(1, hsla(hsl, 0.7, -14, 6))
      ctx.fillStyle = depth
      ctx.fillRect(-a, -b, a * 2, b * 2)
      const turn = bead.turn * 0.85
      const y = Math.sin(turn) * b * 0.62
      const squash = Math.max(0.35, Math.cos(turn))
      const x = (random() * 2 - 1) * a * 0.08
      for (const [r, colour] of [
        [0.46, '#f4f2ea'],
        [0.33, '#6fb4e3'],
        [0.17, '#0e1a2b'],
      ] as const) {
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.ellipse(x, y, r * b * 1.02, r * b * squash, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'banding': {
      // Onyx: faint concentric bands off to one side.
      const angle = random() * Math.PI * 2
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = hsla(hsl, 0.25 + random() * 0.2, 9 + random() * 6)
        ctx.lineWidth = 0.2 + random() * 0.5
        ctx.beginPath()
        const r = b * (0.4 + i * 0.28)
        ctx.ellipse(Math.cos(angle) * a, Math.sin(angle) * b, r * 1.4, r, angle, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }
  }

  // Shade the ends where the cord goes in.
  for (const side of [-1, 1]) {
    const hole = ctx.createRadialGradient(side * a, 0, 0, side * a, 0, b * 0.75)
    hole.addColorStop(0, 'rgba(10, 6, 2, 0.45)')
    hole.addColorStop(1, 'rgba(10, 6, 2, 0)')
    ctx.fillStyle = hole
    ctx.fillRect(-a, -b, a * 2, b * 2)
  }
  ctx.restore()
  return { canvas, a, b }
}
