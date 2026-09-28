// Canvas drawing for the effects layer. Everything here is written for speed:
// settled glitter is painted once into a cached layer, and each frame only adds the
// few flakes that are catching the light.
import { GLUE_DRY_MS, filmHue, type Flake } from './glitter.js'
import { RAMPS, SHADES } from './palette.js'
import type { Pompom } from './pompom.js'
import { POM_SPRITE, pomSprite } from './sprites.js'

export type Light = { x: number; y: number; z: number }
export type Sparkle = { x: number; y: number; k: number }

const GLINT_SHININESS = 70
// Below this facing cosine a flake's highlight is invisible (0.965^70 ≈ 0.08).
const GLINT_CUTOFF = Math.pow(0.08, 1 / GLINT_SHININESS)

const baseShade = (f: Flake) => 0.08 + 0.46 * f.nz * f.nz

// No closePath: fill() closes each subpath anyway, and on a Path2D holding
// thousands of flakes Chrome's closePath costs more with every call (quadratic).
function addFlake(path: Path2D, f: Flake) {
  const h = f.size / 2
  const ux = Math.cos(f.angle) * h
  const uy = Math.sin(f.angle) * h
  path.moveTo(f.x + ux - uy, f.y + uy + ux)
  path.lineTo(f.x + ux + uy, f.y + uy - ux)
  path.lineTo(f.x - ux + uy, f.y - uy - ux)
  path.lineTo(f.x - ux - uy, f.y - uy + ux)
}

function fillBuckets(ctx: CanvasRenderingContext2D, buckets: Path2D[][], used: boolean[][]) {
  for (let c = 0; c < buckets.length; c++) {
    for (let i = 0; i < SHADES; i++) {
      if (!used[c][i]) continue
      ctx.fillStyle = RAMPS[c][i]
      ctx.fill(buckets[c][i])
    }
  }
}

const emptyBuckets = () => ({
  paths: RAMPS.map(() => Array.from({ length: SHADES }, () => new Path2D())),
  used: RAMPS.map(() => Array.from({ length: SHADES }, () => false)),
})

/** Paint flakes at their resting shade (no highlight). */
export function paintFlakes(ctx: CanvasRenderingContext2D, flakes: Flake[], from = 0, include: (f: Flake) => boolean = () => true) {
  const { paths, used } = emptyBuckets()
  for (let i = from; i < flakes.length; i++) {
    const f = flakes[i]
    if (f.hidden || !include(f)) continue
    const b = Math.floor(baseShade(f) * SHADES)
    addFlake(paths[f.color][b], f)
    used[f.color][b] = true
  }
  fillBuckets(ctx, paths, used)
}

/**
 * Overdraw only the flakes that face the light closely enough to glint.
 * A quick cosine test rejects almost every flake before any pow() is taken.
 */
export function paintGlints(ctx: CanvasRenderingContext2D, flakes: Flake[], light: Light, sparkles: Sparkle[], maxSparkles = 45) {
  const { paths, used } = emptyBuckets()
  const lz2 = light.z * light.z
  for (let i = 0; i < flakes.length; i++) {
    const f = flakes[i]
    if (f.hidden) continue
    const dx = light.x - f.x
    const dy = light.y - f.y
    const l = Math.sqrt(dx * dx + dy * dy + lz2)
    const hx = dx / l
    const hy = dy / l
    const hz = light.z / l + 1
    const d = (f.nx * hx + f.ny * hy + f.nz * hz) / Math.sqrt(hx * hx + hy * hy + hz * hz)
    if (d < GLINT_CUTOFF) continue
    const spec = Math.pow(d, GLINT_SHININESS)
    const b = Math.floor(Math.min(0.999, baseShade(f) + spec * 0.9) * SHADES)
    addFlake(paths[f.color][b], f)
    used[f.color][b] = true
    if (spec > 0.93 && sparkles.length < maxSparkles) sparkles.push({ x: f.x, y: f.y, k: spec })
  }
  fillBuckets(ctx, paths, used)
}

/** Cosine between a facet and the half vector, inlined for the sequin loop. */
function facingCos(x: number, y: number, nx: number, ny: number, nz: number, light: Light) {
  const dx = light.x - x
  const dy = light.y - y
  const l = Math.sqrt(dx * dx + dy * dy + light.z * light.z)
  const hx = dx / l
  const hy = dy / l
  const hz = light.z / l + 1
  return (nx * hx + ny * hy + nz * hz) / Math.sqrt(hx * hx + hy * hy + hz * hz)
}

