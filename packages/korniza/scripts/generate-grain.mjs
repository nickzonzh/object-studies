// Regenerates the timber grain textures: node scripts/generate-grain.mjs
//
// Each texture is one stretched board, so the grain must run unbroken from end
// to end: every line is a single path spanning the whole long axis, with slow
// drift and a few cathedral figures. Output is deterministic, and small enough
// to inline in the published stylesheet.
import { writeFile } from 'node:fs/promises'

const LONG = 600
const SHORT = 80

const random = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Compact SVG number: one decimal, no leading zero. */
const round = (value, decimals = 1) => {
  const factor = 10 ** decimals
  const text = `${Math.round(value * factor) / factor}`
  if (text.startsWith('0.')) return text.slice(1)
  if (text.startsWith('-0.')) return `-${text.slice(2)}`
  return text
}

/** `along` runs the length of the board, `across` its narrow dimension. */
const point = (along, across, vertical) => vertical
  ? `${round(across)} ${round(along, 0)}`
  : `${round(along, 0)} ${round(across)}`

/** One continuous fibre: a single cubic chain across the whole board. */
function fibre(rng, across, vertical) {
  const span = 74 + rng() * 26
  let along = -14
  let current = across
  let path = `M${point(along, current, vertical)}`
  while (along < LONG + 14) {
    const next = along + span
    const drift = current + (rng() - .5) * 3.4
    path += `C${point(along + span * .34, current + (rng() - .5) * 1.5, vertical)} ${point(next - span * .34, drift + (rng() - .5) * 1.5, vertical)} ${point(next, drift, vertical)}`
    along = next
    current = Math.min(SHORT - 1, Math.max(1, drift))
  }
  return path
}

/** A cathedral figure: two long arcs meeting at a point, the classic flame. */
function figure(rng, vertical) {
  const along = rng() * LONG
  const across = 6 + rng() * (SHORT - 12)
  const length = 120 + rng() * 210
  const belly = 2.4 + rng() * 4.6
  const side = rng() < .5 ? 1 : -1
  return `M${point(along, across, vertical)}` +
    `C${point(along + length * .3, across + belly * side, vertical)} ${point(along + length * .7, across + belly * .8 * side, vertical)} ${point(along + length, across + .8 * side, vertical)}` +
    `C${point(along + length * .68, across + belly * .3 * side, vertical)} ${point(along + length * .32, across + belly * .45 * side, vertical)} ${point(along, across, vertical)}Z`
}

function texture(timber, vertical) {
  const rng = random(timber.seed + (vertical ? 977 : 0))
  const box = vertical ? `0 0 ${SHORT} ${LONG}` : `0 0 ${LONG} ${SHORT}`
  const groups = timber.lines.map(line => {
    const paths = Array.from({ length: line.count }, () => {
      const across = .6 + rng() * (SHORT - 1.2)
      return `<path d="${fibre(rng, across, vertical)}" stroke-opacity="${round(line.from + rng() * (line.to - line.from))}"/>`
    }).join('')
    return `<g stroke="${line.color}" stroke-width="${line.width}">${paths}</g>`
  }).join('')
  const figures = Array.from({ length: timber.figures }, () =>
    `<path d="${figure(rng, vertical)}" fill-opacity="${round(.07 + rng() * .1)}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" preserveAspectRatio="none">` +
    `<g fill="none" stroke-linecap="round">${groups}</g>` +
    `<g fill="${timber.figure}">${figures}</g></svg>\n`
}

/* A board is 600×80 units stretched onto a rail roughly 500×45 px, so one unit
   across is about half a pixel: stroke widths are deliberately heavy in drawing
   space to survive that compression. */
const timbers = [
  {
    directory: 'CarvedOak', seed: 21, figure: '#3d301f', figures: 20,
    lines: [
      { color: '#3d301f', width: '2.6', count: 18, from: .22, to: .44 },
      { color: '#6b5233', width: '1.8', count: 12, from: .14, to: .3 },
      { color: '#e8d2ab', width: '1.9', count: 13, from: .18, to: .36 },
    ],
  },
  {
    directory: 'DarkWalnut', seed: 43, figure: '#170e09', figures: 16,
    lines: [
      { color: '#170e09', width: '2.4', count: 18, from: .2, to: .42 },
      { color: '#3f2718', width: '1.8', count: 14, from: .14, to: .3 },
      { color: '#b9884f', width: '1.7', count: 11, from: .12, to: .26 },
    ],
  },
  {
    directory: 'EbonisedBlack', seed: 67, figure: '#050403', figures: 12,
    lines: [
      { color: '#050403', width: '2.2', count: 16, from: .22, to: .44 },
      { color: '#221d19', width: '1.6', count: 12, from: .16, to: .3 },
      { color: '#6f6559', width: '1.5', count: 10, from: .14, to: .28 },
    ],
  },
]

for (const timber of timbers) {
  for (const vertical of [false, true]) {
    const name = vertical ? 'grain-vertical.svg' : 'grain.svg'
    const path = `src/variants/${timber.directory}/${name}`
    const content = texture(timber, vertical)
    await writeFile(path, content)
    console.log(`${path} ${content.length} bytes`)
  }
}
