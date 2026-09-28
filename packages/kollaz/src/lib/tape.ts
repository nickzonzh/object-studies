import { createRng } from './rng.js'
import type { Point } from './tornEdge.js'

/** Masking tape is about 2 cm wide. */
export const TAPE_WIDTH = 40

export type TapeStrip = { id: number; x1: number; y1: number; x2: number; y2: number; seed: number }

export const tapeLength = (t: Pick<TapeStrip, 'x1' | 'y1' | 'x2' | 'y2'>) => Math.hypot(t.x2 - t.x1, t.y2 - t.y1)

/**
 * The outline of a strip of masking tape laid along the x axis from 0 to `length`,
 * centred on y = 0. Long edges are straight (the roll's slit edges); the ends are torn
 * off by hand into a ragged row of small teeth.
 */
export function tapeOutline(length: number, width = TAPE_WIDTH, seed = 1): Point[] {
  const rng = createRng(seed)
  const half = width / 2
  const teeth = Math.max(6, Math.round(width / 2.6))
  const end = (x0: number, dir: 1 | -1) => Array.from({ length: teeth + 1 }, (_, i) => {
    const depth = i === 0 || i === teeth ? 0 : (i % 2 ? 1 + rng() * 2.4 : rng() * 0.8)
    return { x: x0 + dir * depth, y: -half + (width * i) / teeth }
  })
  const left = end(0, 1)
  const right = end(length, -1)
  // Clockwise: along the top, down the right tear, back along the bottom, up the left tear.
  return [left[0], right[0], ...right.slice(1), ...left.slice().reverse().slice(0, -1)]
}

/** Points along the middle of a strip, for checking what it holds down. */
export function tapeSamples(t: Pick<TapeStrip, 'x1' | 'y1' | 'x2' | 'y2'>, spacing = 6): Point[] {
  const len = tapeLength(t)
  const n = Math.max(1, Math.ceil(len / spacing))
  const nx = -(t.y2 - t.y1) / (len || 1)
  const ny = (t.x2 - t.x1) / (len || 1)
  const out: Point[] = []
  for (let i = 0; i <= n; i++) {
    const x = t.x1 + ((t.x2 - t.x1) * i) / n
    const y = t.y1 + ((t.y2 - t.y1) * i) / n
    for (const o of [-0.35, 0, 0.35]) out.push({ x: x + nx * TAPE_WIDTH * o, y: y + ny * TAPE_WIDTH * o })
  }
  return out
}

/** The outline of a laid strip in table units, torn ends included: what it covers. */
export function tapeFootprint(t: TapeStrip, width = TAPE_WIDTH): Point[] {
  const len = tapeLength(t)
  const ux = (t.x2 - t.x1) / (len || 1)
  const uy = (t.y2 - t.y1) / (len || 1)
  return tapeOutline(len, width, t.seed).map((q) => ({ x: t.x1 + q.x * ux - q.y * uy, y: t.y1 + q.x * uy + q.y * ux }))
}
