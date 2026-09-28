// Canvas-painted textures shared by the table and the objects in the caddy.
import { createRng } from './rng.js'

export const POM_COLORS = ['#e2483d', '#f28a2e', '#f4c534', '#4bb35a', '#3f7fe0', '#ef6fae', '#8e5bd6', '#f3efe6']
export const INK = { label: 'Chalk white', rgb: [246, 240, 228] as const }
export const STAMP_RADIUS = 46

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const shade = (c: string, k: number) => {
  const [r, g, b] = hex(c)
  const f = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`
}

/**
 * A pom pom: a ball of matte yarn fibres. Fabric scatters light instead of reflecting
 * it, so there is no hotspot or sheen: just the dye colour, fibre-to-fibre variation,
 * a little depth where fibres fall away toward the rim, and stray wisps that break the
 * silhouette. Radius 36 in a 96px sprite.
 */
export const POM_SPRITE = { size: 96, radius: 36 }
const pomCache = new Map<number, HTMLCanvasElement>()
export function pomSprite(color: number) {
  const cached = pomCache.get(color)
  if (cached) return cached
  const { size, radius: R } = POM_SPRITE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const base = POM_COLORS[color]
  // Core: the shadowed depths between fibres, centred, with no lit side.
  const core = ctx.createRadialGradient(c, c, R * 0.1, c, c, R)
  core.addColorStop(0, shade(base, -0.12))
  core.addColorStop(0.7, shade(base, -0.28))
  core.addColorStop(1, shade(base, -0.45))
  ctx.fillStyle = core
  ctx.beginPath(); ctx.arc(c, c, R * 0.9, 0, Math.PI * 2); ctx.fill()

  const rng = createRng(300 + color)
  ctx.lineCap = 'round'
  // Fibres, drawn from the rim inward so the nearest ones sit on top.
  const fibres = Array.from({ length: 2800 }, () => {
    const a = rng() * Math.PI * 2
    const d = Math.pow(rng(), 0.6) * R * 0.97
    return { a, d, x: c + Math.cos(a) * d, y: c + Math.sin(a) * d, r1: rng(), r2: rng(), r3: rng(), r4: rng() }
  }).sort((p, q) => q.d - p.d)
  for (const f of fibres) {
    // Matte: only a very soft diffuse falloff from the room light, plus the rim receding.
    const lit = -((f.x - c) + (f.y - c)) / (2 * R)
    const rim = f.d / R
    const k = Math.max(-0.45, Math.min(0.12, lit * 0.1 + (f.r1 - 0.5) * 0.22 - rim * rim * 0.22))
    const dir = f.a + (f.r2 - 0.5) * 1.6
    const len = 3 + f.r3 * 4.5 + rim * 3.5
    ctx.strokeStyle = shade(base, k)
    ctx.globalAlpha = 0.6 + f.r4 * 0.4
    ctx.lineWidth = 0.65 + f.r4 * 0.55
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(dir) * len, f.y + Math.sin(dir) * len); ctx.stroke()
  }
  // Stray wisps past the silhouette.
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2
    const d = R * (0.82 + rng() * 0.12)
    const x = c + Math.cos(a) * d
    const y = c + Math.sin(a) * d
    const dir = a + (rng() - 0.5) * 0.9
    const len = 4 + rng() * 6
    ctx.strokeStyle = shade(base, -0.1 - rng() * 0.25)
    ctx.globalAlpha = 0.35 + rng() * 0.35
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + Math.cos(dir + 0.4) * len * 0.6, y + Math.sin(dir + 0.4) * len * 0.6, x + Math.cos(dir) * len, y + Math.sin(dir) * len)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  pomCache.set(color, canvas)
  return canvas
}

const urlCache = new Map<string, string>()
export const pomUrl = (color: number) => {
  const key = `pom-${color}`
  if (!urlCache.has(key)) urlCache.set(key, pomSprite(color).toDataURL())
  return urlCache.get(key)!
}

/** The rubber stamp's design: a club seal with a star, drawn at any radius. */
export function drawStampDesign(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = r * 0.07
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2); ctx.stroke()
  ctx.lineWidth = r * 0.035
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.stroke()
  const text = 'KOLLAZ · CRAFT CLUB · FIRST PRIZE · '
  ctx.font = `800 ${r * 0.2}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const step = (Math.PI * 2) / text.length
  for (let i = 0; i < text.length; i++) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(i * step - Math.PI / 2)
    ctx.translate(0, -r * 0.78)
    ctx.fillText(text[i], 0, 0)
    ctx.restore()
  }
  ctx.beginPath()
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const d = i % 2 === 0 ? r * 0.44 : r * 0.19
    const x = cx + Math.cos(a) * d
    const y = cy + Math.sin(a) * d
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export const stampLabelUrl = () => {
  if (!urlCache.has('stamp')) {
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 96
    drawStampDesign(canvas.getContext('2d')!, 48, 48, 44, '#3a3230')
    urlCache.set('stamp', canvas.toDataURL())
  }
  return urlCache.get('stamp')!
}

