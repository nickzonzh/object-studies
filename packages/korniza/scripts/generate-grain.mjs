// Regenerates the timber grain textures: node scripts/generate-grain.mjs
//
// Each texture is one stretched board, so the grain must run unbroken from end
// to end: every fibre is a single path spanning the whole long axis. A board
// 600×80 units wide is drawn onto a rail roughly 500×36 px, so one unit across
// is under half a pixel — everything here is authored heavy enough to survive
// that compression and still read at the size a frame is actually looked at.
//
// Three figures do the work that plain fibres cannot:
//   rays    quartersawn oak's medullary fleck, short pale lenses lying across
//           the fibre — the one mark that stops a rail reading as stripes
//   bands   walnut's chatoyance, broad soft lengths that catch or swallow light
//   figure  the cathedral flame where the cut crosses a growth ring
//
// The straight-grained texture is written to src/components: both blackened
// variants paint with it through --grain-straight, so it is inlined into the
// published stylesheet exactly once.
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
function fibre(rng, across, vertical, wander) {
  const span = 74 + rng() * 26
  let along = -14
  let current = across
  let path = `M${point(along, current, vertical)}`
  while (along < LONG + 14) {
    const next = along + span
    const drift = current + (rng() - .5) * wander
    path += `C${point(along + span * .34, current + (rng() - .5) * 1.5, vertical)} ${point(next - span * .34, drift + (rng() - .5) * 1.5, vertical)} ${point(next, drift, vertical)}`
    along = next
    current = Math.min(SHORT - 1, Math.max(1, drift))
  }
  return path
}

/** A cathedral figure: two long arcs meeting at a point, the classic flame. */
function figure(rng, vertical, belly) {
  const along = rng() * LONG
  const across = 6 + rng() * (SHORT - 12)
  const length = 120 + rng() * 210
  const depth = belly * (.5 + rng())
  const side = rng() < .5 ? 1 : -1
  return `M${point(along, across, vertical)}` +
    `C${point(along + length * .3, across + depth * side, vertical)} ${point(along + length * .7, across + depth * .8 * side, vertical)} ${point(along + length, across + .8 * side, vertical)}` +
    `C${point(along + length * .68, across + depth * .3 * side, vertical)} ${point(along + length * .32, across + depth * .45 * side, vertical)} ${point(along, across, vertical)}Z`
}

/** A medullary ray: a slim lens lying across the fibre, not along it. */
function ray(rng, vertical) {
  const along = rng() * LONG
  const across = 4 + rng() * (SHORT - 8)
  const reach = 4 + rng() * 7            // how far it runs across the board
  const lean = (rng() - .5) * 5          // rays are never quite square to it
  const waist = .7 + rng() * 1.2
  const tip = { along: along + lean, across: across + reach }
  return `M${point(along, across, vertical)}` +
    `Q${point(along + lean * .5 + waist, across + reach * .5, vertical)} ${point(tip.along, tip.across, vertical)}` +
    `Q${point(along + lean * .5 - waist, across + reach * .5, vertical)} ${point(along, across, vertical)}Z`
}

/** A chatoyant length: broad, soft, and much longer than it is wide. */
function chatoyance(rng, vertical) {
  const along = -40 + rng() * (LONG + 40)
  const across = 6 + rng() * (SHORT - 12)
  const length = 180 + rng() * 300
  const width = 9 + rng() * 13
  const bow = (rng() - .5) * 10
  return `M${point(along, across, vertical)}` +
    `C${point(along + length * .35, across + bow, vertical)} ${point(along + length * .65, across + bow, vertical)} ${point(along + length, across + bow * .4, vertical)}` +
    `L${point(along + length, across + bow * .4 + width, vertical)}` +
    `C${point(along + length * .65, across + bow + width, vertical)} ${point(along + length * .35, across + bow + width, vertical)} ${point(along, across + width, vertical)}Z`
}

