import { seededRandom, type Point } from 'object-studies-core'
import { type BeadBody, type Canvas2D, bakeBead, beadExponent, traceBead } from './beadTexture.js'
import { BLACK, WHITE, hsla, mix, parseColour, rgb } from './colour.js'
import type { Material } from './materials.js'
import { CORD_RADIUS, type StrandPose } from './simulation.js'
import type { Bead, Strand } from './strand.js'

/** The key light, up and to the left, as a unit-ish vector. */
const LIGHT = { x: -0.62, y: -0.78 }
/** Where the strand's shadow falls on the wall, millimetres. */
const SHADOW_OFFSET = { x: 2.6, y: 4.2 }

type Thread = { offset: number; length: number; colour: string; width: number; sway: number }

/** Samples the tassel's centre line by arc length, from the cap (0) to the last link (1). */
type Spine = ((t: number) => { p: Point; n: Point }) & { total: number }

/**
 * Draws a strand onto a 2D canvas whose transform maps millimetres to device
 * pixels. Bead bodies are baked once per scale; light and gloss are drawn live.
 */
export class StrandPainter {
  readonly strand: Strand
  private scale = 0
  private bodies: (BeadBody | null)[] = []
  private papasBody: BeadBody | null = null
  private readonly threads: Thread[]

  constructor(strand: Strand) {
    this.strand = strand
    const random = seededRandom(strand.beads[0]?.seed ?? 1)
    const base = parseColour(strand.tassel.colour)
    const count = strand.tassel.threads
    this.threads = Array.from({ length: count }, (_, i) => {
      const across = (i / (count - 1)) * 2 - 1
      const offset = Math.sign(across) * Math.abs(across) ** 0.8
      const shade = random()
      const colour = rgb(
        shade < 0.18 ? mix(base, WHITE, 0.22) : shade < 0.4 ? mix(base, BLACK, 0.25) : mix(base, BLACK, random() * 0.1),
      )
      return {
        offset,
        length: 0.9 + random() * 0.1,
        colour,
        width: 0.32 + random() * 0.18,
        sway: (random() * 2 - 1) * 0.6,
      }
    })
  }

  /** Bakes bead bodies for `scale` device pixels per millimetre, unless close enough ones exist. */
  ensureBodies(scale: number): void {
    if (this.bodies.length && Math.abs(scale - this.scale) / this.scale < 0.15) return
    this.scale = scale
    const material = this.strand.material
    this.bodies = this.strand.beads.map((bead) => bakeBead(bead, material, scale))
    this.papasBody = bakeBead(this.strand.papas, material, scale)
  }

  /** `offset` shifts the strand right by that many millimetres, to centre it in a wider canvas. */
  draw(ctx: Canvas2D, pose: StrandPose, scale: number, offset = 0): void {
    this.ensureBodies(scale)
    const { material } = this.strand
    ctx.save()
    ctx.translate(offset * scale, 0)
    ctx.scale(scale, scale)
    this.drawPegBack(ctx, pose)
    this.drawCord(ctx, pose)
    this.drawPendant(ctx, pose)
    for (let n = 0; n < pose.s.length; n++) {
      this.drawBead(ctx, this.bodies[n], this.strand.beads[n], material, pose.bead(n), pose.angleAt(pose.s[n]))
    }
    this.drawPeg(ctx, pose)
    ctx.restore()
  }