/** Holographic sequins seen through the lid of their tub. */
export const sequinTubUrl = () => {
  if (!urlCache.has('sequins')) {
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 96
    const ctx = canvas.getContext('2d')!
    const rng = createRng(77)
    ctx.fillStyle = '#b9bec6'
    ctx.fillRect(0, 0, 96, 96)
    for (let i = 0; i < 90; i++) {
      const x = rng() * 96
      const y = rng() * 96
      const tilt = rng() * 0.9
      const hue = (190 + tilt * 700) % 360
      ctx.fillStyle = `hsl(${hue}, ${8 + tilt * 45}%, ${66 + rng() * 24}%)`
      ctx.beginPath()
      ctx.ellipse(x, y, 7 * Math.cos(tilt * 0.9), 7, rng() * Math.PI, 0, Math.PI * 2)
      ctx.ellipse(x, y, 1.6 * Math.cos(tilt * 0.9), 1.6, 0, 0, Math.PI * 2)
      ctx.fill('evenodd')
      ctx.strokeStyle = 'rgba(40, 44, 52, 0.25)'
      ctx.lineWidth = 0.6
      ctx.stroke()
    }
    urlCache.set('sequins', canvas.toDataURL())
  }
  return urlCache.get('sequins')!
}

/**
 * Chenille: a twisted wire with short fibres standing out all round it. Seen from
 * above, fibres fan out either side of the wire. Matte like the pom poms: colour,
 * fibre variation and a little depth where fibres recede, no shine. The cut wire
 * shows as a small steel dot at each end. Coordinates and radius are in canvas px.
 */