function texture(timber, vertical) {
  const rng = random(timber.seed + (vertical ? 977 : 0))
  const box = vertical ? `0 0 ${SHORT} ${LONG}` : `0 0 ${LONG} ${SHORT}`
  const groups = timber.lines.map(line => {
    const paths = Array.from({ length: line.count }, () => {
      const across = .6 + rng() * (SHORT - 1.2)
      return `<path d="${fibre(rng, across, vertical, timber.wander)}" stroke-opacity="${round(line.from + rng() * (line.to - line.from))}"/>`
    }).join('')
    return `<g stroke="${line.color}" stroke-width="${line.width}">${paths}</g>`
  }).join('')
  const marks = []
  if (timber.figures) {
    marks.push(`<g fill="${timber.figure.color}">${Array.from({ length: timber.figures }, () =>
      `<path d="${figure(rng, vertical, timber.figure.belly)}" fill-opacity="${round(timber.figure.from + rng() * (timber.figure.to - timber.figure.from))}"/>`).join('')}</g>`)
  }
  if (timber.bands) {
    marks.push(`<g fill="${timber.band.color}">${Array.from({ length: timber.bands }, () =>
      `<path d="${chatoyance(rng, vertical)}" fill-opacity="${round(timber.band.from + rng() * (timber.band.to - timber.band.from))}"/>`).join('')}</g>`)
  }
  if (timber.rays) {
    marks.push(`<g fill="${timber.ray.color}">${Array.from({ length: timber.rays }, () =>
      `<path d="${ray(rng, vertical)}" fill-opacity="${round(timber.ray.from + rng() * (timber.ray.to - timber.ray.from))}"/>`).join('')}</g>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" preserveAspectRatio="none">` +
    `<g fill="none" stroke-linecap="round">${groups}</g>${marks.join('')}</svg>\n`
}

const timbers = [
  {
    // Quartersawn oak: open pores in a honey ground, silvered ray fleck over
    // it. Fewer, heavier fibres than a photograph shows, because half of them
    // disappear into each other once the board is squeezed onto a rail.
    directory: 'variants/CarvedOak', name: 'grain', seed: 21, wander: 3.0,
    lines: [
      { color: '#241705', width: '2.6', count: 14, from: .34, to: .58 },
      { color: '#57390f', width: '1.7', count: 10, from: .22, to: .40 },
      { color: '#f2dcb0', width: '1.7', count: 8, from: .20, to: .38 },
    ],
    figures: 5, figure: { color: '#241705', belly: 4.4, from: .10, to: .20 },
    rays: 44, ray: { color: '#eddbb4', from: .10, to: .24 },
  },
  {
    // Black walnut: long streaky figure that swings across the board, and the
    // chatoyant lengths that make a waxed walnut rail change value as you move.
    directory: 'variants/DarkWalnut', name: 'grain', seed: 43, wander: 5.2,
    lines: [
      { color: '#0f0805', width: '3.0', count: 10, from: .36, to: .58 },
      { color: '#33200f', width: '1.8', count: 8, from: .22, to: .38 },
      { color: '#c09256', width: '1.5', count: 6, from: .14, to: .26 },
    ],
    figures: 7, figure: { color: '#0f0805', belly: 6.5, from: .10, to: .20 },
    bands: 6, band: { color: '#cfa06a', from: .06, to: .13 },
  },
  {
    // Ash under a black stain: the pores stay open and read paler than the
    // stain that fills them, so the light lines carry this one, not the dark.
    // They are drawn faint: over a near-black ground a pale fibre at a tenth
    // of its own alpha already lifts the face by a third of its value.
    // Shared by both blackened variants; see --grain-straight.
    directory: 'components', name: 'straight-grain', seed: 67, wander: 1.7,
    lines: [
      { color: '#000000', width: '2.6', count: 9, from: .34, to: .52 },
      { color: '#d8cfc2', width: '1.7', count: 8, from: .09, to: .16 },
      { color: '#8f8578', width: '1.3', count: 7, from: .09, to: .17 },
    ],
    figures: 4, figure: { color: '#e4dcd0', belly: 5.0, from: .03, to: .06 },
  },
]

for (const timber of timbers) {
  for (const vertical of [false, true]) {
    const file = vertical ? `${timber.name}-vertical.svg` : `${timber.name}.svg`
    const path = `src/${timber.directory}/${file}`
    const content = texture(timber, vertical)
    await writeFile(path, content)
    console.log(`${path} ${content.length} bytes`)
  }
}
