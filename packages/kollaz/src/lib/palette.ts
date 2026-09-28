import { createRng } from './rng.js'

export const GLITTERS = [
  { id: 'gold', base: '#d8a531', deep: '#6f4c0c' },
  { id: 'silver', base: '#cfd6de', deep: '#56616d' },
  { id: 'pink', base: '#ec5ca6', deep: '#7a1c48' },
  { id: 'teal', base: '#35b8c6', deep: '#0d525b' },
] as const

/** Construction paper for a new sheet. Frozen: every table reads it, and it is exported. */
export const PAPERS = Object.freeze([
  Object.freeze({ id: 'cobalt', label: 'Cobalt', color: '#2f4f9e' } as const),
  Object.freeze({ id: 'black', label: 'Black', color: '#26262b' } as const),
  Object.freeze({ id: 'tomato', label: 'Tomato', color: '#c7433a' } as const),
  Object.freeze({ id: 'sunflower', label: 'Sunflower', color: '#e6b23a' } as const),
  Object.freeze({ id: 'kraft', label: 'Kraft', color: '#b58958' } as const),
] as const)

export const SHADES = 10

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}
// Each glitter gets a ramp: deep shadow, base colour, then a white-hot glint.
export const RAMPS = GLITTERS.map(({ base, deep }) =>
  Array.from({ length: SHADES }, (_, i) => {
    const t = i / (SHADES - 1)
    return t < 0.62 ? mix(deep, base, t / 0.62) : mix(base, '#ffffff', (t - 0.62) / 0.38)
  }),
)

// Glitter seen through the shaker's clear tube, painted with the same flake ramp.
const textures = new Map<number, string>()
export function glitterTexture(index: number) {
  const cached = textures.get(index)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 48
  const ctx = canvas.getContext('2d')!
  const rng = createRng(90 + index)
  ctx.fillStyle = RAMPS[index][1]
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 1500; i++) {
    const shade = Math.min(SHADES - 1, Math.floor(Math.pow(rng(), 1.8) * SHADES + (rng() < 0.05 ? 4 : 0)))
    ctx.fillStyle = RAMPS[index][shade]
    const x = rng() * canvas.width
    const y = rng() * canvas.height
    const s = 1 + rng() * 1.6
    ctx.save(); ctx.translate(x, y); ctx.rotate(rng() * Math.PI); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore()
  }
  const url = canvas.toDataURL()
  textures.set(index, url)
  return url
}

