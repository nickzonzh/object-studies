// Bakes carved ornament into sprite sheets painted as CSS backgrounds.
//
// Carving drawn as live SVG costs a frame far more than it looks: every <use>
// clones its geometry into a shadow tree (well over a thousand nodes on a
// carved frame), all of it is restyled and re-rastered whenever the travelling
// light moves, and the geometry ships in the JavaScript. Baked, each placement
// is one empty span whose background is a cell of a sprite the browser
// rasterizes once per size. Layers that respond to the pointer — the catch on
// a crest and the bounce into its shade — get sheets of their own, so they can
// still follow the light through opacity alone.
//
// A placement is authored exactly as the inline SVG used to draw it: its
// viewBox, its drawing units per frame width, the reflection CSS applied to
// the element, and the element's anchor on the frame. The composer bakes the
// reflection into the cell, sizes the cell from the geometry actually drawn
// (carving overhangs its viewBox), and writes the matching CSS.
import { readFile, writeFile } from 'node:fs/promises'

/** Sprite units per frame width; every cell is normalised to it. */
const UNITS = 50
/** Clear space around each cell, in sprite units, so no filtering bleeds across. */
const GUTTER = 2

/* --- geometry bounds ---------------------------------------------------- */

/** Conservative bounds of path data: every end and control point. */
export function pathBounds(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  let x = 0; let y = 0; let startX = 0; let startY = 0
  let command = ''
  const box = [Infinity, Infinity, -Infinity, -Infinity]
  const see = (px, py) => {
    box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py)
    box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py)
  }
  const arity = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, z: 0 }
  let i = 0
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++]
    const lower = command.toLowerCase()
    if (!(lower in arity)) throw new Error(`pathBounds: unsupported command ${command}`)
    if (lower === 'z') { x = startX; y = startY; continue }
    const values = tokens.slice(i, i + arity[lower]).map(Number)
    i += arity[lower]
    const relative = command !== command.toUpperCase()
    const ox = relative ? x : 0
    const oy = relative ? y : 0
    if (lower === 'h') { x = ox + values[0]; see(x, y) } else if (lower === 'v') { y = oy + values[0]; see(x, y) } else {
      for (let k = 0; k < values.length; k += 2) see(ox + values[k], oy + values[k + 1])
      x = ox + values[values.length - 2]
      y = oy + values[values.length - 1]
    }
    if (lower === 'm') {
      startX = x; startY = y
      command = relative ? 'l' : 'L'
    }
  }
  return box
}

/** Union of bounds over path lists; `transpose` swaps axes as a mitre turns a rail. */
export function bounds(lists, { transpose = false } = {}) {
  const box = [Infinity, Infinity, -Infinity, -Infinity]
  for (const list of lists) for (const d of list) {
    const [x0, y0, x1, y1] = pathBounds(d)
    box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], y0)
    box[2] = Math.max(box[2], x1); box[3] = Math.max(box[3], y1)
  }
  return transpose ? [box[1], box[0], box[3], box[2]] : box
}

/* --- composition -------------------------------------------------------- */

const num = v => {
  const r = Math.round(v * 1000) / 1000
  return (Object.is(r, -0) ? 0 : r).toString().replace(/^(-?)0\./, '$1.')
}
const fw = k => `calc(var(--frame-width) * ${num(k)})`

/**
 * One anchor per axis, in frame widths, exactly as the element was placed:
 * ['start', offset] (left/top), ['end', offset] (right/bottom) or
 * ['centre', margin] (50% plus a margin).
 */
function place(axis, [kind, offset], length, from, to) {
  const [start, end, size] = axis === 'x' ? ['left', 'right', 'width'] : ['top', 'bottom', 'height']
  const margin = axis === 'x' ? 'margin-left' : 'margin-top'
  if (kind === 'start') return [`${start}: ${fw(offset + from)}`, `${size}: ${fw(to - from)}`]
  if (kind === 'end') return [`${end}: ${fw(offset + length - to)}`, `${size}: ${fw(to - from)}`]
  return [`${start}: 50%`, `${margin}: ${fw(offset + from)}`, `${size}: ${fw(to - from)}`]
}