/**
 * Holographic cup sequins: a tilted disc with a centre hole and a raised cup that
 * catches its own ring of light. Silver face-on, rainbow film as they tilt away.
 */
export function paintSequins(ctx: CanvasRenderingContext2D, sequins: Flake[], light: Light, sparkles: Sparkle[]) {
  for (const q of sequins) {
    if (q.hidden) continue
    const d = facingCos(q.x, q.y, q.nx, q.ny, q.nz, light)
    const spec = d > 0 ? Math.pow(d, 18) : 0
    const r = q.size / 2
    const tilt = Math.atan2(q.ny, q.nx)
    const minor = Math.max(0.35, q.nz)
    const hue = filmHue(d)
    const sat = 10 + 46 * Math.min(1, (1 - Math.max(0, d)) * 3.5)
    const lum = Math.min(95, 58 + 12 * q.nz + 30 * spec)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath(); ctx.ellipse(q.x + 0.7, q.y + 1.2, r * minor, r, tilt, 0, Math.PI * 2); ctx.fill()

    const sweep = ctx.createLinearGradient(q.x - Math.cos(tilt) * r, q.y - Math.sin(tilt) * r, q.x + Math.cos(tilt) * r, q.y + Math.sin(tilt) * r)
    sweep.addColorStop(0, `hsl(${hue}, ${sat}%, ${lum}%)`)
    sweep.addColorStop(0.55, `hsl(${(hue + 50) % 360}, ${sat * 0.8}%, ${Math.min(97, lum + 8)}%)`)
    sweep.addColorStop(1, `hsl(${(hue + 110) % 360}, ${sat}%, ${lum - 8}%)`)
    ctx.fillStyle = sweep
    const disc = new Path2D()
    disc.ellipse(q.x, q.y, r * minor, r, tilt, 0, Math.PI * 2)
    disc.ellipse(q.x, q.y, r * 0.2 * minor, r * 0.2, tilt, 0, Math.PI * 2)
    ctx.fill(disc, 'evenodd')

    // The cup: an inner ring that is lit on the side facing the light.
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 + 0.5 * spec})`
    ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.ellipse(q.x, q.y, r * 0.58 * minor, r * 0.58, tilt, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke()
    ctx.strokeStyle = 'rgba(28, 30, 40, 0.34)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.ellipse(q.x, q.y, r * minor, r, tilt, 0, Math.PI * 2); ctx.stroke()
    if (spec > 0.88 && sparkles.length < 60) sparkles.push({ x: q.x - r * 0.3, y: q.y - r * 0.3, k: 0.9 + spec * 0.08 })
  }
}

// Soft contact shadow, rendered once and stretched.
let shadowSprite: HTMLCanvasElement | null = null
function contactShadow() {
  if (shadowSprite) return shadowSprite
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(0, 0, 0, 1)')
  g.addColorStop(0.45, 'rgba(0, 0, 0, 0.55)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  shadowSprite = canvas
  return canvas
}

export function paintPompoms(ctx: CanvasRenderingContext2D, poms: Pompom[]) {
  const shadow = contactShadow()
  for (const p of poms) {
    // Two shadows: a tight dark contact patch and a wider soft cast toward the lower right.
    ctx.globalAlpha = p.stuck ? 0.5 : 0.36
    const cast = p.r * (p.stuck ? 2.2 : 2.5)
    ctx.drawImage(shadow, p.x + p.r * 0.28 - cast / 2, p.y + p.r * 0.4 - cast / 2, cast, cast)
    ctx.globalAlpha = p.stuck ? 0.55 : 0.4
    const contact = p.r * 1.5
    ctx.drawImage(shadow, p.x + p.r * 0.08 - contact / 2, p.y + p.r * 0.14 - contact / 2, contact, contact)
    ctx.globalAlpha = 1
    // Drawn unrotated: seen from above, a rolling pom pom's lighting stays fixed to the room.
    const sprite = pomSprite(p.color)
    const size = (POM_SPRITE.size * p.r) / POM_SPRITE.radius
    ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size)
  }
}

// Glint: a soft bloom and a tapered four-point star, rendered once.
let sparkleSprite: HTMLCanvasElement | null = null
function sparkle() {
  if (sparkleSprite) return sparkleSprite
  const size = 64
  const c = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const bloom = ctx.createRadialGradient(c, c, 0, c, c, c * 0.6)
  bloom.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
  bloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, size, size)
  const r = c * 0.98
  const i = r * 0.09
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  ctx.beginPath()
  ctx.moveTo(c, c - r); ctx.lineTo(c + i, c - i); ctx.lineTo(c + r, c); ctx.lineTo(c + i, c + i)
  ctx.lineTo(c, c + r); ctx.lineTo(c - i, c + i); ctx.lineTo(c - r, c); ctx.lineTo(c - i, c - i)
  ctx.closePath()
  ctx.fill()
  sparkleSprite = canvas
  return canvas
}

export function paintSparkles(ctx: CanvasRenderingContext2D, sparkles: Sparkle[]) {
  if (!sparkles.length) return
  const sprite = sparkle()
  ctx.globalCompositeOperation = 'lighter'
  for (const p of sparkles) {
    const r = 2 + (p.k - 0.9) * 42
    ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * `epoch` is how many cuts had been made when the stroke was laid (later cuts remove it).
 * `order` places it in the stacking order with cut-out pieces (later pieces cover it).
 */
export type GlueStroke = { points: { x: number; y: number; t: number }[]; path: Path2D; seed: number; epoch: number; order: number }

// Streak patterns, like the drag marks a real glue stick leaves along its stroke.
const STREAKS = [
  [34, 5, 12, 3, 58, 8, 20, 4],
  [22, 7, 46, 4, 15, 6, 70, 5],
  [52, 3, 9, 6, 31, 4, 44, 9],
]

/**
 * Glue stick film. Wet: a translucent purple layer, thicker (darker) along its edges
 * where the stick ploughs a little ridge, streaked along the stroke, with a wet
 * highlight. Dry: a clear satin film that only shows where it catches the light.
 */
export function paintGlue(
  ctx: CanvasRenderingContext2D, strokes: GlueStroke[], now: number, light: Light, width: number,
  clipFor: (stroke: GlueStroke) => Path2D | null = () => null,
) {
  const sheen = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 340)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0.035)')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const g of strokes) {
    const pts = g.points
    if (pts.length < 2) continue
    const wetness = Math.min(1, Math.max(0, 1 - (now - pts[pts.length - 1].t) / GLUE_DRY_MS))
    const w = Math.pow(wetness, 0.7)
    // Glue on paper since cut away goes with it; glue under a piece placed later is hidden.
    const clip = clipFor(g)
    ctx.save()
    if (clip) ctx.clip(clip, 'evenodd')
    paintStroke(ctx, g, w, width, sheen)
    ctx.restore()
  }
}

function paintStroke(ctx: CanvasRenderingContext2D, g: GlueStroke, w: number, width: number, sheen: CanvasGradient) {
  {
    ctx.strokeStyle = sheen
    ctx.lineWidth = width
    ctx.stroke(g.path)
    if (w <= 0) {
      // Dry film still shows its streaks faintly in the light.
      ctx.setLineDash(STREAKS[g.seed % 3])
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = width * 0.4
      ctx.stroke(g.path)
      ctx.setLineDash([])
      return
    }
    // One flat translucent film, then fine drag streaks at low contrast. No concentric
    // bands: a glue stick lays down a thin, even-ish sheet, not a tube.
    ctx.strokeStyle = `rgba(122, 66, 212, ${0.42 * w})`
    ctx.lineWidth = width
    ctx.stroke(g.path)
    const widths = [0.9, 0.66, 0.46, 0.28, 0.12]
    for (let i = 0; i < widths.length; i++) {
      ctx.setLineDash(STREAKS[(g.seed + i) % 3])
      ctx.lineDashOffset = g.seed * 13 + i * 29
      ctx.strokeStyle = i % 2 ? `rgba(84, 36, 170, ${0.1 * w})` : `rgba(214, 186, 255, ${0.11 * w})`
      ctx.lineWidth = width * widths[i]
      ctx.stroke(g.path)
    }
    // Wet highlight, broken where the film thins.
    ctx.setLineDash(STREAKS[(g.seed + 1) % 3])
    ctx.save()
    ctx.translate(-2, -2.8)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * w})`
    ctx.lineWidth = width * 0.1
    ctx.stroke(g.path)
    ctx.restore()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
  }
}
