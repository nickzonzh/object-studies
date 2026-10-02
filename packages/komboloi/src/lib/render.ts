import { seededRandom } from 'object-studies-core'
import type { Hsl, Material } from './materials.js'
import type { Komboloi, Vec } from './physics.js'
import type { BeadSpec, Strand } from './strand.js'

/**
 * Draws a strand hanging on its peg, onto a 2D canvas, lit from the upper left.
 *
 * Each bead's body (colour and figure: inclusions, grain, pores, an eye) is
 * painted once into its own small canvas, in the bead's frame with the cord
 * running along x. Every frame the body is turned to lie along the cord, then
 * shaded, glowed and glinted in the room's frame, so the light stays put as
 * the bead turns.
 */

const LIGHT = { x: -0.62, y: -0.78 }
const SHADOW_OFFSET = { x: 2.6, y: 4.2 }
const SHADOW_SCALE = 0.25

const hsl = ([h, s, l]: Hsl, a = 1, dl = 0, ds = 0) =>
  `hsla(${h.toFixed(1)}, ${clamp(s + ds, 0, 100).toFixed(1)}%, ${clamp(l + dl, 0, 100).toFixed(1)}%, ${a})`

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

/** Superellipse outline: 2 is an ellipse, higher squares off the ends into an olive barrel. */
function beadPath(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, a: number, b: number, power: number) {
  const steps = 40
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / power)
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), 2 / power)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

type Canvas2D = HTMLCanvasElement | OffscreenCanvas
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

function makeCanvas(w: number, h: number): { canvas: Canvas2D; ctx: Ctx2D } | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    return ctx ? { canvas, ctx } : null
  }
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  return ctx ? { canvas, ctx } : null
}

type Sprite = { canvas: Canvas2D; a: number; b: number }

const powerFor = (material: Material) => (material.shape === 'olive' ? 2.5 : 2)

