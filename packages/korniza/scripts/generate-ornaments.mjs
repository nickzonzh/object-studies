// Regenerates the baked carving of the three carved frames:
// node scripts/generate-ornaments.mjs
//
// For each variant this writes ornament.svg (the carving), one sheet per
// pointer-lit layer, a generated section at the end of the variant's
// stylesheet placing every cell, and ornament.ts, the layout FrameOrnament
// renders. The recipes below are the layer stacks the carving has always been
// painted with — offset shadow copies, a bounce rim, the body ramp, sockets,
// folds, gouges, then the crest catch and its return — authored per placement
// in the placement's own drawing space, before the CSS reflection that turns a
// corner or a rail. scripts/ornaments/sprite.mjs bakes that reflection in.
import { writeFile } from 'node:fs/promises'
import * as baroqueCorner from './ornaments/baroque-corner.mjs'
import * as baroqueRail from './ornaments/baroque-rail.mjs'
import * as oak from './ornaments/oak.mjs'
import * as rococoCorner from './ornaments/rococo-corner.mjs'
import * as rococoRail from './ornaments/rococo-rail.mjs'
import { bounds, composeSprites } from './ornaments/sprite.mjs'

const corners = [
  { name: 'tl', sx: 1, sy: 1 },
  { name: 'tr', sx: -1, sy: 1 },
  { name: 'bl', sx: 1, sy: -1 },
  { name: 'br', sx: -1, sy: -1 },
]
const cornerAnchor = (sx, sy, offset) => ({
  x: [sx < 0 ? 'end' : 'start', offset],
  y: [sy < 0 ? 'end' : 'start', offset],
})
const rails = [
  { name: 'top', sy: 1, across: false, flip: [1, 1] },
  { name: 'bottom', sy: -1, across: false, flip: [1, -1] },
  { name: 'left', sy: 1, across: true, flip: [1, 1] },
  { name: 'right', sy: -1, across: true, flip: [-1, 1] },
]
/** Rails straddle the middle of their side, inset `inset` frame widths from the outer edge. */
const railAnchor = (name, inset, half) => ({
  top: { x: ['centre', -half], y: ['start', inset] },
  bottom: { x: ['centre', -half], y: ['end', inset] },
  left: { x: ['start', inset], y: ['centre', -half] },
  right: { x: ['end', inset], y: ['centre', -half] },
})[name]
const TRANSPOSE = 'matrix(0 1 1 0 0 0)'
const wrap = (across, markup) => across ? `<g transform="${TRANSPOSE}">${markup}</g>` : markup
const use = (href, attributes = '') => `<use href="#${href}"${attributes}/>`
const move = (x, y) => ` transform="translate(${+x.toFixed(3)} ${+y.toFixed(3)})"`
const gradient = (id, [x1, y1, x2, y2], stops) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`

const outputs = []

/* --- Baroque Gold -------------------------------------------------------- */

const baroqueMicro = 'M10 0 l2 2 M5 21 l1.5 1.2 M45 13 l-1.4 1.3 M61 36 l-1 .8 M26 54 l.8 1'
outputs.push(['src/variants/BaroqueGold', await composeSprites({
  variant: 'baroque-gold',
  directory: 'src/variants/BaroqueGold',
  css: 'baroque.css',
  groups: {
    'c-body': baroqueCorner.masses, 'c-edges': baroqueCorner.edges, 'c-folds': baroqueCorner.folds,
    'c-cuts': baroqueCorner.cuts, 'c-undercuts': baroqueCorner.undercuts,
    'r-mass': baroqueRail.masses, 'r-crests': baroqueRail.crests,
  },
  relief: { light: 'var(--relief-light, .65)', return: 'var(--relief-return, .12)' },
  micro: { opacity: .55, small: ['max-width: 250px', .3] },
  placements: [
    // Rail cartouches, 100 units to a frame width.
    ...rails.map(({ name, sy, across, flip }) => ({
      name, flip, units: 100, z: 5,
      viewBox: across ? [0, 0, 46, 160] : [0, 0, 160, 46],
      anchor: railAnchor(name, .03, .8),
      bounds: bounds([baroqueRail.masses, baroqueRail.crests], { transpose: across }),
      pad: 10,
      // The body takes the ogee's own stops, so carving and rail are one gilt.
      gradients: gradient(`r-${name}`, [0, sy < 0 ? 1 : 0, .28, sy < 0 ? 0 : 1],
        '<stop stop-color="#ffe9a2" stop-opacity=".5"/><stop offset=".28" stop-color="#e2bb66" stop-opacity=".3"/>' +
        '<stop offset=".58" stop-color="#a8813c" stop-opacity=".28"/><stop offset=".82" stop-color="#5d3c17" stop-opacity=".48"/>' +
        '<stop offset="1" stop-color="#2e1c0a" stop-opacity=".6"/>'),
      layers: {
        static: wrap(across,
          use('r-mass', `${move(4.6, sy * 6)} fill="#261304" opacity=".28"`) +
          use('r-mass', `${move(2.3, sy * 3)} fill="#261304" opacity=".54"`) +
          use('r-mass', `${move(-2.2, sy * -2.8)} fill="#ffe6a4" opacity=".5"`) +
          use('r-mass', ` fill="url(#r-${name})" stroke="#2e1b07" stroke-opacity=".4" stroke-width="2.2" opacity=".97"`) +
          use('r-crests', `${move(1.5, sy * 1.9)} fill="none" stroke="#4a2d10" stroke-opacity=".32" stroke-width="2.8" stroke-linecap="round"`)),
        light: wrap(across, use('r-crests', ` fill="none" stroke="${sy < 0 ? '#e9d0a0' : '#ffeec0'}" stroke-width="2.2" stroke-linecap="round"`)),
      },
    })),
    // Corners, 50 units to a frame width. Unequal rail scrolls cradle a
    // diagonal acanthus; gradients are counter-reflected so the key stays
    // above and to the left.
    ...corners.map(({ name, sx, sy }) => ({
      name, flip: [sx, sy], units: 50, z: 6,
      viewBox: [-8, -8, 160, 160],
      anchor: cornerAnchor(sx, sy, -.16),
      bounds: bounds([baroqueCorner.masses, baroqueCorner.edges, baroqueCorner.folds, baroqueCorner.cuts, [baroqueMicro]]),
      gradients:
        gradient(`c-${name}-gold`, [sx < 0 ? 1 : 0, sy < 0 ? 1 : 0, sx < 0 ? .2 : .8, sy < 0 ? 0 : 1],
          '<stop stop-color="#f6e7b6"/><stop offset=".13" stop-color="#dfc894"/><stop offset=".28" stop-color="#c3a662"/>' +
          '<stop offset=".42" stop-color="#a18148"/><stop offset=".56" stop-color="#d0b16b"/><stop offset=".7" stop-color="#98733b"/>' +
          '<stop offset=".86" stop-color="#6b4828"/><stop offset="1" stop-color="#3c281b"/>') +
        gradient(`c-${name}-fold`, [sx < 0 ? 1 : 0, sy < 0 ? 1 : 0, sx < 0 ? 0 : 1, sy < 0 ? .65 : .35],
          '<stop stop-color="#5d3a20"/><stop offset=".26" stop-color="#ad8746"/><stop offset=".47" stop-color="#efdaa0"/>' +
          '<stop offset=".64" stop-color="#c0a05a"/><stop offset="1" stop-color="#6b4828"/>'),
      layers: {
        static:
          use('c-body', `${move(sx * 2.2, sy * 3.6)} fill="#2b1d12" opacity=".3"`) +
          use('c-body', `${move(sx * 1.05, sy * 1.75)} fill="#302118" opacity=".58"`) +
          use('c-body', `${move(sx * -.55, sy * -.7)} fill="#e9d4a1" opacity=".5"`) +
          use('c-body', ` fill="url(#c-${name}-gold)"`) +
          use('c-undercuts', ' fill="#4a3018" opacity=".6"') +
          use('c-folds', ` fill="url(#c-${name}-fold)"`) +
          // Cuts are shallow shadowed grooves in the gilt, not drawn contours.
          `<g fill="none" stroke="#5b3b21" stroke-width=".6" stroke-linecap="round" opacity=".52">${use('c-cuts')}</g>`,
        // Shared crest lines; the catch cools on the reflected corners.
        light: use('c-edges', ` fill="none" stroke="${name === 'tl' ? '#fff3cd' : name === 'br' ? '#dcc286' : '#f4e3b2'}" stroke-width=".8" stroke-linecap="round"`),
        return: use('c-edges', `${move(sx * .55, sy * .8)} fill="none" stroke="#e8c98a" stroke-width=".6"`),
        // Sparse bole only on exposed crown tips; cavities keep their stable brown.
        micro: `<path d="${baroqueMicro}" fill="none" stroke="#794630" stroke-width=".6"/>`,
      },
    })),
  ],
})])

/* --- Champagne Rococo ---------------------------------------------------- */

const rococoMicro = 'M13 5l2 1.6M4 14l1.6 1.3M34 3l-1.8 1.4M48 9l-1.4 1.2M9 48l1.2 1.5M26 30l-1.5 1.2'
const champagne = '<stop stop-color="#f7efd9"/><stop offset=".12" stop-color="#e6d5ad"/><stop offset=".26" stop-color="#cbb083"/>' +
  '<stop offset=".4" stop-color="#a78a5f"/><stop offset=".52" stop-color="#dfcb9f"/><stop offset=".66" stop-color="#977a52"/>' +
  '<stop offset=".82" stop-color="#6b5238"/><stop offset="1" stop-color="#3d2e1e"/>'
const champagneFold = '<stop stop-color="#5b4229"/><stop offset=".24" stop-color="#a98e66"/><stop offset=".46" stop-color="#f4e8c6"/>' +
  '<stop offset=".66" stop-color="#bda278"/><stop offset="1" stop-color="#675034"/>'
outputs.push(['src/variants/ChampagneRococo', await composeSprites({
  variant: 'champagne-rococo',
  directory: 'src/variants/ChampagneRococo',
  css: 'rococo.css',
  groups: {
    'c-body': rococoCorner.masses, 'c-folds': rococoCorner.folds, 'c-undercuts': rococoCorner.undercuts,
    'c-edges': rococoCorner.edges, 'c-cuts': rococoCorner.cuts,
    'r-mass': rococoRail.masses, 'r-folds': rococoRail.folds, 'r-undercuts': rococoRail.undercuts, 'r-crests': rococoRail.crests,
  },
  relief: { light: 'var(--relief-light, .48)', return: 'var(--relief-return, .08)' },
  micro: { opacity: .5, small: ['max-width: 300px', .22] },
  placements: [
    // Centre cartouches, 100 units to a frame width: outer edge of the band
    // bright, sight edge in shade, the moulding's own cross-section.
    ...rails.map(({ name, sy, across, flip }) => ({
      name, flip, units: 100, z: 5,
      viewBox: across ? [0, 0, 80, 208] : [0, 0, 208, 80],
      anchor: railAnchor(name, .06, 1.04),
      bounds: bounds([rococoRail.masses, rococoRail.crests], { transpose: across }),
      pad: 10,
      gradients:
        gradient(`r-${name}`, [0, sy < 0 ? 1 : 0, .7, sy < 0 ? 0 : 1], champagne) +
        gradient(`r-${name}-fold`, [0, sy < 0 ? 1 : 0, 1, sy < 0 ? .6 : .4], champagneFold),
      layers: {
        static: wrap(across,
          use('r-mass', `${move(3, sy * 4.2)} fill="#33240f" opacity=".3"`) +
          use('r-mass', `${move(1.4, sy * 2)} fill="#3a2b17" opacity=".58"`) +
          use('r-mass', `${move(-1, sy * -1.3)} fill="#f8eed2" opacity=".48"`) +
          use('r-mass', ` fill="url(#r-${name})"`) +
          use('r-undercuts', ' fill="#3c2a14" opacity=".7"') +
          use('r-folds', ` fill="url(#r-${name}-fold)" opacity=".85"`) +
          use('r-crests', `${move(1.1, sy * 1.5)} fill="none" stroke="#5c4327" stroke-opacity=".34" stroke-width="2" stroke-linecap="round"`)),
        light: wrap(across, use('r-crests', ` fill="none" stroke="${sy < 0 ? '#eaddc0' : '#fff8e6'}" stroke-width="1.6" stroke-linecap="round"`)),
        return: wrap(across, use('r-crests', `${move(1.8, sy * 2.4)} fill="none" stroke="#ecd8b0" stroke-width="1.1" stroke-linecap="round"`)),
      },
    })),
    // Corner rocaille, 50 units to a frame width. Three solid offset copies
    // read as a softening cast shadow; a chalky bounce rim, because the bole
    // under champagne gilding is white gesso.
    ...corners.map(({ name, sx, sy }) => ({
      name, flip: [sx, sy], units: 50, z: 6,
      viewBox: [-8, -8, 160, 160],
      anchor: cornerAnchor(sx, sy, -.16),
      bounds: bounds([rococoCorner.masses, rococoCorner.edges, rococoCorner.folds, rococoCorner.cuts, [rococoMicro]]),
      gradients:
        gradient(`c-${name}-gilt`, [sx < 0 ? 1 : 0, sy < 0 ? 1 : 0, sx < 0 ? .18 : .82, sy < 0 ? 0 : 1], champagne) +
        gradient(`c-${name}-fold`, [sx < 0 ? 1 : 0, sy < 0 ? 1 : 0, sx < 0 ? 0 : 1, sy < 0 ? .65 : .35], champagneFold),
      layers: {
        static:
          use('c-body', `${move(sx * 4.4, sy * 6.8)} fill="#2c1e0b" opacity=".2"`) +
          use('c-body', `${move(sx * 2.6, sy * 4.1)} fill="#2c1e0b" opacity=".38"`) +
          use('c-body', `${move(sx * 1.15, sy * 1.9)} fill="#332512" opacity=".68"`) +
          use('c-body', `${move(sx * -.75, sy * -1)} fill="#f8eed2" opacity=".46"`) +
          use('c-body', ` fill="url(#c-${name}-gilt)"`) +
          use('c-undercuts', ' fill="#33220e" opacity=".82"') +
          use('c-folds', ` fill="url(#c-${name}-fold)" opacity=".88"`) +
          use('c-cuts', `${move(sx * .5, sy * .7)} fill="none" stroke="#5c4327" stroke-opacity=".46" stroke-width="1" stroke-linecap="round"`) +
          // The crest shadow is fixed — a gouge is dark whatever the light does.
          use('c-edges', `${move(sx * .95, sy * 1.3)} fill="none" stroke="#5c4327" stroke-opacity=".34" stroke-width="1.6" stroke-linecap="round"`),
        light: use('c-edges', ` fill="none" stroke="${sy * sx < 0 ? '#f6ead0' : sy < 0 ? '#e8dabb' : '#fff8e6'}" stroke-width="1.15" stroke-linecap="round"`),
        return: use('c-edges', `${move(sx * 1.5, sy * 2)} fill="none" stroke="#ecd8b0" stroke-width=".8" stroke-linecap="round"`),
        // Bole wear: the gold rubbed back to white gesso on the highest points.
        micro: `<path d="${rococoMicro}" fill="none" stroke="#fbf4e2" stroke-width=".9" stroke-linecap="round"/>`,
      },
    })),
  ],
})])

/* --- Carved Oak ---------------------------------------------------------- */

/* Clasps carved in the solid and lapped over the running torus. Offsets are
   given in world space and mapped into each placement's drawing space, so all
   eight read lit from the upper left however the placement is reflected. */
const oakPlacements = [
  ...corners.map(({ name, sx, sy }) => ({
    name, flip: [sx, sy], across: false, geometry: 'corner', viewBox: [-8, -8, 160, 160], z: 6,
    anchor: cornerAnchor(sx, sy, -.16),
  })),
  { name: 'top', flip: [1, 1], across: false, geometry: 'centre', viewBox: [-50, -4, 100, 30], z: 5, anchor: { x: ['centre', -1], y: ['start', -.08] } },
  { name: 'bottom', flip: [1, -1], across: false, geometry: 'centre', viewBox: [-50, -4, 100, 30], z: 5, anchor: { x: ['centre', -1], y: ['end', -.08] } },
  { name: 'left', flip: [1, 1], across: true, geometry: 'centre', viewBox: [-4, -50, 30, 100], z: 5, anchor: { x: ['start', -.08], y: ['centre', -1] } },
  { name: 'right', flip: [-1, 1], across: true, geometry: 'centre', viewBox: [-4, -50, 30, 100], z: 5, anchor: { x: ['end', -.08], y: ['centre', -1] } },
]
const local = ({ flip: [fx, fy], across }, [x, y]) => across ? [fy * y, fx * x] : [fx * x, fy * y]
const shift = (p, v) => { const [x, y] = local(p, v); return move(x, y) }
const along = (p, v) => {
  const [x, y] = local(p, v)
  const x1 = x < 0 ? 1 : 0
  const y1 = y < 0 ? 1 : 0
  return [x1, y1, +(x1 + x).toFixed(3), +(y1 + y).toFixed(3)]
}
outputs.push(['src/variants/CarvedOak', await composeSprites({
  variant: 'carved-oak',
  directory: 'src/variants/CarvedOak',
  css: 'oak.css',
  groups: Object.fromEntries(['corner', 'centre'].flatMap(kind =>
    ['masses', 'folds', 'eyes', 'veins'].map(part => [`${kind}-${part}`, oak[kind][part]]))),
  relief: { light: 'var(--relief-light, .46)' },
  placements: oakPlacements.map(p => {
    const g = p.geometry
    const ref = part => `${g}-${part}`
    const inner = {
      static:
        use(ref('masses'), `${shift(p, [2.2, 3.2])} fill="#1c1107" opacity=".22"`) +
        use(ref('masses'), `${shift(p, [1, 1.5])} fill="#1c1107" opacity=".45"`) +
        use(ref('masses'), `${shift(p, [-.5, -.7])} fill="#ecd0a2" opacity=".36"`) +
        use(ref('masses'), ` fill="url(#${p.name}-body)"`) +
        use(ref('eyes'), ' fill="#1a0f06" opacity=".8"') +
        use(ref('folds'), `${shift(p, [.5, .7])} fill="#1c1107" opacity=".22"`) +
        use(ref('folds'), ` fill="url(#${p.name}-fold)"`) +
        use(ref('veins'), `${shift(p, [.35, .5])} fill="none" stroke="#1f1308" stroke-opacity=".5" stroke-width=".7" stroke-linecap="round"`),
      light: use(ref('veins'), `${shift(p, [-.25, -.35])} fill="none" stroke="#f2e0bc" stroke-width=".5" stroke-linecap="round"`),
    }
    return {
      name: p.name, flip: p.flip, units: 50, z: p.z, viewBox: p.viewBox, anchor: p.anchor,
      bounds: bounds([oak[g].masses, oak[g].veins], { transpose: p.across }),
      // Waxed oak lit from the upper left: the ramp the torus is painted with,
      // from its lit crest down to the wax in the quirk.
      gradients:
        gradient(`${p.name}-body`, along(p, [.8, 1]),
          '<stop stop-color="#b08a5e"/><stop offset=".3" stop-color="#8f6b44"/><stop offset=".62" stop-color="#6e4f30"/><stop offset="1" stop-color="#452f1a"/>') +
        gradient(`${p.name}-fold`, along(p, [1, .6]),
          '<stop stop-color="#efdcb6" stop-opacity=".55"/><stop offset=".6" stop-color="#c9a87e" stop-opacity=".18"/><stop offset="1" stop-color="#3a2614" stop-opacity=".26"/>'),
      layers: { static: wrap(p.across, inner.static), light: wrap(p.across, inner.light) },
    }
  }),
})])

/* --- layouts ------------------------------------------------------------- */

const list = names => `[${names.map(name => `'${name}'`).join(', ')}]`
for (const [directory, { static: placements, micro, ...relief }] of outputs) {
  const module = `/* Generated by scripts/generate-ornaments.mjs — edit the generator, not this file. */
import type { OrnamentLayout } from '../../components/layers.js'

export const ornament: OrnamentLayout = {
  placements: ${list(placements)},
  relief: { ${Object.entries(relief).map(([layer, names]) => `${layer}: ${list(names)}`).join(', ')} },${micro ? `\n  micro: ${list(micro)},` : ''}
}
`
  await writeFile(`${directory}/ornament.ts`, module)
}
