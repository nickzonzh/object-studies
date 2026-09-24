// Regenerates the Carved Oak carving: node scripts/generate-carving.mjs
//
// The running members of the Louis XIII oak frame, drawn with the same
// acanthus hand as the corner and centre clasps (scripts/ornaments/oak.mjs):
//
//   torus.svg        the running leaf-and-flower torus, one band tile
//   leaf-tip.svg     the leaf-tip ogee at the sight edge, one band tile
//
// Tiles are light and shade only, never colour of their own, so the section's
// gradient, the oak figure and the pointer light all carry through; the clasps
// are solid wood lapped over the running carving, as applied corners are.
// Coordinates are rounded to whole units in the tiles (sixty across a band a
// dozen pixels high) and to a tenth in the clasps, which are drawn larger.
import { writeFile } from 'node:fs/promises'
import { carve, flower, leaf, mapPart, precision } from './ornaments/acanthus.mjs'

const DIR = 'src/variants/CarvedOak'

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
  precision(0)
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