/**
 * Losslessly shortens a sheet. Placements repeat the same stop lists and the
 * same paint on every layer; each stop list is written once and inherited
 * through href, and each repeated bundle of paint attributes becomes a class
 * in the sheet's own stylesheet.
 */
function condense(svg) {
  const lists = new Map()
  svg = svg.replace(/<linearGradient id="([^"]+)"([^>]*)>([\s\S]*?)<\/linearGradient>/g, (_, id, coords, stops) => {
    if (!lists.has(stops)) lists.set(stops, `s${lists.size}`)
    return `<linearGradient id="${id}" href="#${lists.get(stops)}"${coords}/>`
  })
  const bases = [...lists].map(([stops, id]) => `<linearGradient id="${id}">${stops}</linearGradient>`).join('')
  svg = svg.replace('<defs>', `<defs>${bases}`)
  const paint = /\s(fill|fill-opacity|opacity|stroke|stroke-opacity|stroke-width|stroke-linecap)="([^"]*)"/g
  const bundles = new Map()
  const count = new Map()
  const bundleOf = attributes => [...attributes.matchAll(paint)].map(([, name, value]) => `${name}:${value}`).join(';')
  for (const [, attributes] of svg.matchAll(/<use([^>]*)\/>/g)) {
    const bundle = bundleOf(attributes)
    if (bundle) count.set(bundle, (count.get(bundle) ?? 0) + 1)
  }
  svg = svg.replace(/<use([^>]*)\/>/g, (whole, attributes) => {
    const bundle = bundleOf(attributes)
    if (!bundle || count.get(bundle) < 2) return whole
    if (!bundles.has(bundle)) bundles.set(bundle, `p${bundles.size}`)
    return `<use${attributes.replace(paint, '')} class="${bundles.get(bundle)}"/>`
  })
  const style = [...bundles].map(([bundle, name]) => `.${name}{${bundle}}`).join('')
  return style ? svg.replace('<defs>', `<defs><style>${style}</style>`) : svg
}

/**
 * @param {object} options
 * @param {string} options.variant        data-variant value
 * @param {string} options.directory      e.g. 'src/variants/BaroqueGold'
 * @param {string} options.css            stylesheet receiving the generated section
 * @param {Record<string, readonly string[]>} options.groups  shared geometry, by id
 * @param {object[]} options.placements   see the module comment
 * @param {Record<string, string>} options.relief  relief layer → opacity expression
 * @param {object} [options.micro]        { opacity, small: [query, opacity] } for the micro layer
 */