export function paintChenille(
  ctx: CanvasRenderingContext2D,
  samples: { x: number; y: number; angle: number }[],
  color: string,
  radius: number,
  seed: number,
) {
  const rng = createRng(seed)
  ctx.lineCap = 'round'
  // Depth first: the shadowed core the fibres grow out of.
  ctx.strokeStyle = shade(color, -0.42)
  ctx.lineWidth = radius * 1.2
  ctx.beginPath()
  samples.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.stroke()
  for (const p of samples) {
    for (let f = 0; f < 9; f++) {
      const side = f % 2 ? 1 : -1
      const spread = (rng() - 0.5) * 2.2
      const a = p.angle + side * Math.PI / 2 + spread * 0.55
      const len = radius * (0.55 + rng() * 0.6)
      const k = Math.max(-0.4, Math.min(0.12, (rng() - 0.5) * 0.3 - Math.abs(spread) * 0.12))
      ctx.strokeStyle = shade(color, k)
      ctx.globalAlpha = 0.7 + rng() * 0.3
      ctx.lineWidth = Math.max(0.6, radius * 0.11)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  // Cut wire ends.
  for (const p of [samples[0], samples[samples.length - 1]]) {
    if (!p) continue
    const g = ctx.createRadialGradient(p.x - radius * 0.1, p.y - radius * 0.1, 0, p.x, p.y, radius * 0.28)
    g.addColorStop(0, '#f2f4f5')
    g.addColorStop(1, '#8a9296')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(p.x, p.y, radius * 0.24, 0, Math.PI * 2); ctx.fill()
  }
}

/** Permanent marker: dense ink with a faint bleed where it soaks into the paper. */
export const MARKER_INK = '#16161a'
export const MARKER_WIDTH = 5
export function paintMarkerSegment(ctx: CanvasRenderingContext2D, k: number, a: { x: number; y: number }, b: { x: number; y: number }) {
  ctx.save()
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(22, 22, 26, 0.16)'
  ctx.lineWidth = MARKER_WIDTH + 1.6
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  ctx.strokeStyle = MARKER_INK
  ctx.lineWidth = MARKER_WIDTH
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
  ctx.restore()
}

// Crepe texture for masking tape: faint crinkles running across the strip.
let crepe: HTMLCanvasElement | null = null
function crepeTile() {
  if (crepe) return crepe
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')!
  const rng = createRng(61)
  for (let x = 0; x < 64; x += 1 + rng() * 2.2) {
    g.strokeStyle = `rgba(110, 90, 50, ${0.04 + rng() * 0.07})`
    g.lineWidth = 0.6 + rng() * 0.6
    g.beginPath()
    g.moveTo(x, 0)
    g.bezierCurveTo(x + (rng() - 0.5) * 3, 21, x + (rng() - 0.5) * 3, 42, x, 64)
    g.stroke()
  }
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(110, 90, 50, 0.08)'
    g.fillRect(rng() * 64, rng() * 64, 0.8, 0.8)
  }
  crepe = c
  return c
}

/**
 * Paint a strip of masking tape into a canvas layer. `outline` is in strip space
 * (x along the strip from 0, y across it centred on 0); `k` is canvas px per unit.
 */
export function paintTapeStrip(
  ctx: CanvasRenderingContext2D, k: number,
  strip: { x1: number; y1: number; x2: number; y2: number },
  outline: { x: number; y: number }[], width: number,
) {
  const angle = Math.atan2(strip.y2 - strip.y1, strip.x2 - strip.x1)
  const shape = new Path2D()
  outline.forEach((p, i) => (i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y)))
  shape.closePath()
  ctx.save()
  ctx.setTransform(k, 0, 0, k, 0, 0)
  ctx.translate(strip.x1, strip.y1)
  ctx.rotate(angle)
  // Contact shadow: tape is thin, so it barely lifts off the page.
  ctx.shadowColor = 'rgba(40, 30, 10, 0.22)'
  ctx.shadowBlur = 1.6 * k
  ctx.shadowOffsetX = 0.4 * k
  ctx.shadowOffsetY = 0.9 * k
  ctx.fillStyle = 'rgba(236, 226, 196, 0.86)'
  ctx.fill(shape)
  ctx.shadowColor = 'transparent'
  ctx.clip(shape)
  const tile = ctx.createPattern(crepeTile(), 'repeat')!
  ctx.fillStyle = tile
  ctx.fill(shape)
  const across = ctx.createLinearGradient(0, -width / 2, 0, width / 2)
  across.addColorStop(0, 'rgba(255, 255, 255, 0.22)')
  across.addColorStop(0.3, 'rgba(255, 255, 255, 0)')
  across.addColorStop(0.8, 'rgba(120, 100, 60, 0)')
  across.addColorStop(1, 'rgba(120, 100, 60, 0.12)')
  ctx.fillStyle = across
  ctx.fill(shape)
  ctx.restore()
}

const pipeCache = new Map<number, string>()
/** A straight pipe cleaner, painted with the same chenille as the real ones, for icons. */
export function pipeStemUrl(color: number) {
  const cached = pipeCache.get(color)
  if (cached) return cached
  const w = 232
  const h = 22
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const samples = []
  for (let x = 8; x <= w - 8; x += 1.2) samples.push({ x, y: h / 2 + Math.sin(x / 37 + color) * 1, angle: 0 })
  paintChenille(canvas.getContext('2d')!, samples, POM_COLORS[color], 8, 40 + color)
  const url = canvas.toDataURL()
  pipeCache.set(color, url)
  return url
}
