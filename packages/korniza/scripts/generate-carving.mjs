// Regenerates the Carved Oak carving: node scripts/generate-carving.mjs
//
// A Louis XIII torus frame cut in oak carries three kinds of carving, and all
// of it is drawn here from one acanthus generator so the corners, centres and
// running torus share a single hand:
//
//   torus.svg        the running leaf-and-flower torus, one band tile
//   leaf-tip.svg     the leaf-tip ogee at the sight edge, one band tile
//   carvingGeometry  corner and centre clasps, painted by OakCarving.tsx
//
// Tiles are light and shade only, never colour of their own, so the section's
// gradient, the oak figure and the pointer light all carry through; the clasps
// are solid wood lapped over the running carving, as applied corners are.
// Coordinates are rounded to whole units in the tiles (sixty across a band a
// dozen pixels high) and to a tenth in the clasps, which are drawn larger.
import { writeFile } from 'node:fs/promises'

const DIR = 'src/variants/CarvedOak'

/* --- vectors ------------------------------------------------------------ */

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k]
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
const len = a => Math.hypot(a[0], a[1])
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l] }
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

let DECIMALS = 1
const num = v => {
  const k = 10 ** DECIMALS
  const r = Math.round(v * k) / k
  return (Object.is(r, -0) ? 0 : r).toString().replace(/^(-?)0\./, '$1.')
}
const pt = p => `${num(p[0])} ${num(p[1])}`

/* --- acanthus ----------------------------------------------------------- */

/**
 * An acanthus leaf along a quadratic midrib base → ctrl → tip. Each side is a
 * run of lobes that shrink toward the tip; each lobe a run of teeth with a
 * rounded back and a point hooked toward the tip, and a rounded eye cut
 * between lobes. Returns the two halves of the silhouette (each takes its own
 * run of the body gradient, so the midrib reads as a fold), the eyes, a raised
 * ridge per lobe and the gouged veins.
 */
function leaf({ base, ctrl, tip, width, lobes = 3, fingers = 3, curl = .1, hook = .05, scale = [1, .92, .74], eye = .26 }) {
  const at = t => lerp(lerp(base, ctrl, t), lerp(ctrl, tip, t), t)
  const tan = t => norm(sub(lerp(ctrl, tip, t), lerp(base, ctrl, t)))
  const nrm = t => { const d = tan(t); return [-d[1], d[0]] }
  const w = t => width * Math.sin(Math.PI * Math.min(.999, t ** .72)) ** .85
  const side = s => {
    const path = []
    const eyes = []
    const veins = []
    const ridges = []
    const stem = .08
    const end = .86
    const weights = Array.from({ length: lobes }, (_, i) => scale[i] ?? .6)
    const total = weights.reduce((a, b) => a + b)
    let a = stem
    let prev = add(at(.02), nrm(.02), s * w(.06) * .5)
    path.push(`L${pt(prev)}`)
    weights.forEach((weight, i) => {
      const b = a + (end - stem) * weight / total
      const notch = add(at(a), nrm(a), s * w(a) * (i === 0 ? .4 : eye))
      path.push(i === 0 ? `L${pt(notch)}` : `Q${pt(add(add(notch, nrm(a), s * w(a) * .25), tan(a), -width * .12))} ${pt(notch)}`)
      if (i > 0) {
        const centre = add(add(at(a), nrm(a), s * w(a) * (eye + .1)), tan(a), -width * .02)
        const r = Math.max(.45, w(a) * .1)
        const t = tan(a)
        const n = nrm(a)
        eyes.push(`M${pt(add(centre, t, r * 1.9))}Q${pt(add(add(centre, n, s * r * 1.3), t, -r * .3))} ${pt(add(centre, t, -r))}` +
          `Q${pt(add(add(centre, n, -s * r * 1.1), t, -r * .1))} ${pt(add(centre, t, r * 1.9))}Z`)
      }
      prev = notch
      const teeth = i === lobes - 1 ? Math.max(2, fingers - 1) : fingers
      for (let j = 0; j < teeth; j++) {
        const ft = a + (b - a) * (j + .85) / teeth
        const reach = (j === teeth - 1 ? 1 : j === 0 ? .8 : .93) * (i === 0 ? .98 : 1)
        const point = add(add(at(ft), nrm(ft), s * w(ft) * reach), tan(ft), width * curl)
        const back = lerp(prev, point, .55)
        path.push(`Q${pt(add(add(back, nrm(ft), s * len(sub(point, prev)) * .32), tan(ft), -width * .02))} ${pt(point)}`)
        if (j < teeth - 1) {
          const nt = a + (b - a) * (j + 1.02) / teeth
          const cleft = add(add(at(nt), nrm(nt), s * w(nt) * .62), tan(nt), -width * hook)
          path.push(`Q${pt(add(lerp(point, cleft, .5), nrm(ft), -s * width * .02))} ${pt(cleft)}`)
          prev = cleft
        } else prev = point
        veins.push(`M${pt(add(at(Math.max(.03, ft - .06)), nrm(ft), s * w(ft) * .16))}Q${pt(add(at(ft - .01), nrm(ft), s * w(ft) * .5))} ` +
          `${pt(add(add(at(ft), nrm(ft), s * w(ft) * reach * .72), tan(ft), width * curl * .6))}`)
      }
      const mid = a + (b - a) * .55
      const r0 = add(at(a + (b - a) * .1), nrm(a), s * w(a) * .1)
      const r1 = add(add(at(mid), nrm(mid), s * w(mid) * .78), tan(mid), width * curl * .6)
      const bulge = len(sub(r1, r0)) * .15
      const m = lerp(r0, r1, .5)
      const across = norm([-(r1[1] - r0[1]), r1[0] - r0[0]])
      ridges.push(`M${pt(r0)}Q${pt(add(m, across, bulge))} ${pt(r1)}Q${pt(add(m, across, -bulge * .5))} ${pt(r0)}Z`)
      a = b
    })
    path.push(`Q${pt(add(at(.94), nrm(.94), s * w(.94) * .5))} ${pt(tip)}`)
    return { path, eyes, veins, ridges }
  }
  const one = side(1)
  const two = side(-1)
  const half = S => `M${pt(at(0))}${S.path.join('')}L${pt(at(.6))}Z`
  const lift = t => add(at(t), nrm(t), width * .08)
  const drop = t => add(at(t), nrm(t), -width * .05)
  return {
    masses: [half(one), half(two)],
    eyes: [...one.eyes, ...two.eyes],
    folds: [...one.ridges, ...two.ridges, `M${pt(at(.03))}Q${pt(lift(.45))} ${pt(at(.96))}Q${pt(drop(.5))} ${pt(at(.03))}Z`],
    veins: [...one.veins, ...two.veins, `M${pt(at(.02))}Q${pt(ctrl)} ${pt(at(.97))}`],
  }
}