  /**
   * Solid silhouettes for the shadow layer: a small canvas the browser
   * upscales when it composites, which softens the edge for free. Its opacity
   * is set in CSS. `sx` and `sy` are that canvas's pixels per millimetre.
   */
  drawShadow(ctx: Canvas2D, pose: StrandPose, sx: number, sy: number, offset: number): void {
    const canvas = ctx.canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(sx, 0, 0, sy, (offset + SHADOW_OFFSET.x) * sx, SHADOW_OFFSET.y * sy)
    ctx.fillStyle = '#000'
    ctx.strokeStyle = '#000'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(pose.hook.x, pose.hook.y, 7.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = CORD_RADIUS * 2
    ctx.beginPath()
    for (let i = 0; i <= pose.cord; i++) {
      const k = i % pose.cord
      if (i === 0) ctx.moveTo(pose.x[k], pose.y[k])
      else ctx.lineTo(pose.x[k], pose.y[k])
    }
    ctx.stroke()
    ctx.beginPath()
    for (let n = 0; n < pose.s.length; n++) {
      const p = pose.bead(n)
      const bead = this.strand.beads[n]
      const angle = pose.angleAt(pose.s[n])
      const a = bead.length / 2
      ctx.moveTo(p.x + Math.cos(angle) * a, p.y + Math.sin(angle) * a)
      ctx.ellipse(p.x, p.y, a, bead.width / 2, angle, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.lineWidth = this.strand.papas.width
    ctx.beginPath()
    ctx.moveTo(pose.x[0], pose.y[0])
    for (let i = 0; i < 3; i++) ctx.lineTo(pose.pendantPoint(i).x, pose.pendantPoint(i).y)
    ctx.stroke()
    const spine = this.spine(pose)
    const half = this.strand.tassel.width / 2
    const edges: [number, number, number, number][] = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const { p, n } = spine(t)
      const w = half * (0.28 + 0.72 * t ** 0.65) * 0.95
      edges.push([p.x + n.x * w, p.y + n.y * w, p.x - n.x * w, p.y - n.y * w])
    }
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(edges[0][0], edges[0][1])
    for (let i = 1; i < edges.length; i++) ctx.lineTo(edges[i][0], edges[i][1])
    for (let i = edges.length - 1; i >= 0; i--) ctx.lineTo(edges[i][2], edges[i][3])
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }

  private spine(pose: StrandPose): Spine {
    const points = [pose.pendantPoint(2)]
    for (let i = 3; i < pose.pendant.length; i++) points.push(pose.pendantPoint(i))
    const arc = [0]
    for (let i = 1; i < points.length; i++)
      arc.push(arc[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
    const total = arc[arc.length - 1] || 1
    const sample = (t: number) => {
      const target = t * total
      let i = 1
      while (i < arc.length - 1 && arc[i] < target) i++
      const f = (target - arc[i - 1]) / (arc[i] - arc[i - 1] || 1)
      const a = points[i - 1]
      const b = points[i]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      return { p: { x: a.x + dx * f, y: a.y + dy * f }, n: { x: -dy / d, y: dx / d } }
    }
    return Object.assign(sample, { total })
  }

  private drawPegBack(ctx: Canvas2D, pose: StrandPose): void {
    const { x, y } = pose.hook
    const rosette = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 10)
    rosette.addColorStop(0, '#d9b56a')
    rosette.addColorStop(0.7, '#a07a33')
    rosette.addColorStop(1, '#5e4318')
    ctx.fillStyle = rosette
    ctx.beginPath()
    ctx.arc(x, y, 9.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60, 40, 10, 0.5)'
    ctx.lineWidth = 0.3
    ctx.beginPath()
    ctx.arc(x, y, 8.6, 0, Math.PI * 2)
    ctx.stroke()
  }

  private drawPeg(ctx: Canvas2D, pose: StrandPose): void {
    const { x, y } = pose.hook
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

  private drawCord(ctx: Canvas2D, pose: StrandPose): void {
    const colour = parseColour(this.strand.cordColour)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const trace = () => {
      ctx.beginPath()
      for (let i = 0; i <= pose.cord; i++) {
        const k = i % pose.cord
        if (i === 0) ctx.moveTo(pose.x[k], pose.y[k])
        else ctx.lineTo(pose.x[k], pose.y[k])
      }
    }
    trace()
    ctx.strokeStyle = rgb(mix(colour, BLACK, 0.45))
    ctx.lineWidth = CORD_RADIUS * 2
    ctx.stroke()
    trace()
    ctx.strokeStyle = rgb(mix(colour, WHITE, 0.12))
    ctx.lineWidth = CORD_RADIUS * 0.9
    ctx.stroke()
  }

  private drawPendant(ctx: Canvas2D, pose: StrandPose): void {
    const knot = { x: pose.x[0], y: pose.y[0] }
    const papas = pose.pendantPoint(0)
    const shield = pose.pendantPoint(1)
    const cap = pose.pendantPoint(2)
    this.drawTassel(ctx, pose)
    this.drawCap(ctx, shield, cap)
    this.drawShield(ctx, shield, Math.atan2(cap.y - papas.y, cap.x - papas.x))
    this.drawBead(
      ctx,
      this.papasBody,
      this.strand.papas,
      this.strand.material,
      papas,
      Math.atan2(shield.y - knot.y, shield.x - knot.x),
    )
  }

  private drawShield(ctx: Canvas2D, at: Point, angle: number): void {
    const { shield, material } = this.strand
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate(angle - Math.PI / 2)
    const w = shield.width
    const h = shield.length
    if (shield.kind === 'self') {
      ctx.fillStyle = hsla(material.body, 1, -8)
      roundedRect(ctx, -w / 2, -h / 2, w, h, h * 0.45)
      ctx.fill()
    } else {
      const stops =
        shield.kind === 'silver'
          ? ['#5d6066', '#f2f3f5', '#b7bbc1', '#6f737a']
          : ['#5c3f12', '#f6dc96', '#c39a45', '#6d4c17']
      const metal = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
      metal.addColorStop(0, stops[0])
      metal.addColorStop(0.3, stops[1])
      metal.addColorStop(0.55, stops[2])
      metal.addColorStop(1, stops[3])
      ctx.fillStyle = metal
      roundedRect(ctx, -w / 2, -h / 2, w, h, h * 0.3)
      ctx.fill()
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

  /** The wrapped thread cap that gathers the tassel under the shield. */
  private drawCap(ctx: Canvas2D, from: Point, to: Point): void {
    const colour = parseColour(this.strand.tassel.colour)
    const angle = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2
    const w = this.strand.tassel.width * 0.42
    const top = this.strand.shield.length / 2
    const length = Math.hypot(to.x - from.x, to.y - from.y) - top + 3.5
    ctx.save()
    ctx.translate(from.x, from.y)
    ctx.rotate(angle)
    const wrap = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    wrap.addColorStop(0, rgb(mix(colour, BLACK, 0.5)))
    wrap.addColorStop(0.35, rgb(mix(colour, WHITE, 0.15)))
    wrap.addColorStop(1, rgb(mix(colour, BLACK, 0.4)))
    ctx.fillStyle = wrap
    ctx.beginPath()
    ctx.moveTo(-w * 0.32, top)
    ctx.quadraticCurveTo(-w * 0.62, top + length * 0.6, -w / 2, top + length)
    ctx.lineTo(w / 2, top + length)
    ctx.quadraticCurveTo(w * 0.62, top + length * 0.6, w * 0.32, top)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = rgb(mix(colour, BLACK, 0.55))
    ctx.lineWidth = 0.22
    for (let i = 1; i < 5; i++) {
      const y = top + (length * i) / 5
      const r = w * (0.36 + (i / 5) * 0.14)
      ctx.beginPath()
      ctx.moveTo(-r, y)
      ctx.quadraticCurveTo(0, y + 0.5, r, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawTassel(ctx: Canvas2D, pose: StrandPose): void {
    const spine = this.spine(pose)
    const total = spine.total
    const half = this.strand.tassel.width / 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const thread of this.threads) {
      ctx.strokeStyle = thread.colour
      ctx.lineWidth = thread.width
      ctx.beginPath()
      for (let i = 0; i <= 9; i++) {
        const t = (i / 9) * thread.length
        const { p, n } = spine(Math.min(1, t))
        const spread = half * (0.28 + 0.72 * t ** 0.65)
        const off = thread.offset * spread + thread.sway * t * t
        const x = p.x + n.x * off
        const y = p.y + n.y * off
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // Silk sheen. It lands only on what's already drawn (the tassel is the
    // first thing painted in this area), so it can't haze a dark wall.
    const mid = spine(0.35)
    const sheen = ctx.createRadialGradient(mid.p.x - half * 0.3, mid.p.y, 0, mid.p.x, mid.p.y, half * 1.3)
    sheen.addColorStop(0, 'rgba(255, 250, 235, 0.16)')
    sheen.addColorStop(1, 'rgba(255, 250, 235, 0)')
    ctx.fillStyle = sheen
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillRect(mid.p.x - half * 1.5, mid.p.y - total * 0.6, half * 3, total * 1.2)
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawBead(
    ctx: Canvas2D,
    body: BeadBody | null,
    bead: Bead,
    material: Material,
    at: Point,
    angle: number,
  ): void {
    const a = bead.length / 2
    const b = bead.width / 2
    const r = Math.max(a, b)
    ctx.save()
    ctx.translate(at.x, at.y)
    ctx.rotate(angle)
    traceBead(ctx, a, b, beadExponent(material))
    if (body) ctx.drawImage(body.canvas, -a - 1, -b - 1, bead.length + 2, bead.width + 2)
    else {
      ctx.fillStyle = hsla(bead.hsl)
      ctx.fill()
    }
    ctx.clip()
    // Light stays fixed to the room while the bead turns.
    ctx.rotate(-angle)
    const lx = LIGHT.x * r
    const ly = LIGHT.y * r
    const shade = ctx.createRadialGradient(lx * 0.45, ly * 0.45, r * 0.1, 0, 0, r * 1.15)
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    shade.addColorStop(0.6, 'rgba(0, 0, 0, 0.08)')
    shade.addColorStop(1, `rgba(0, 0, 0, ${0.62 - material.translucency * 0.22})`)
    ctx.fillStyle = shade
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
    if (material.translucency > 0.2) {
      // Light passing through glows on the far side.
      const gx = -lx * 0.48
      const gy = -ly * 0.48
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.62)
      glow.addColorStop(0, hsla(bead.hsl, 0.5 * material.translucency, 12, 4))
      glow.addColorStop(1, hsla(bead.hsl, 0, 12, 4))
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = glow
      ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
      ctx.globalCompositeOperation = 'source-over'
    }
    const bloom = ctx.createRadialGradient(lx * 0.55, ly * 0.55, 0, lx * 0.55, ly * 0.55, r * 0.75)
    bloom.addColorStop(0, `rgba(255, 252, 240, ${0.22 + material.gloss * 0.14})`)
    bloom.addColorStop(1, 'rgba(255, 252, 240, 0)')
    ctx.fillStyle = bloom
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
    if (material.gloss > 0.3) {
      // A window highlight and a faint rim of reflected light.
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + material.gloss * 0.55})`
      ctx.beginPath()
      ctx.ellipse(lx * 0.56, ly * 0.56, r * 0.17, r * 0.1, Math.atan2(ly, lx) + Math.PI / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * material.gloss})`
      ctx.lineWidth = r * 0.08
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.82, Math.PI * 0.15, Math.PI * 0.55)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function roundedRect(ctx: Canvas2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
