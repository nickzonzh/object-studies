import { createRng, type Rng } from './rng.js'

export type Edge = 'top' | 'right' | 'bottom' | 'left'
export type Point = { x: number; y: number }
export type TornOutline = { outer: Point[]; inner: Point[] }

const EDGES: Edge[] = ['top', 'right', 'bottom', 'left']

// Smooth 1D value noise built from random control values.
function valueNoise(rng: Rng, controls: number) {
  const values = Array.from({ length: controls + 1 }, () => rng())
  return (t: number) => {
    const p = Math.min(Math.max(t, 0), 1) * controls
    const i = Math.min(Math.floor(p), controls - 1)
    const f = p - i
    const s = f * f * (3 - 2 * f)
    return values[i] + (values[i + 1] - values[i]) * s
  }
}

type Profile = { steps: number; outer: number[]; inner: number[] }

/**
 * Builds a torn outline for a sheet of coloured paper.
 * Tearing only ever removes paper, so every displacement points inward.
 * `outer` is the torn fibre edge (the pale paper core that shows on a real tear);
 * `inner` is the coloured face, inset a little further by an uneven rim.
 * The rim is mostly thin with occasional wide, feathered runs, and stray fibres
 * poke out past it. Straight (cut) edges have no rim, like a guillotined sheet.
 */
export function tornOutline(
  width: number,
  height: number,
  seed: number,
  torn: Edge[] = EDGES,
  amplitude = 9,
): TornOutline {
  const profiles: Profile[] = EDGES.map((edge, index) => {
    const rng = createRng(seed * 31 + index * 977)
    const length = edge === 'top' || edge === 'bottom' ? width : height
    if (!torn.includes(edge)) return { steps: 1, outer: [0, 0], inner: [0, 0] }
    const steps = Math.max(12, Math.round(length / 3))
    const low = valueNoise(rng, Math.max(2, Math.round(length / 90)))
    const mid = valueNoise(rng, Math.max(3, Math.round(length / 26)))
    const rim = valueNoise(rng, Math.max(3, Math.round(length / 34)))
    const outer: number[] = []
    const inner: number[] = []
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const depth = amplitude * (0.55 * low(t) + 0.33 * mid(t) + 0.12 * rng())
      // Loose fibres stand proud of the tear line.
      const fibre = rng() < 0.22 ? rng() * 1.6 : 0
      const rimWidth = 0.45 + 4.6 * Math.pow(rim(t), 2.2) + 0.5 * rng()
      outer.push(Math.max(0, depth - fibre))
      inner.push(depth + rimWidth)
    }
    return { steps, outer, inner }
  })

  const [top, right, bottom, left] = profiles
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
  const last = (a: number[]) => a[a.length - 1]

  // Corners are reconciled against the neighbouring edge, so neither layer
  // pokes a spike out past the other at the corners.
  const build = (layer: 'outer' | 'inner') => {
    const points: Point[] = []
    for (let s = 0; s < top.steps; s++) {
      const t = s / top.steps
      points.push({ x: clamp(t * width, last(left[layer]), width - right[layer][0]), y: top[layer][s] })
    }
    for (let s = 0; s < right.steps; s++) {
      const t = s / right.steps
      points.push({ x: width - right[layer][s], y: clamp(t * height, last(top[layer]), height - bottom[layer][0]) })
    }
    for (let s = 0; s < bottom.steps; s++) {
      const t = s / bottom.steps
      points.push({ x: clamp(width - t * width, left[layer][0], width - last(right[layer])), y: height - bottom[layer][s] })
    }
    for (let s = 0; s < left.steps; s++) {
      const t = s / left.steps
      points.push({ x: left[layer][s], y: clamp(height - t * height, top[layer][0], height - last(bottom[layer])) })
    }
    return points
  }

  return { outer: build('outer'), inner: build('inner') }
}

export function toClipPath(points: Point[], width: number, height: number) {
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`
  return `polygon(${points.map((p) => `${pct(p.x, width)} ${pct(p.y, height)}`).join(', ')})`
}