export async function composeSprites({ variant, directory, css, groups, placements, relief, micro }) {
  // Cells: bounds padded for the offset shadow and bounce copies and strokes,
  // then carried into world orientation and sprite units.
  const cells = placements.map(p => {
    const [x0, y0, x1, y1] = p.bounds
    const pad = p.pad ?? 8
    const box = [x0 - pad, y0 - pad, x1 + pad, y1 + pad]
    const k = UNITS / p.units
    return { ...p, box, w: (box[2] - box[0]) * k, h: (box[3] - box[1]) * k }
  })
  // Every layer of every placement is a cell of one sheet, so each geometry
  // group is written once however many layers draw it. Shelf packing, tallest
  // first so rows stay even.
  const layers = ['static', ...Object.keys(relief), ...(micro ? ['micro'] : [])]
  const items = layers.flatMap(layer => cells.filter(cell => cell.layers[layer]).map(cell => ({ cell, layer })))
  const order = [...items].sort((a, b) => b.cell.h - a.cell.h)
  const shelf = 900
  let x = 0; let y = 0; let row = 0; let width = 0
  for (const item of order) {
    if (x > 0 && x + item.cell.w > shelf) { x = 0; y += row + GUTTER; row = 0 }
    item.sx = x; item.sy = y
    x += item.cell.w + GUTTER
    row = Math.max(row, item.cell.h)
    width = Math.max(width, x)
  }
  const height = y + row

  const body = items.map(({ cell, layer, sx, sy }) => {
    const [fx, fy] = cell.flip
    const [x0, y0, x1, y1] = cell.box
    const view = [fx < 0 ? -x1 : x0, fy < 0 ? -y1 : y0, x1 - x0, y1 - y0].map(num).join(' ')
    const flip = fx < 0 || fy < 0 ? ` transform="scale(${fx} ${fy})"` : ''
    return `<svg x="${num(sx)}" y="${num(sy)}" width="${num(cell.w)}" height="${num(cell.h)}" viewBox="${view}">` +
      `<g${flip}>${cell.layers[layer]}</g></svg>`
  }).join('')
  const used = Object.entries(groups).filter(([id]) => body.includes(`#${id}"`))
  const gradients = cells.map(cell => cell.gradients ?? '').join('')
  const defs = used.map(([id, list]) => `<g id="${id}">${list.map(d => `<path d="${d}"/>`).join('')}</g>`).join('')
  const svg = condense(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(width)} ${num(height)}">` +
    `<defs>${gradients}${defs}</defs>${body}</svg>`) + '\n'
  await writeFile(`${directory}/ornament.svg`, svg)
  console.log(`${directory}/ornament.svg ${svg.length} bytes`)

  // The generated section: the sheet, one box per placement, one cell per
  // placement and layer, and each pointer-lit layer's opacity.
  const scope = `.korniza-frame[data-variant='${variant}']`
  const position = ({ sx, sy }) => `background-position: ${fw(-sx / UNITS)} ${fw(-sy / UNITS)}`
  const rules = [
    `${scope} .korniza-orn {\n  background: url('./ornament.svg') no-repeat;\n  background-size: ${fw(width / UNITS)} ${fw(height / UNITS)};\n}`,
    ...cells.map(cell => {
      const [fx, fy] = cell.flip
      const [x0, y0, x1, y1] = cell.box
      const [vx, vy, vw, vh] = cell.viewBox
      const s = 1 / cell.units
      // Element-local cell edges, measured from the element's own world-space
      // start edge once its reflection is applied.
      const fromX = (fx > 0 ? x0 - vx : vx + vw - x1) * s
      const toX = (fx > 0 ? x1 - vx : vx + vw - x0) * s
      const fromY = (fy > 0 ? y0 - vy : vy + vh - y1) * s
      const toY = (fy > 0 ? y1 - vy : vy + vh - y0) * s
      const declarations = [
        ...place('x', cell.anchor.x, vw * s, fromX, toX),
        ...place('y', cell.anchor.y, vh * s, fromY, toY),
        `z-index: ${cell.z}`,
        position(items.find(item => item.cell === cell && item.layer === 'static')),
      ]
      return `${scope} .korniza-orn--${cell.name} { ${declarations.join('; ')}; }`
    }),
    ...items.filter(item => item.layer !== 'static').map(item =>
      `${scope} .korniza-orn--${item.cell.name}.korniza-orn--${item.layer} { ${position(item)}; }`),
    ...Object.entries(relief).map(([layer, opacity]) => `${scope} .korniza-orn--${layer} { opacity: ${opacity}; }`),
    ...(micro ? [
      `${scope} .korniza-orn--micro { opacity: ${micro.opacity}; }`,
      `@container (${micro.small[0]}) { ${scope} .korniza-orn--micro { opacity: ${micro.small[1]}; } }`,
    ] : []),
    `@media (prefers-reduced-motion: reduce) {\n${Object.entries(relief).map(([layer, opacity]) =>
      `  ${scope} .korniza-orn--${layer} { opacity: ${opacity.replace(/^var\([^,]+,\s*([^)]+)\)$/, '$1')}; }`).join('\n')}\n}`,
  ]
  const BEGIN = '/* generated by scripts/generate-ornaments.mjs — edit the ornament there */'
  const END = '/* end generated ornament */'
  const path = `${directory}/${css}`
  const source = await readFile(path, 'utf8')
  const section = `${BEGIN}\n${rules.join('\n')}\n${END}`
  const from = source.indexOf(BEGIN)
  const to = source.indexOf(END)
  const next = from < 0 ? `${source.trimEnd()}\n\n${section}\n` : source.slice(0, from) + section + source.slice(to + END.length)
  await writeFile(path, next)
  // Placements that draw each layer, in authoring order, for FrameOrnament.
  return Object.fromEntries(layers.map(layer => [layer, placements.filter(p => p.layers[layer]).map(p => p.name)]))
}