/** A flowerhead: rounded petals about a centre, the dome carried as a fold. */
function rosette(cx, cy, r, petals = 6, turn = 0) {
  const p = (a, k) => [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]
  let d = ''
  for (let i = 0; i < petals; i++) {
    const a0 = turn + i * 2 * Math.PI / petals
    const a1 = a0 + Math.PI / petals
    const a2 = a0 + 2 * Math.PI / petals
    d += (i ? '' : `M${pt(p(a0, .38))}`) + `Q${pt(p(a0 + .1, 1.05))} ${pt(p(a1, 1))}Q${pt(p(a2 - .1, 1.05))} ${pt(p(a2, .38))}`
  }
  return `${d}Z`
}

/** Merges carved parts in drawing order. */
function carve(...parts) {
  const out = { masses: [], folds: [], eyes: [], veins: [] }
  for (const part of parts) for (const key of Object.keys(out)) out[key].push(...(part[key] ?? []))
  return out
}

const flower = (cx, cy, r, petals, turn) => ({
  masses: [rosette(cx, cy, r, petals, turn)],
  folds: [rosette(cx, cy, r * .45, petals, turn + .3)],
})

/** Applies a coordinate map to every point of every path in a part. */
function mapPart(part, f) {
  const out = {}
  for (const [key, list] of Object.entries(part)) {
    out[key] = list.map(d => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => pt(f([+x, +y]))))
  }
  return out
}

/* --- band tiles --------------------------------------------------------- */