/** Paints a bead's body, unlit, in its own frame. `scale` is device px per mm. */
function paintBody(bead: BeadSpec, material: Material, scale: number): Sprite | null {
  const a = bead.length / 2
  const b = bead.width / 2
  const pad = 1
  const w = Math.ceil((bead.length + pad * 2) * scale)
  const h = Math.ceil((bead.width + pad * 2) * scale)
  const made = makeCanvas(w, h)
  if (!made) return null
  const { canvas, ctx } = made
  const rand = seededRandom(bead.seed)
  ctx.translate(w / 2, h / 2)
  ctx.scale(scale, scale)
  const power = powerFor(material)
  beadPath(ctx, a, b, power)
  ctx.save()
  ctx.clip()
  const c = bead.hsl
  ctx.fillStyle = hsl(c)
  ctx.fillRect(-a - 1, -b - 1, a * 2 + 2, b * 2 + 2)

  switch (material.figure) {
    case 'inclusions': {
      // Amber is deeper at the rim, where the light has further to go.
      const depth = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(a, b))
      depth.addColorStop(0, hsl(c, 0.0))
      depth.addColorStop(0.65, hsl(c, 0.25, -6, 6))
      depth.addColorStop(1, hsl(c, 0.8, -16, 8))
      ctx.fillStyle = depth
      ctx.fillRect(-a, -b, a * 2, b * 2)
      // Some pieces are cloudy, butterscotch swirls through clear.
      const clouds = rand() < 0.45 ? 2 + Math.floor(rand() * 3) : 0
      for (let i = 0; i < clouds; i++) {
        const x = (rand() * 2 - 1) * a * 0.6
        const y = (rand() * 2 - 1) * b * 0.6
        const r = (0.35 + rand() * 0.45) * b
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, hsl(c, 0.32, 14, -18))
        g.addColorStop(1, hsl(c, 0, 14, -18))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(x, y, r * (1 + rand() * 0.6), r, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
      // A speck of old forest floor, and the odd bubble.
      const specks = Math.floor(rand() * 3)
      for (let i = 0; i < specks; i++) {
        ctx.fillStyle = hsl([c[0] - 10, 40, 12], 0.55 + rand() * 0.3)
        ctx.beginPath()
        ctx.ellipse((rand() * 2 - 1) * a * 0.55, (rand() * 2 - 1) * b * 0.55, 0.15 + rand() * 0.35, 0.1 + rand() * 0.2, rand() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
      const bubbles = Math.floor(rand() * 3)
      for (let i = 0; i < bubbles; i++) {
        const x = (rand() * 2 - 1) * a * 0.5
        const y = (rand() * 2 - 1) * b * 0.5
        const r = 0.12 + rand() * 0.3
        ctx.strokeStyle = hsl(c, 0.5, 22, -10)
        ctx.lineWidth = 0.08
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Now and then a fine crackle, caught inside.
      if (rand() < 0.25) {
        ctx.strokeStyle = hsl(c, 0.35, 18, -12)
        ctx.lineWidth = 0.07
        ctx.beginPath()
        let x = (rand() * 2 - 1) * a * 0.4
        let y = (rand() * 2 - 1) * b * 0.4
        ctx.moveTo(x, y)
        for (let i = 0; i < 4; i++) {
          x += (rand() * 2 - 1) * 1.6
          y += (rand() * 2 - 1) * 1.6
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      break
    }
    case 'grain': {
      // Olive wood: dark wandering lines running along the bead, closer together
      // toward the rim as the surface turns away.
      const lines = 9 + Math.floor(rand() * 6)
      const phase = rand() * Math.PI * 2
      const wobble = 0.3 + rand() * 0.5
      for (let i = 0; i < lines; i++) {
        const u = -Math.PI / 2 + ((i + rand() * 0.6) / lines) * Math.PI
        const dark = rand() < 0.35
        ctx.strokeStyle = dark ? hsl(c, 0.75, -26, 8) : hsl(c, 0.35, -12, 4)
        ctx.lineWidth = dark ? 0.35 + rand() * 0.45 : 0.15 + rand() * 0.2
        ctx.beginPath()
        for (let k = 0; k <= 24; k++) {
          const x = -a + (k / 24) * a * 2
          const v = u + Math.sin(x * 0.45 + phase + i * 0.7) * 0.18 * wobble
          const y = Math.sin(v) * b * Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(x) / a, power)) + 0.05)
          if (k === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      // The odd knot.
      if (rand() < 0.3) {
        const x = (rand() * 2 - 1) * a * 0.5
        const y = (rand() * 2 - 1) * b * 0.4
        const g = ctx.createRadialGradient(x, y, 0, x, y, 1.6)
        g.addColorStop(0, hsl(c, 0.9, -32, 10))
        g.addColorStop(1, hsl(c, 0, -32, 10))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.ellipse(x, y, 2.2, 1.3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'pores': {
      // Bone: faint streaks along the bead and a scatter of tiny pores.
      for (let i = 0; i < 7; i++) {
        const y = (rand() * 2 - 1) * b * 0.85
        ctx.strokeStyle = hsl(c, 0.12 + rand() * 0.12, -10 - rand() * 8)
        ctx.lineWidth = 0.15 + rand() * 0.35
        ctx.beginPath()
        ctx.moveTo(-a, y)
        ctx.bezierCurveTo(-a / 3, y + (rand() - 0.5), a / 3, y + (rand() - 0.5), a, y + (rand() - 0.5) * 1.5)
        ctx.stroke()
      }
      for (let i = 0; i < 28; i++) {
        ctx.fillStyle = hsl(c, 0.25 + rand() * 0.3, -30)
        ctx.beginPath()
        ctx.arc((rand() * 2 - 1) * a * 0.9, (rand() * 2 - 1) * b * 0.9, 0.05 + rand() * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
      // Bone yellows where the cord has handled it.
      for (const side of [-1, 1]) {
        const g = ctx.createRadialGradient(side * a, 0, 0, side * a, 0, a * 0.9)
        g.addColorStop(0, hsl([c[0] - 4, c[1] + 18, c[2] - 14], 0.55))
        g.addColorStop(1, hsl([c[0] - 4, c[1] + 18, c[2] - 14], 0))
        ctx.fillStyle = g
        ctx.fillRect(-a, -b, a * 2, b * 2)
      }
      break
    }
    case 'eye': {
      // Glass mati: an eye on the face of each bead, turned where the bead has turned.
      const depth = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(a, b))
      depth.addColorStop(0, hsl(c, 0, 8))
      depth.addColorStop(1, hsl(c, 0.7, -14, 6))
      ctx.fillStyle = depth
      ctx.fillRect(-a, -b, a * 2, b * 2)
      const turn = bead.turn * 0.85
      const ey = Math.sin(turn) * b * 0.62
      const squash = Math.max(0.35, Math.cos(turn))
      const ex = (rand() * 2 - 1) * a * 0.08
      const rings: [number, string][] = [
        [0.46, '#f4f2ea'],
        [0.33, '#6fb4e3'],
        [0.17, '#0e1a2b'],
      ]
      for (const [r, colour] of rings) {
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.ellipse(ex, ey, r * b * 1.02, r * b * squash, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'banding': {
      // Onyx: very faint grey bands, curved like the stone's layers.
      const phase = rand() * Math.PI * 2
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = hsl(c, 0.25 + rand() * 0.2, 9 + rand() * 6)
        ctx.lineWidth = 0.2 + rand() * 0.5
        ctx.beginPath()
        const r = b * (0.4 + i * 0.28)
        ctx.ellipse(Math.cos(phase) * a, Math.sin(phase) * b, r * 1.4, r, phase, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    }
  }

  // The drill hole: each end shades in toward the cord.
  for (const side of [-1, 1]) {
    const g = ctx.createRadialGradient(side * a, 0, 0, side * a, 0, b * 0.75)
    g.addColorStop(0, 'rgba(10, 6, 2, 0.45)')
    g.addColorStop(1, 'rgba(10, 6, 2, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-a, -b, a * 2, b * 2)
  }
  ctx.restore()
  return { canvas, a, b }
}

type Thread = { offset: number; length: number; colour: string; width: number; sway: number }

export class StrandPainter {
  private readonly strand: Strand
  private scale = 0
  private bodies: (Sprite | null)[] = []
  private papasBody: Sprite | null = null
  private readonly threads: Thread[]
  private shadow: { canvas: Canvas2D; ctx: Ctx2D } | null = null

  constructor(strand: Strand) {
    this.strand = strand
    const rand = seededRandom(strand.beads[0]?.seed ?? 1)
    const base = parseColour(strand.tassel.colour)
    this.threads = Array.from({ length: strand.tassel.threads }, (_, i) => {
      // Packed toward the middle, as a tassel is.
      const f = (i / (strand.tassel.threads - 1)) * 2 - 1
      const offset = Math.sign(f) * Math.pow(Math.abs(f), 0.8)
      const shade = rand()
      const colour = rgb(
        shade < 0.18 ? mix(base, [255, 255, 255], 0.22) : shade < 0.4 ? mix(base, [0, 0, 0], 0.25) : mix(base, [0, 0, 0], rand() * 0.1),
      )
      return { offset, length: 0.9 + rand() * 0.1, colour, width: 0.32 + rand() * 0.18, sway: (rand() * 2 - 1) * 0.6 }
    })
  }

  /** Repaints the bead bodies when the canvas's px per mm changes enough to matter. */
  private ensureBodies(scale: number) {
    if (this.bodies.length && Math.abs(scale - this.scale) / this.scale < 0.15) return
    this.scale = scale
    const m = this.strand.material
    this.bodies = this.strand.beads.map((b) => paintBody(b, m, scale))
    this.papasBody = paintBody(this.strand.papas, m, scale)
  }

  /**
   * Draws the whole strand. `ctx` is in device pixels, `scale` is device pixels
   * per mm, and `originX` is how far (mm) the world's x = 0 sits from the
   * canvas's left edge: the canvas is wider than the strand's frame, so a swing
   * is not cut off at its edges.
   */
  draw(ctx: CanvasRenderingContext2D, sim: Komboloi, scale: number, originX = 0) {
    this.ensureBodies(scale)
    const { material } = this.strand
    ctx.save()
    ctx.translate(originX * scale, 0)
    ctx.scale(scale, scale)
    this.drawShadow(ctx, sim, scale, originX)
    this.drawPegBack(ctx, sim)
    this.drawCord(ctx, sim)
    this.drawPendant(ctx, sim)
    for (let i = 0; i < sim.s.length; i++) {
      const c = sim.bead(i)
      const angle = sim.angleAt(sim.s[i])
      this.drawBead(ctx, this.bodies[i], this.strand.beads[i], material, c, angle)
    }
    this.drawPeg(ctx, sim)
    ctx.restore()
  }

  private drawShadow(ctx: CanvasRenderingContext2D, sim: Komboloi, scale: number, originX: number) {
    const w = Math.max(1, Math.ceil((sim.width + originX * 2) * scale * SHADOW_SCALE))
    const h = Math.max(1, Math.ceil(sim.height * scale * SHADOW_SCALE))
    if (!this.shadow || this.shadow.canvas.width !== w || this.shadow.canvas.height !== h) this.shadow = makeCanvas(w, h)
    if (!this.shadow) return
    const s = this.shadow.ctx
    s.setTransform(1, 0, 0, 1, 0, 0)
    s.clearRect(0, 0, w, h)
    const k = scale * SHADOW_SCALE
    s.setTransform(k, 0, 0, k, (SHADOW_OFFSET.x + originX) * k, SHADOW_OFFSET.y * k)
    if ('filter' in s) s.filter = `blur(${Math.max(1, 1.4 * k).toFixed(1)}px)`
    s.fillStyle = '#000'
    s.strokeStyle = '#000'
    s.lineCap = 'round'
    s.lineJoin = 'round'
    s.lineWidth = sim.cordRadius * 2
    s.beginPath()
    for (let i = 0; i <= sim.cord; i++) {
      const j = i % sim.cord
      if (i === 0) s.moveTo(sim.x[j], sim.y[j])
      else s.lineTo(sim.x[j], sim.y[j])
    }
    s.stroke()
    for (let i = 0; i < sim.s.length; i++) {
      const c = sim.bead(i)
      const b = this.strand.beads[i]
      s.beginPath()
      s.ellipse(c.x, c.y, b.length / 2, b.width / 2, sim.angleAt(sim.s[i]), 0, Math.PI * 2)
      s.fill()
    }
    // The pendant and tassel as one soft shape.
    const parts = sim.pendant.length
    s.lineWidth = this.strand.papas.width
    s.beginPath()
    s.moveTo(sim.x[0], sim.y[0])
    for (let i = 0; i < 3; i++) s.lineTo(sim.pendantPoint(i).x, sim.pendantPoint(i).y)
    s.stroke()
    s.lineWidth = this.strand.tassel.width * 0.7
    s.globalAlpha = 0.6
    s.beginPath()
    for (let i = 2; i < parts; i++) {
      const p = sim.pendantPoint(i)
      if (i === 2) s.moveTo(p.x, p.y)
      else s.lineTo(p.x, p.y)
    }
    s.stroke()
    s.globalAlpha = 1
    // The peg's own shadow.
    s.beginPath()
    s.arc(sim.hook.x, sim.hook.y, 7.5, 0, Math.PI * 2)
    s.fill()
    if ('filter' in s) s.filter = 'none'

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 0.2
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.shadow.canvas, 0, 0, w, h, 0, 0, w / SHADOW_SCALE, h / SHADOW_SCALE)
    ctx.restore()
  }

  private drawPegBack(ctx: CanvasRenderingContext2D, sim: Komboloi) {
    // The peg's shaft, seen end on, is behind everything; only its rosette on the
    // wall peeks out around the knob.
    const { x, y } = sim.hook
    const plate = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10)
    plate.addColorStop(0, '#d9b56a')
    plate.addColorStop(0.7, '#a07a33')
    plate.addColorStop(1, '#5e4318')
    ctx.fillStyle = plate
    ctx.beginPath()
    ctx.arc(x, y, 9.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60, 40, 10, 0.5)'
    ctx.lineWidth = 0.3
    ctx.beginPath()
    ctx.arc(x, y, 8.6, 0, Math.PI * 2)
    ctx.stroke()
  }

  private drawPeg(ctx: CanvasRenderingContext2D, sim: Komboloi) {
    // A turned brass knob on the end of the peg, in front of the cord.
    const { x, y } = sim.hook
    const r = 6.6
    const knob = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r)
    knob.addColorStop(0, '#fff3c9')
    knob.addColorStop(0.25, '#e8c574')
    knob.addColorStop(0.75, '#a77d2e')
    knob.addColorStop(1, '#6a4b14')
    ctx.fillStyle = knob
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(80, 52, 12, 0.55)'
    ctx.lineWidth = 0.35
    ctx.beginPath()
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 245, 210, 0.5)'
    ctx.lineWidth = 0.3
    ctx.beginPath()
    ctx.arc(x, y, r * 0.66, Math.PI * 1.05, Math.PI * 1.55)
    ctx.stroke()
  }

  private drawCord(ctx: CanvasRenderingContext2D, sim: Komboloi) {
    const colour = parseColour(this.strand.cordColour)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const trace = () => {
      ctx.beginPath()
      for (let i = 0; i <= sim.cord; i++) {
        const j = i % sim.cord
        if (i === 0) ctx.moveTo(sim.x[j], sim.y[j])
        else ctx.lineTo(sim.x[j], sim.y[j])
      }
    }
    // A round silk cord: dark edges, a lighter core.
    trace()
    ctx.strokeStyle = rgb(mix(colour, [0, 0, 0], 0.45))
    ctx.lineWidth = sim.cordRadius * 2
    ctx.stroke()
    trace()
    ctx.strokeStyle = rgb(mix(colour, [255, 255, 255], 0.12))
    ctx.lineWidth = sim.cordRadius * 0.9
    ctx.stroke()
  }

  private drawPendant(ctx: CanvasRenderingContext2D, sim: Komboloi) {
    const junction = { x: sim.x[0], y: sim.y[0] }
    const papas = sim.pendantPoint(0)
    const shield = sim.pendantPoint(1)
    const cap = sim.pendantPoint(2)
    const axis = Math.atan2(shield.y - junction.y, shield.x - junction.x)
    this.drawTassel(ctx, sim, cap)
    this.drawCap(ctx, shield, cap)
    this.drawShield(ctx, shield, Math.atan2(cap.y - papas.y, cap.x - papas.x))
    this.drawBead(ctx, this.papasBody, this.strand.papas, this.strand.material, papas, axis)
  }

  private drawShield(ctx: CanvasRenderingContext2D, at: Vec, axis: number) {
    const { shield, material } = this.strand
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate(axis - Math.PI / 2)
    const w = shield.width
    const h = shield.length
    if (shield.kind === 'self') {
      ctx.fillStyle = hsl(material.body, 1, -8)
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.45)
      ctx.fill()
    } else {
      const tones =
        shield.kind === 'silver' ? ['#5d6066', '#f2f3f5', '#b7bbc1', '#6f737a'] : ['#5c3f12', '#f6dc96', '#c39a45', '#6d4c17']
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
      g.addColorStop(0, tones[0])
      g.addColorStop(0.3, tones[1])
      g.addColorStop(0.55, tones[2])
      g.addColorStop(1, tones[3])
      ctx.fillStyle = g
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.3)
      ctx.fill()
      // Filigree ridges round the shield.
      ctx.strokeStyle = 'rgba(30, 20, 5, 0.35)'
      ctx.lineWidth = 0.18
      for (let i = 1; i < 3; i++) {
        const y = -h / 2 + (i / 3) * h
        ctx.beginPath()
        ctx.moveTo(-w / 2 + 0.3, y)
        ctx.lineTo(w / 2 - 0.3, y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  private drawCap(ctx: CanvasRenderingContext2D, shield: Vec, cap: Vec) {
    const colour = parseColour(this.strand.tassel.colour)
    const axis = Math.atan2(cap.y - shield.y, cap.x - shield.x) - Math.PI / 2
    const w = this.strand.tassel.width * 0.42
    const top = this.strand.shield.length / 2
    const len = Math.hypot(cap.x - shield.x, cap.y - shield.y) - top + 3.5
    ctx.save()
    ctx.translate(shield.x, shield.y)
    ctx.rotate(axis)
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, rgb(mix(colour, [0, 0, 0], 0.5)))
    g.addColorStop(0.35, rgb(mix(colour, [255, 255, 255], 0.15)))
    g.addColorStop(1, rgb(mix(colour, [0, 0, 0], 0.4)))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-w * 0.32, top)
    ctx.quadraticCurveTo(-w * 0.62, top + len * 0.6, -w / 2, top + len)
    ctx.lineTo(w / 2, top + len)
    ctx.quadraticCurveTo(w * 0.62, top + len * 0.6, w * 0.32, top)
    ctx.closePath()
    ctx.fill()
    // Wraps of thread binding the tassel's neck.
    ctx.strokeStyle = rgb(mix(colour, [0, 0, 0], 0.55))
    ctx.lineWidth = 0.22
    for (let i = 1; i < 5; i++) {
      const y = top + (len * i) / 5
      const half = w * (0.36 + 0.14 * (i / 5))
      ctx.beginPath()
      ctx.moveTo(-half, y)
      ctx.quadraticCurveTo(0, y + 0.5, half, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawTassel(ctx: CanvasRenderingContext2D, sim: Komboloi, cap: Vec) {
    const spine: Vec[] = [cap]
    for (let i = 3; i < sim.pendant.length; i++) spine.push(sim.pendantPoint(i))
    // Arc length down the spine, so threads are measured, not stretched.
    const cum = [0]
    for (let i = 1; i < spine.length; i++) cum.push(cum[i - 1] + Math.hypot(spine[i].x - spine[i - 1].x, spine[i].y - spine[i - 1].y))
    const total = cum[cum.length - 1] || 1
    const sample = (u: number): { p: Vec; n: Vec } => {
      const want = u * total
      let i = 1
      while (i < cum.length - 1 && cum[i] < want) i++
      const t = (want - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
      const a = spine[i - 1]
      const b = spine[i]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      return { p: { x: a.x + dx * t, y: a.y + dy * t }, n: { x: -dy / len, y: dx / len } }
    }
    const half = this.strand.tassel.width / 2
    const steps = 9
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const thread of this.threads) {
      ctx.strokeStyle = thread.colour
      ctx.lineWidth = thread.width
      ctx.beginPath()
      for (let k = 0; k <= steps; k++) {
        const u = (k / steps) * thread.length
        const { p, n } = sample(Math.min(1, u))
        const spread = half * (0.28 + 0.72 * Math.pow(u, 0.65))
        const off = thread.offset * spread + thread.sway * u * u
        const x = p.x + n.x * off
        const y = p.y + n.y * off
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // Silk catches the light down the near side.
    const sheen = sample(0.35)
    const g = ctx.createRadialGradient(sheen.p.x - half * 0.3, sheen.p.y, 0, sheen.p.x, sheen.p.y, half * 1.3)
    g.addColorStop(0, 'rgba(255, 250, 235, 0.16)')
    g.addColorStop(1, 'rgba(255, 250, 235, 0)')
    ctx.fillStyle = g
    ctx.fillRect(sheen.p.x - half * 1.5, sheen.p.y - total * 0.6, half * 3, total * 1.2)
  }

  private drawBead(ctx: CanvasRenderingContext2D, body: Sprite | null, bead: BeadSpec, material: Material, at: Vec, angle: number) {
    const a = bead.length / 2
    const b = bead.width / 2
    const r = Math.max(a, b)
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate(angle)
    beadPath(ctx, a, b, powerFor(material))
    if (body) {
      const pad = 1
      ctx.drawImage(body.canvas, -a - pad, -b - pad, bead.length + pad * 2, bead.width + pad * 2)
    } else {
      ctx.fillStyle = hsl(bead.hsl)
      ctx.fill()
    }
    ctx.clip()
    // Back into the room's frame for the light.
    ctx.rotate(-angle)
    const lx = LIGHT.x * r
    const ly = LIGHT.y * r

    // Form: falling away from the light.
    const shade = ctx.createRadialGradient(lx * 0.45, ly * 0.45, r * 0.1, 0, 0, r * 1.15)
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    shade.addColorStop(0.6, 'rgba(0, 0, 0, 0.08)')
    shade.addColorStop(1, `rgba(0, 0, 0, ${0.62 - material.translucency * 0.22})`)
    ctx.fillStyle = shade
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)

    // Light through the bead, gathering on the far side.
    if (material.translucency > 0.2) {
      const gx = -lx * 0.48
      const gy = -ly * 0.48
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.62)
      glow.addColorStop(0, hsl(bead.hsl, 0.5 * material.translucency, 12, 4))
      glow.addColorStop(1, hsl(bead.hsl, 0, 12, 4))
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = glow
      ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
      ctx.globalCompositeOperation = 'source-over'
    }

    // Broad sheen, then the hard glint of a polished surface.
    const sheen = ctx.createRadialGradient(lx * 0.55, ly * 0.55, 0, lx * 0.55, ly * 0.55, r * 0.75)
    sheen.addColorStop(0, `rgba(255, 252, 240, ${0.22 + material.gloss * 0.14})`)
    sheen.addColorStop(1, 'rgba(255, 252, 240, 0)')
    ctx.fillStyle = sheen
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
    if (material.gloss > 0.3) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + material.gloss * 0.55})`
      ctx.beginPath()
      ctx.ellipse(lx * 0.56, ly * 0.56, r * 0.17, r * 0.1, Math.atan2(ly, lx) + Math.PI / 2, 0, Math.PI * 2)
      ctx.fill()
      // A window's reflection along the lower rim.
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * material.gloss})`
      ctx.lineWidth = r * 0.08
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.82, Math.PI * 0.15, Math.PI * 0.55)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

type Rgb = [number, number, number]

/** Reads #rgb, #rrggbb or rgb(); anything else falls back to a deep red. */
export function parseColour(colour: string): Rgb {
  const hex = colour.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const fn = colour.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i)
  if (fn) return [Number(fn[1]), Number(fn[2]), Number(fn[3])]
  return [122, 31, 31]
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function rgb(c: Rgb): string {
  return `rgb(${c.map((v) => Math.round(clamp(v, 0, 255))).join(', ')})`
}