/** Wraps horizontal tile content; the vertical copy is the same drawing transposed. */
const tileSvg = (w, h, body, vertical) => vertical
  ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${h} ${w}" preserveAspectRatio="none"><g transform="matrix(0 1 1 0 0 0)">${body}</g></svg>\n`
  : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${body}</svg>\n`

/* The running torus: y = 0 is the outer edge of the torus and y = 60 its sight
   side. Two acanthus leaves lie across it on the diagonal, each over a
   flowerhead and a pair of small leaves splayed behind it — unequal in size,
   as a carver's repeat is — and every part that crosses the seam is drawn at
   both ends so the join cannot be found along a rail. */
function torus() {
  DECIMALS = 0
  const W = 170
  const H = 60
  const small = { lobes: 2, fingers: 2, curl: .1, scale: [1, .8] }
  const large = { lobes: 3, fingers: 2, curl: .14, scale: [1, .9, .7] }
  const repeat = carve(
    leaf({ base: [70, 32], ctrl: [74, 14], tip: [90, 2], width: 7.5, ...small }),
    leaf({ base: [72, 30], ctrl: [80, 48], tip: [98, 58], width: 7.5, ...small }),
    leaf({ base: [150, 34], ctrl: [152, 16], tip: [166, 4], width: 6.8, ...small }),
    leaf({ base: [150, 32], ctrl: [158, 48], tip: [174, 57], width: 6.8, ...small }),
    flower(72, 31, 13, 7, .3),
    flower(152, 33, 11.5, 6, .9),
    leaf({ base: [2, 57], ctrl: [16, 22], tip: [62, 6], width: 19, ...large }),
    leaf({ base: [92, 58], ctrl: [104, 26], tip: [146, 9], width: 17, ...large }),
  )
  const inside = d => {
    const xs = [...d.matchAll(/(-?[\d.]+) -?[\d.]+/g)].map(m => +m[1])
    return Math.max(...xs) > -3 && Math.min(...xs) < W + 3
  }
  const all = carve(mapPart(repeat, p => [p[0] - W, p[1]]), repeat, mapPart(repeat, p => [p[0] + W, p[1]]))
  const paths = list => list.filter(inside).map(d => `<path d="${d}"/>`).join('')
  // The ground wash sets the wax dark in every recess; the body gradient then
  // lifts each leaf back toward the wood's own value, lit on its upper-left
  // flank, and the closing wash lays the carving back into the round.
  const body =
    '<defs>' +
    '<linearGradient id="w" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#f3d29e" stop-opacity=".3"/><stop offset=".3" stop-color="#dcb27a" stop-opacity=".12"/>' +
    '<stop offset=".62" stop-color="#6b4c2c" stop-opacity=".14"/><stop offset="1" stop-color="#24170a" stop-opacity=".42"/></linearGradient>' +
    '<linearGradient id="f" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="#f4e2bc" stop-opacity=".34"/><stop offset=".6" stop-color="#e6cca0" stop-opacity=".1"/>' +
    '<stop offset="1" stop-color="#2a1a0c" stop-opacity=".2"/></linearGradient>' +
    '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff0cc" stop-opacity=".08"/><stop offset=".35" stop-color="#3a2410" stop-opacity="0"/>' +
    '<stop offset="1" stop-color="#26170a" stop-opacity=".3"/></linearGradient>' +
    `<g id="m">${paths(all.masses)}</g><g id="v">${paths(all.veins)}</g></defs>` +
    `<rect width="${W}" height="${H}" fill="#1c1107" fill-opacity=".3"/>` +
    '<use href="#m" transform="translate(6 8)" fill="#1c1107" opacity=".3"/>' +
    '<use href="#m" transform="translate(3 4)" fill="#1c1107" opacity=".45"/>' +
    '<use href="#m" transform="translate(-2.4 -3)" fill="#f0d2a0" opacity=".34"/>' +
    '<use href="#m" fill="url(#w)" stroke="#1f1308" stroke-opacity=".3" stroke-width="2.4"/>' +
    `<g fill="#1a0f06" opacity=".7">${paths(all.eyes)}</g>` +
    `<g fill="url(#f)">${paths(all.folds)}</g>` +
    '<use href="#v" transform="translate(1 1.3)" fill="none" stroke="#1f1308" stroke-opacity=".42" stroke-width="2.2" stroke-linecap="round"/>' +
    '<use href="#v" transform="translate(-.8 -1)" fill="none" stroke="#f2dfb8" stroke-opacity=".22" stroke-width="1.4" stroke-linecap="round"/>' +
    `<rect width="${W}" height="${H}" fill="url(#s)"/>`
  return { W, H, body }
}

/* The leaf-tip ogee: one tip to a tile, pointing at the sight edge (y = 20).
   Each leaf is a rounded tongue, not a facet: a lit sliver down its
   upper-left edge, a shaded one down the other, a gouged rib, and a dart of
   wax-dark ground between neighbours. Split flanks read as pyramids. */
function leafTip() {
  const W = 24
  const H = 20
  const outline = 'M2 0C1 8 6 16 12 19C18 16 23 8 22 0Z'
  const body =
    `<path d="M0 0H${W}V${H}H0Z${outline}" fill="#1c1107" fill-opacity=".46" fill-rule="evenodd"/>` +
    `<path d="M-.8 0C-.8 5 0 9 0 11C0 9 .8 5 .8 0ZM${W - .8} 0C${W - .8} 5 ${W} 9 ${W} 11C${W} 9 ${W + .8} 5 ${W + .8} 0Z" fill="#f0dcb4" fill-opacity=".22"/>` +
    '<path d="M2 0C1 8 6 16 12 19C8 15 5 8 5.4 0Z" fill="#f2dfb8" fill-opacity=".24"/>' +
    '<path d="M22 0C23 8 18 16 12 19C16 15 19 8 18.6 0Z" fill="#1c1107" fill-opacity=".24"/>' +
    `<path d="${outline}" transform="translate(.5 .6)" fill="none" stroke="#1c1107" stroke-opacity=".28" stroke-width="1"/>` +
    '<path d="M12.4 2V14" stroke="#1c1107" stroke-opacity=".4" stroke-width="1.2" stroke-linecap="round"/>' +
    '<path d="M11.3 2V13" stroke="#f4e4c0" stroke-opacity=".26" stroke-width=".8" stroke-linecap="round"/>'
  return { W, H, body }
}

for (const [name, tile] of [['torus', torus()], ['leaf-tip', leafTip()]]) {
  for (const vertical of [false, true]) {
    const path = `${DIR}/${name}${vertical ? '-vertical' : ''}.svg`
    const content = tileSvg(tile.W, tile.H, tile.body, vertical)
    await writeFile(path, content)
    console.log(`${path} ${content.length} bytes`)
  }
}

/* --- clasps ------------------------------------------------------------- */

/* Corner clasp, 50 units to one frame width with the outer corner at 0,0: an
   acanthus leaf on the mitre, its tip rolled out to the corner, over a pair of
   leaves that run out along the torus from a flowerhead seated in the quirk.
   The rail pair is drawn once and reflected across the diagonal, which keeps
   the key light in world space when the shading layers are offset. */
DECIMALS = 1
const transpose = part => mapPart(part, ([x, y]) => [y, x])
const railLeaf = leaf({ base: [15, 11.5], ctrl: [36, 4.5], tip: [62, 11], width: 11, lobes: 3, fingers: 3, curl: .12 })
const corner = carve(
  railLeaf,
  transpose(railLeaf),
  flower(24, 24, 6.6, 7, Math.PI / 4),
  leaf({ base: [28, 28], ctrl: [14, 14.8], tip: [1.8, 1.8], width: 13.5, lobes: 2, fingers: 3, curl: .1, scale: [1, .8] }),
)

/* Centre clasp on the top rail, centred on x = 0: two leaves running out from
   a flowerhead on the torus crest, reaching a frame width either way. */
const centre = carve(
  leaf({ base: [-5, 11.5], ctrl: [-24, 5.5], tip: [-46, 11.6], width: 9.6, lobes: 3, fingers: 3, curl: .12 }),
  leaf({ base: [5, 11.5], ctrl: [24, 5.5], tip: [46, 11.6], width: 9.6, lobes: 3, fingers: 3, curl: .12 }),
  flower(0, 11.3, 7.2, 8, Math.PI / 8),
)

const list = (name, part) => `  ${name}: [\n${part.map(d => `    '${d}',`).join('\n')}\n  ],`
const module = `/* Generated by scripts/generate-carving.mjs — edit the generator, not this file.
 * Carved Oak clasps, 50 drawing units to one frame width. Corners put the outer
 * corner at 0,0; centres are drawn for the top rail about x = 0. */
export interface Carving {
  masses: readonly string[]
  folds: readonly string[]
  eyes: readonly string[]
  veins: readonly string[]
}

${['corner', 'centre'].map((name, i) => {
  const part = i ? centre : corner
  return `export const ${name}: Carving = {\n${list('masses', part.masses)}\n${list('folds', part.folds)}\n${list('eyes', part.eyes)}\n${list('veins', part.veins)}\n}`
}).join('\n\n')}
`
await writeFile(`${DIR}/carvingGeometry.ts`, module)
console.log(`${DIR}/carvingGeometry.ts ${module.length} bytes`)
