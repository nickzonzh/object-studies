// Bakes Kipos's materials and botanical sprites into src/art.css.
//
//   node packages/kipos/scripts/build-art.mjs
//
// Drawings are SVG data URIs. Anything grown from noise (feTurbulence) is
// baked here into a small AVIF instead: a browser re-runs an SVG filter every
// time anything over it repaints, which made the garden expensive to touch.
// The plants are lit as surfaces by scripts/relief.mjs and baked the same way.
// The output is generated; change this script and re-run it rather than
// editing art.css by hand. Everything is seeded, so the same script always
// draws the same garden.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { MATERIALS, relief as litDrawing } from './relief.mjs'

const OUT = fileURLToPath(new URL('../src/art.css', import.meta.url))

// mulberry32, the same generator object-studies-core exports as seededRandom.
function rng(seed) {
  let value = seed >>> 0
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let n = Math.imul(value ^ (value >>> 15), 1 | value)
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n)
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n) => (Math.round(n * 10) / 10).toString()
const pts = (points) => points.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')
const closed = (points) => `M${pts(points)}Z`

/** A smooth closed path through points (Catmull-Rom as cubic Béziers). */
function smooth(points, tension = 1) {
  const n = points.length
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n]
    const t = tension / 6
    d += `C${f(p1[0] + (p2[0] - p0[0]) * t)} ${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)} ${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

const svgOf = (w, h, body) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${body}</svg>`

// Noise drawings waiting to be baked, by placeholder.
const bakes = []

/**
 * A drawing as a CSS url(). `scale` is the bitmap's pixels per drawing unit
 * for a baked drawing: enough for the size it is shown at on a 2x screen.
 */
function uri(w, h, body, { scale = 2, quality = 10 } = {}) {
  const svg = svgOf(w, h, body)
  if (!svg.includes('feTurbulence'))
    return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`
  const token = `@@bake-${bakes.length}@@`
  bakes.push({ token, svg, w, h, scale, quality })
  return token
}

async function bake({ svg, w, h, scale, quality }) {
  const width = Math.round(w * scale)
  const height = Math.round(h * scale)
  // Drawn at full size, not drawn small and stretched: the noise and the
  // lighting on it are worked out at every pixel of the bitmap.
  const image = await loadImage(Buffer.from(svg.replace(`width='${w}' height='${h}'`, `width='${width}' height='${height}'`)))
  const canvas = createCanvas(width, height)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const avif = canvas.toBuffer('image/avif', { quality, speed: 2 })
  return `url("data:image/avif;base64,${avif.toString('base64')}")`
}

const rules = []
const rule = (selector, declarations) => rules.push(`${selector} {\n${declarations.map((d) => `  ${d};`).join('\n')}\n}`)
// Where each material is laid. Each is written straight into the rules that
// show it, not passed down as a custom property: a browser re-reads a custom
// property's value, the whole data URI, every time an element using it is
// restyled. styles.css sets each element's background size and position.
const PLACES = {
  'kipos-soil': ['.kipos-bed__soil', '.kipos-plant__mound', '.kipos-teneke__soil'],
  'kipos-limestone': ['.kipos-bed__back', '.kipos-stone', '.kipos-capstone'],
  'kipos-mortar': ['.kipos-bed__face', '.kipos-bed__coping'],
  'kipos-olive': ['.kipos-tray__wood'],
  'kipos-paper': ['.kipos-tag', '.kipos-packet__face', '.kipos-teneke__pinch'],
  'kipos-grain': ['.kipos-packet__face::after'],
  'kipos-can': ['.kipos-can__metal'],
  'kipos-teneke': ['.kipos-teneke__body'],
  'kipos-art-tomato': ['.kipos-packet--tomato .kipos-packet__art'],
  'kipos-art-cucumber': ['.kipos-packet--cucumber .kipos-packet__art'],
  'kipos-art-watermelon': ['.kipos-packet--watermelon .kipos-packet__art'],
  'kipos-tomato-red': ['.kipos-part--tomato::after'],
  'kipos-cane': ['.kipos-cane'],
  'kipos-stem': ['.kipos-seg--stem > .kipos-seg__body', '.kipos-part--truss'],
  'kipos-vine': ['.kipos-seg--vine > .kipos-seg__body'],
  'kipos-stalk': ['.kipos-seg--stalk > .kipos-seg__body'],
}
const materials = []
const material = (name, value) => {
  if (!PLACES[name]) throw new Error(`No place for ${name}`)
  materials.push(`${PLACES[name].join(',\n')} {\n  background-image: ${value};\n}`)
}

// ─── Materials ───────────────────────────────────────────────────────────────

// Lit relief: fractal noise used as a height map under a low warm sun from the
// upper left, multiplied over the base colour.
const relief = (id, { freq, octaves, scale, seed, light = '#fff3e0', azimuth = 225, elevation = 52 }) => `
  <filter id='${id}' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
    <feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch' result='h'/>
    <feDiffuseLighting in='h' surfaceScale='${scale}' diffuseConstant='1' lighting-color='${light}' result='lit'>
      <feDistantLight azimuth='${azimuth}' elevation='${elevation}'/>
    </feDiffuseLighting>
    <feBlend in='lit' in2='SourceGraphic' mode='multiply'/>
  </filter>`

// Tilled soil: crumbly relief, darker loam patches and scattered grit.
{
  const r = rng(11)
  let grit = ''
  for (let i = 0; i < 150; i++) {
    const x = 6 + r() * 348, y = 6 + r() * 348, s = 0.6 + r() * 2.2
    const tone = r() < 0.5 ? '#b08a68' : '#2a190f'
    grit += `<ellipse cx='${f(x)}' cy='${f(y)}' rx='${f(s)}' ry='${f(s * (0.6 + r() * 0.4))}' fill='${tone}' opacity='${f(0.35 + r() * 0.4)}'/>`
  }
  for (let i = 0; i < 11; i++) {
    const x = 14 + r() * 332, y = 14 + r() * 332, s = 2.2 + r() * 3.6
    grit += `<ellipse cx='${f(x)}' cy='${f(y)}' rx='${f(s)}' ry='${f(s * 0.7)}' fill='url(#pebble)' transform='rotate(${f(r() * 180)} ${f(x)} ${f(y)})'/>`
  }
  material(
    'kipos-soil',
    uri(360, 360, `
      <defs>${relief('s', { freq: 0.2, octaves: 5, scale: 6.5, seed: 4, light: '#ffe2c4', elevation: 40 })}
        <radialGradient id='pebble' cx='.35' cy='.3' r='.8'><stop offset='0' stop-color='#d8c4a6'/><stop offset='.6' stop-color='#9c8264'/><stop offset='1' stop-color='#5b4634'/></radialGradient>
        <filter id='loam' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.035' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .12  0 0 0 0 .07  0 0 0 0 .04  0 0 0 -2.2 1.25'/></filter>
      </defs>
      <rect width='360' height='360' fill='#6a4630' filter='url(#s)'/>
      <rect width='360' height='360' filter='url(#loam)' opacity='.55'/>
      ${grit}`, { scale: 1, quality: 28 }),
  )
}

// Limestone: soft pitted relief over slow colour drift, with fossil flecks.
{
  const r = rng(23)
  let flecks = ''
  for (let i = 0; i < 46; i++) {
    const x = r() * 256, y = r() * 256
    flecks += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(0.5 + r() * 1.5)}' fill='${r() < 0.6 ? '#9d8d70' : '#fbf6ea'}' opacity='${f(0.3 + r() * 0.5)}'/>`
  }
  material(
    'kipos-limestone',
    uri(256, 256, `
      <defs>${relief('l', { freq: 0.07, octaves: 5, scale: 1.6, seed: 7, light: '#fffaf0', elevation: 60 })}
        <filter id='drift' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.012' numOctaves='3' seed='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .47  0 0 0 0 .33  0 0 0 -1.6 .95'/></filter>
      </defs>
      <rect width='256' height='256' fill='#e2d6bd' filter='url(#l)'/>
      <rect width='256' height='256' filter='url(#drift)' opacity='.5'/>
      ${flecks}`, { scale: 2.5, quality: 16 }),
  )
}

// Lime mortar, gritty, with moss creeping in.
material(
  'kipos-mortar',
  uri(160, 160, `
    <defs>${relief('m', { freq: 0.6, octaves: 3, scale: 3, seed: 5, elevation: 50 })}
      <filter id='moss' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.05' numOctaves='3' seed='14' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .27  0 0 0 0 .36  0 0 0 0 .12  0 0 0 -11 4.9'/></filter>
    </defs>
    <rect width='160' height='160' fill='#a29276' filter='url(#m)'/>
    <rect width='160' height='160' filter='url(#moss)' opacity='.8'/>`, { scale: 1, quality: 14 }),
)

// Olive wood: warm figured grain, warped so it swirls round the knots.
material(
  'kipos-olive',
  uri(640, 200, `
    <defs>
      <filter id='w' x='-10%' y='-10%' width='120%' height='120%' color-interpolation-filters='sRGB'>
        <feTurbulence type='fractalNoise' baseFrequency='.003 .045' numOctaves='4' seed='3' stitchTiles='stitch' result='g'/>
        <feTurbulence type='fractalNoise' baseFrequency='.01 .018' numOctaves='2' seed='8' stitchTiles='stitch' result='warp'/>
        <feDisplacementMap in='g' in2='warp' scale='48' xChannelSelector='R' yChannelSelector='G' result='d'/>
        <feColorMatrix in='d' type='matrix' values='1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1' result='grey'/>
        <feComponentTransfer in='grey'>
          <feFuncR type='table' tableValues='.42 .62 .78 .7 .84 .6 .74'/>
          <feFuncG type='table' tableValues='.27 .42 .56 .49 .62 .4 .52'/>
          <feFuncB type='table' tableValues='.14 .23 .33 .28 .4 .21 .3'/>
        </feComponentTransfer>
      </filter>
      <filter id='fine' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.003 .9' numOctaves='2' seed='6' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .2  0 0 0 0 .12  0 0 0 0 .05  0 0 0 -1.5 .9'/></filter>
    </defs>
    <rect width='640' height='200' fill='#b58756'/><rect width='640' height='200' filter='url(#w)'/>
    <rect width='640' height='200' filter='url(#fine)' opacity='.6'/>`, { scale: 2 }),
)

// Uncoated seed-packet paper: tooth and the odd fibre.
{
  const r = rng(31)
  let fibres = ''
  for (let i = 0; i < 16; i++) {
    const x = r() * 160, y = r() * 160, a = r() * Math.PI, l = 4 + r() * 10
    fibres += `<path d='M${f(x)} ${f(y)}q${f(Math.cos(a) * l * 0.5 + 2)} ${f(Math.sin(a) * l * 0.5 - 2)} ${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}' stroke='#a68b5c' stroke-width='.4' fill='none' opacity='.45'/>`
  }
  material(
    'kipos-paper',
    uri(160, 160, `
      <defs>${relief('p', { freq: 0.9, octaves: 3, scale: 0.5, seed: 12, elevation: 72 })}</defs>
      <rect width='160' height='160' fill='#f3e7cb' filter='url(#p)'/>${fibres}`, { scale: 1 }),
  )
}

// A fine grain for anything printed or painted, laid over with soft-light.
material(
  'kipos-grain',
  uri(128, 128, `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='128' height='128' filter='url(#n)' opacity='.5'/>`, { scale: 1 }),
)

// ─── The galvanised watering can ─────────────────────────────────────────────

{
  const spangle = `
    <filter id='spangle' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='turbulence' baseFrequency='.045' numOctaves='1' seed='21'/>
      <feComponentTransfer>
        <feFuncR type='discrete' tableValues='.62 .78 .58 .86 .7 .66 .9 .74'/>
        <feFuncG type='discrete' tableValues='.64 .8 .6 .87 .72 .68 .91 .76'/>
        <feFuncB type='discrete' tableValues='.66 .82 .63 .89 .75 .7 .92 .79'/>
        <feFuncA type='linear' slope='0' intercept='1'/>
      </feComponentTransfer>
    </filter>`
  // Cylinder shading: dark limb, bright band left of centre, soft right limb.
  const metal = (id, x1 = 0, x2 = 1) => `
    <linearGradient id='${id}' x1='${x1}' x2='${x2}' y1='0' y2='0'>
      <stop offset='0' stop-color='#5d6567'/><stop offset='.08' stop-color='#8c9496'/>
      <stop offset='.26' stop-color='#d9dee0'/><stop offset='.34' stop-color='#f4f6f6'/>
      <stop offset='.44' stop-color='#bfc6c8'/><stop offset='.7' stop-color='#949c9f'/>
      <stop offset='.9' stop-color='#b3babd'/><stop offset='1' stop-color='#636b6e'/>
    </linearGradient>`
  const W = 290, H = 176
  // The rose's holes, drawn one by one (a pattern fill bakes as a solid).
  let roseHoles = ''
  for (let y = 29.5; y <= 50.5; y += 3.5)
    for (let x = 15.5; x <= 24.5; x += 3) {
      const dx = (x - 20) / 6.5, dy = (y - 40) / 13
      if (dx * dx + dy * dy < 0.8) roseHoles += `<circle cx='${f(x)}' cy='${f(y)}' r='.8' fill='#3d4446' opacity='.75'/>`
    }
  const bodyX = 112, bodyW = 150, bodyTop = 56, bodyBottom = 166
  const body = `M${bodyX} ${bodyTop}h${bodyW}v${bodyBottom - bodyTop - 8}q0 8 -8 8h${-(bodyW - 16)}q-8 0 -8 -8Z`
  material(
    'kipos-can',
    uri(W, H, `
      <defs>${spangle}${metal('body')}${metal('tube', 0, 0)}
        <linearGradient id='tubeV' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#eef1f2'/><stop offset='.35' stop-color='#b9c0c2'/><stop offset='1' stop-color='#6a7275'/></linearGradient>
        <linearGradient id='handle' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#6d7578'/><stop offset='.45' stop-color='#d8dddf'/><stop offset='1' stop-color='#7b8386'/></linearGradient>
        <radialGradient id='rose' cx='.4' cy='.38' r='.7'><stop offset='0' stop-color='#e6eaeb'/><stop offset='.7' stop-color='#9aa2a5'/><stop offset='1' stop-color='#5e6669'/></radialGradient>
        <clipPath id='bodyClip'><path d='${body}'/></clipPath>
        <linearGradient id='seam' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.7'/><stop offset='.5' stop-color='#fff' stop-opacity='0'/><stop offset='.55' stop-color='#2b3133' stop-opacity='.35'/><stop offset='1' stop-color='#2b3133' stop-opacity='0'/></linearGradient>
      </defs>
      <!-- handle: a rolled tube arching over the top -->
      <path d='M150 60 C150 6 238 6 238 60' fill='none' stroke='#596164' stroke-width='12' stroke-linecap='round'/>
      <path d='M150 60 C150 6 238 6 238 60' fill='none' stroke='url(#handle)' stroke-width='9' stroke-linecap='round'/>
      <path d='M154 52 C156 16 230 14 233 44' fill='none' stroke='#fff' stroke-width='1.6' stroke-opacity='.55' stroke-linecap='round'/>
      <!-- spout: a tapering tube from low on the body up to the rose -->
      <path d='M118 132 L32 40 L22 50 L114 150 Z' fill='url(#tubeV)'/>
      <path d='M116 136 L28 44' stroke='#fff' stroke-opacity='.6' stroke-width='1.5'/>
      <path d='M114 150 L22 50' stroke='#3e4648' stroke-opacity='.45' stroke-width='1.5'/>
      <!-- rose -->
      <g transform='rotate(-48 24 40)'>
        <ellipse cx='24' cy='40' rx='9' ry='17' fill='#7c8487'/>
        <ellipse cx='20' cy='40' rx='8' ry='16' fill='url(#rose)'/>
        ${roseHoles}
      </g>
      <!-- body -->
      <path d='${body}' fill='url(#body)'/>
      <g clip-path='url(#bodyClip)'>
        <rect x='${bodyX}' y='${bodyTop}' width='${bodyW}' height='${bodyBottom - bodyTop}' filter='url(#spangle)' opacity='.38' style='mix-blend-mode:multiply'/>
        <rect x='${bodyX}' y='${bodyTop}' width='${bodyW}' height='${bodyBottom - bodyTop}' fill='url(#body)' opacity='.45'/>
        <rect x='${bodyX}' y='84' width='${bodyW}' height='7' fill='url(#seam)'/>
        <rect x='${bodyX}' y='138' width='${bodyW}' height='7' fill='url(#seam)'/>
        <path d='M${bodyX} 158 h${bodyW}' stroke='#3b2a1a' stroke-opacity='.25' stroke-width='10'/>
      </g>
      <!-- rolled top rim -->
      <rect x='${bodyX - 4}' y='${bodyTop - 6}' width='${bodyW + 8}' height='10' rx='5' fill='url(#body)'/>
      <rect x='${bodyX - 2}' y='${bodyTop - 5}' width='${bodyW + 4}' height='2.4' rx='1.2' fill='#fff' opacity='.6'/>
      <!-- dimple near the base -->
      <ellipse cx='214' cy='120' rx='14' ry='9' fill='#2f3537' opacity='.08'/>
      <ellipse cx='210' cy='116' rx='9' ry='5' fill='#fff' opacity='.12'/>`, { scale: 3 }),
  )
}

// ─── The teneke: a whitewashed olive oil tin ─────────────────────────────────

// The front of the tin, seen a little from above like the bed: its top edge is
// the near half of the round mouth, its foot a curve. The far half of the rim
// and the soil inside are plain CSS behind the plant. Lit as a surface by
// scripts/relief.mjs: a round tin of galvanised steel, its pressed rings and
// rolled rim standing out, under a coat of lime that has flaked away in
// places to show the metal. The lime is matte; the bare steel keeps a sheen.
{
  const W = 180, H = 178, RY = 13, TOP = 13, FOOT = 165
  const face = `M0 ${TOP} A90 ${RY} 0 0 0 180 ${TOP} L180 ${FOOT} A90 ${RY} 0 0 1 0 ${FOOT} Z`
  const ring = (y) => `M0 ${y} A90 ${RY} 0 0 0 180 ${y}`
  // Where the lime has flaked off: torn-edged patches, more of them low down and near the rim.
  const flakes = `<filter id='flake' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='.045' numOctaves='4' seed='23'/>
      <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -30 11.1'/>
    </filter>`
  const coatMask = `<mask id='coat'><rect width='${W}' height='${H}' fill='#fff'/><rect width='${W}' height='${H}' filter='url(#flake)'/><path d='${ring(FOOT - 10)} L180 ${H} L0 ${H} Z' fill='#000' opacity='.5'/></mask>`
  const coat = `<g clip-path='url(#face)' mask='url(#coat)'><rect width='${W}' height='${H}' fill='#f0ece2'/><rect width='${W}' height='${H}' filter='url(#brush)'/></g>`
  const body = `
    <defs>
      <clipPath id='face'><path d='${face}'/></clipPath>
      ${flakes}${coatMask}
      <filter id='brush' x='0' y='0' width='100%' height='100%'>
        <feTurbulence type='fractalNoise' baseFrequency='.07 .018' numOctaves='3' seed='5'/>
        <feColorMatrix values='0 0 0 0 .72  0 0 0 0 .7  0 0 0 0 .64  0 0 0 -1.2 .5'/>
      </filter>
      <filter id='rust' x='0' y='0' width='100%' height='100%'>
        <feTurbulence type='fractalNoise' baseFrequency='.03 .006' numOctaves='3' seed='17'/>
        <feColorMatrix values='0 0 0 0 .52  0 0 0 0 .25  0 0 0 0 .1  0 0 0 -7 3.3'/>
      </filter>
    </defs>
    <g clip-path='url(#face)'>
      <rect width='${W}' height='${H}' fill='#9b9d96'/>
      <rect width='${W}' height='${H}' filter='url(#rust)' opacity='.45'/>
      <path d='${ring(FOOT - 8)} L180 ${H} L0 ${H} Z' fill='#7a3f1c' opacity='.35'/>
    </g>
    ${coat}
    <g clip-path='url(#face)'>
      <!-- the oil company's print, ghosting through the lime -->
      <g opacity='.3' font-family='Georgia, serif' text-anchor='middle'>
        <rect x='38' y='80' width='104' height='27' rx='3' fill='none' stroke='#1f4f8f' stroke-width='2'/>
        <text x='90' y='99' font-size='14' letter-spacing='1.5' fill='#1f4f8f'>ΕΛΑΙΟΛΑΔΟ</text>
        <text x='90' y='128' font-size='8.5' letter-spacing='3' fill='#a8312a'>ΚΡΗΤΗΣ · 17 KG</text>
      </g>
      <!-- rust weeping from the rim -->
      <path d='M30 22 q2 18 -1 34 q-2 8 1 12' stroke='#8a4a22' stroke-opacity='.28' stroke-width='2.4' fill='none' stroke-linecap='round'/>
      <path d='M131 25 q-1 12 2 22' stroke='#8a4a22' stroke-opacity='.22' stroke-width='2' fill='none' stroke-linecap='round'/>
    </g>
    <path d='${ring(TOP)}' stroke='#e9e5da' stroke-width='6' fill='none' stroke-linecap='round'/>`
  material(
    'kipos-teneke',
    lit(W, H, {
      body,
      material: { bump: 1, ambient: 0.34, spec: 0.5, shine: 36, rim: 0, rimColour: [0, 0, 0], occlusion: 0.5 },
      async height(api) {
        // Round: the tin turns away from you to either side.
        api.cylinder({ left: -4, right: 184, amount: 60 })
        // Pressed rings and the rolled rim stand proud; each ring has a hollow beside it.
        for (const y of [60, 118]) {
          api.ridge(ring(y), { width: 4, amount: 2.4 })
          api.groove(ring(y + 4), { width: 2.4, amount: 1.4 })
        }
        api.ridge(ring(TOP), { width: 6, amount: 4 })
        api.ridge(ring(FOOT - 2), { width: 4, amount: 1.6 })
        // A soft dent.
        api.groove('M118 90 l14 2', { width: 16, blur: 9, amount: 3.5 })
        // The lime stands a little proud of the bare steel, and takes the sheen off it.
        await api.raster(svgOf(W, H, `<defs><clipPath id='face'><path d='${face}'/></clipPath>${flakes}${coatMask}</defs><g clip-path='url(#face)' mask='url(#coat)'><rect width='${W}' height='${H}' fill='#fff'/></g>`), { amount: 0.7, matte: 0.08 })
        api.grain(77, 0.8, 0.22)
      },
    }),
  )
}

// ─── Packet illustrations: lithograph-style, with a halftone screen ───────────

const halftone = `<pattern id='dots' width='3.2' height='3.2' patternUnits='userSpaceOnUse' patternTransform='rotate(30)'><circle cx='1.6' cy='1.6' r='.75' fill='#000' opacity='.22'/></pattern>
  <filter id='white'><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter>`
// The art, then the halftone screen printed only where there is ink.
const printed = (art) => `<g id='art'>${art}</g><mask id='ink'><use href='#art' filter='url(#white)'/></mask><rect width='64' height='56' fill='url(#dots)' mask='url(#ink)'/>`
{
  const leaf = (x, y, r, s = 1) =>
    `<path transform='translate(${x} ${y}) rotate(${r}) scale(${s})' d='M0 0 C6 -9 20 -10 30 -2 C22 4 9 6 0 0Z' fill='#4d7a33'/><path transform='translate(${x} ${y}) rotate(${r}) scale(${s})' d='M1 0 L27 -2' stroke='#a8c97a' stroke-width='.8'/>`
  const tomato = (x, y, r) => `
    <circle cx='${x}' cy='${y}' r='${r}' fill='#d23c22'/>
    <path d='M${x - r * 0.62} ${y - r * 0.55} A${r} ${r} 0 0 1 ${x + r * 0.3} ${y - r * 0.92}' stroke='#f58a6a' stroke-width='${f(r * 0.28)}' fill='none' stroke-linecap='round' opacity='.85'/>
    <path d='M${x} ${y - r + 2} l-${r * 0.45} -2 l${r * 0.3} 3 l-${r * 0.2} 4 l${r * 0.35} -3 l${r * 0.35} 3 l-${r * 0.15} -4 l${r * 0.3} -3 Z' fill='#3c6a28'/>`
  material(
    'kipos-art-tomato',
    uri(64, 56, `<defs>${halftone}</defs>${printed(`
      <path d='M8 6 C24 2 40 6 58 4' stroke='#5b8a3a' stroke-width='2' fill='none'/>
      ${leaf(14, 8, 20, 0.8)}${leaf(44, 6, 150, 0.7)}
      ${tomato(22, 32, 14)}${tomato(44, 38, 12)}${tomato(36, 18, 8)}`)}`),
  )
  material(
    'kipos-art-cucumber',
    uri(64, 56, `<defs>${halftone}<linearGradient id='c' x1='0' x2='0' y1='0' y2='1'><stop offset='0' stop-color='#6d9a4a'/><stop offset='.4' stop-color='#3e6b2a'/><stop offset='1' stop-color='#22421a'/></linearGradient></defs>${printed(`
      ${leaf(10, 14, -10, 0.9)}
      <path d='M6 40 C14 20 40 14 58 22 C60 28 58 30 52 30 C38 26 20 32 12 46 C8 48 5 45 6 40Z' fill='url(#c)'/>
      <path d='M14 38 C20 28 36 22 52 25' stroke='#a8cc80' stroke-width='1.4' fill='none' opacity='.7'/>
      <path d='M14 50 C22 38 40 32 58 36 C59 41 57 43 52 43 C38 41 24 46 18 54 C13 56 12 53 14 50Z' fill='url(#c)'/>
      <circle cx='40' cy='12' r='5' fill='#f2c42e'/><circle cx='40' cy='12' r='1.8' fill='#c98a10'/>`)}`),
  )
  material(
    'kipos-art-watermelon',
    uri(64, 56, `<defs>${halftone}</defs>${printed(`
      <ellipse cx='26' cy='24' rx='22' ry='15' fill='#4f8a3c'/>
      <path d='M8 22 C14 18 18 30 26 26 C34 22 38 30 46 24 M10 30 C18 26 22 36 30 32 C36 28 42 34 46 30 M12 16 C18 12 24 22 32 16 C38 12 42 20 46 17' stroke='#24501d' stroke-width='3.4' fill='none'/>
      <path d='M24 52 L60 52 A18 18 0 0 0 24 52Z' transform='rotate(-8 42 52)' fill='#2f6b26'/>
      <path d='M27 51 L58 51 A15.5 15.5 0 0 0 27 51Z' transform='rotate(-8 42 52)' fill='#f2ead0'/>
      <path d='M29 50.5 L56 50.5 A13.5 13.5 0 0 0 29 50.5Z' transform='rotate(-8 42 52)' fill='#e8475a'/>
      <g fill='#2a1a12' transform='rotate(-8 42 52)'><ellipse cx='36' cy='46' rx='.9' ry='1.5'/><ellipse cx='42' cy='42' rx='.9' ry='1.5'/><ellipse cx='48' cy='46' rx='.9' ry='1.5'/><ellipse cx='42' cy='48' rx='.9' ry='1.5'/></g>`)}`),
  )
}

// ─── Botanicals ──────────────────────────────────────────────────────────────
//
// Every plant drawing is lit as a surface by scripts/relief.mjs: the colour
// layer below carries only the plant's own colours, and the height layer says
// how each leaflet domes, where veins sink in, where a stem stands proud. The
// sun is at the upper left, as for the rest of the bed.

// A serrated leaflet along +x from the base at (0, 0): half-width profile with
// teeth, as a closed polygon.
function leaflet(length, width, teeth, r, { tip = 1, blunt = 0 } = {}) {
  const top = [], bottom = []
  const steps = teeth * 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const half = width * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.02)), 0.75) * (1 - 0.15 * t) * (t > 0.85 ? 1 - (t - 0.85) * (1 - blunt) * 4 * tip : 1)
    const tooth = i % 2 === 1 && t > 0.12 && t < 0.92 ? width * 0.14 * (0.6 + r() * 0.6) : 0
    const x = length * t
    top.push([x + (tooth ? length * 0.02 : 0), -(Math.max(0, half) + tooth)])
    bottom.push([x + (tooth ? length * 0.02 : 0), Math.max(0, half) + tooth * (0.8 + r() * 0.3)])
  }
  return [...top, ...bottom.reverse()]
}

const mirrorX = (w, body) => `<g transform='translate(${w} 0) scale(-1 1)'>${body}</g>`

/** Translate then rotate, as a canvas matrix, to place a part in the height layer. */
function turn(x, y, deg) {
  const a = (deg * Math.PI) / 180
  return [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), x, y]
}
const at = (x, y, deg) => `translate(${f(x)} ${f(y)}) rotate(${f(deg)})`

const ellipse = (cx, cy, rx, ry) =>
  `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`

/** Fine pale hairs over a rough leaf, scattered across a box and clipped to it by the caller. */
function hairs(seed, w, h, count, opacity) {
  const r = rng(seed)
  let dots = ''
  for (let i = 0; i < count; i++)
    dots += `<circle cx='${f(r() * w)}' cy='${f(r() * h)}' r='${f(0.18 + r() * 0.2)}' fill='#eef4dc' opacity='${f(opacity * (0.4 + r() * 0.6))}'/>`
  return dots
}

/** A lit drawing, baked at the end of the run. */
function lit(w, h, { body, height, material, scale = 2, mirror = false, quality, shadow }) {
  const token = `@@bake-${bakes.length}@@`
  bakes.push({
    token,
    run: () =>
      litDrawing({ w, h, scale, mirror, shadow, svg: svgOf(w, h, mirror ? mirrorX(w, body) : body), height, material: MATERIALS[material] ?? material, quality }),
  })
  return token
}

/** A sprite class for both orientations: `-r` grows right, `-l` left. The sun stays at the upper left on both. */
function litSprite(name, w, h, drawing) {
  rule(`.kipos-sprite--${name}-r`, [`background-image: ${lit(w, h, drawing)}`])
  rule(`.kipos-sprite--${name}-l`, [`background-image: ${lit(w, h, { ...drawing, mirror: true })}`])
}
const litSingle = (name, w, h, drawing) => rule(`.kipos-sprite--${name}`, [`background-image: ${lit(w, h, drawing)}`])

// Tomato: a compound leaf. Rachis from the stem at the left, toothed leaflets
// in pairs, small leaflets between them, and a terminal leaflet. Each leaflet
// domes on its own, quilted by its sunken midrib and side veins. 120 x 64.
for (let v = 0; v < 3; v++) {
  const r = rng(100 + v)
  const W = 120, H = 64, cy = 34
  const rachis = (t) => [6 + t * 104, cy - Math.sin(t * Math.PI) * (6 + v * 2) + t * 4]
  const greens = [['#3c6a28', '#44732d', '#386425', '#416e2b'], ['#447330', '#4c7c34', '#3f6c2c', '#477631'], ['#38622a', '#406b2c', '#355d27', '#3d672b']][v]
  const leaflets = []
  const add = (t, side, size, angle = side * (52 - t * 18 + (r() - 0.5) * 14) - 6, xy = rachis(t)) => {
    const L = 26 * size, Wd = 7.5 * size
    leaflets.push({ x: xy[0], y: xy[1], angle, L, Wd, shape: closed(leaflet(L, Wd, 7, r)), colour: greens[Math.floor(r() * greens.length)] })
  }
  for (const [i, t] of [0.22, 0.44, 0.64, 0.82].entries()) {
    const size = 1 - i * 0.12 + (r() - 0.5) * 0.1
    add(t, -1, size)
    add(t + 0.04, 1, size * 0.95)
    if (i < 3) {
      add(t + 0.11, -1, 0.34)
      add(t + 0.12, 1, 0.3)
    }
  }
  const [tx, ty] = rachis(0.94)
  add(0.94, 1, 22 / 26, 4, [tx - 6, ty])
  const rachisPath = `M${pts(Array.from({ length: 11 }, (_, i) => rachis((i / 10) * 0.96)))}`
  const veins = (l) => {
    let d = ''
    for (let k = 0.22; k < 0.8; k += 0.16)
      d += `M${f(l.L * k)} 0 q${f(l.L * 0.08)} ${f(-l.Wd * 0.3)} ${f(l.L * 0.16)} ${f(-l.Wd * 0.62)} M${f(l.L * k)} 0 q${f(l.L * 0.08)} ${f(l.Wd * 0.3)} ${f(l.L * 0.16)} ${f(l.Wd * 0.62)}`
    return d
  }
  let body = `<defs><radialGradient id='margin' cx='.4' cy='.5' r='.65'><stop offset='.55' stop-color='#d8e08a' stop-opacity='0'/><stop offset='1' stop-color='#b6c86c' stop-opacity='.22'/></radialGradient></defs>`
  body += `<path d='${rachisPath}' stroke='#5b8a3c' stroke-width='2.4' fill='none' stroke-linecap='round'/>`
  for (const l of leaflets)
    body += `<g transform='${at(l.x, l.y, l.angle)}'><path d='${l.shape}' fill='${l.colour}'/><path d='${l.shape}' fill='url(#margin)'/>
      <path d='M1 0 L${f(l.L * 0.92)} 0' stroke='#a3c26f' stroke-width='.55' stroke-opacity='.8'/>
      <path d='${veins(l)}' stroke='#93b462' stroke-width='.35' fill='none' stroke-opacity='.6'/></g>`
  litSprite(`tomato-leaf-${v}`, W, H, {
    shadow: { x: 1, y: 1.4, blur: 1.1, opacity: 0.38 },
    body,
    material: { ...MATERIALS.leaf, spec: 0.12, shine: 16, rim: 0.25 },
    height(api) {
      api.ridge(rachisPath, { width: 2.4, amount: 1.4 })
      for (const l of leaflets) {
        const t = turn(l.x, l.y, l.angle)
        api.dome(l.shape, { blur: l.Wd * 0.45, amount: l.Wd * 0.42, transform: t })
        api.groove(`M1 0 L${f(l.L * 0.92)} 0`, { width: 0.7, amount: 0.55, transform: t })
        api.groove(veins(l), { width: 0.5, amount: 0.3, transform: t })
      }
      api.grain(7 + v, 1.1, 0.22)
    },
  })
}

// Cotyledon: a smooth, fleshy seed leaf.
{
  const blade = 'M2 9 C10 1 30 0 38 8 C30 16 10 17 2 9Z'
  litSprite('cotyledon', 40, 18, {
    body: `<path d='${blade}' fill='#8cc062'/><path d='M3 9 L34 8' stroke='#c9e6a2' stroke-width='.7' opacity='.8'/>`,
    material: 'glossyLeaf',
    height(api) {
      api.dome(blade, { blur: 3, amount: 3.2 })
      api.groove('M3 9 L34 8', { width: 0.8, amount: 0.5 })
    },
  })
}

// Cucumber: palmate, five shallow pointed lobes, finely toothed. Rough and
// matte: the blade puckers between sunken veins and is covered in fine hairs.
for (let v = 0; v < 2; v++) {
  const r = rng(200 + v)
  const W = 90, H = 90, cx = 45, cy = 48, R = 36
  const outline = []
  const N = 160
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    // Lobes at five directions above the petiole; the sinus at the bottom.
    const lobe = Math.pow(Math.abs(Math.cos(2.5 * (a - Math.PI / 2))), 0.7)
    const sinus = 1 - 0.55 * Math.exp(-Math.pow((a - Math.PI / 2) / 0.28, 2))
    const tooth = i % 4 === 0 ? 1.04 + r() * 0.04 : 1
    const rr = R * (0.72 + 0.28 * lobe) * sinus * tooth
    outline.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.96])
  }
  const blade = closed(outline)
  let main = '', side = ''
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.75
    const ex = cx + Math.cos(a) * R * 0.92, ey = cy + Math.sin(a) * R * 0.92
    main += `M${cx} ${cy + 10} Q${f(cx + Math.cos(a) * R * 0.35)} ${f(cy + Math.sin(a) * R * 0.35)} ${f(ex)} ${f(ey)} `
    // Side veins off each main vein, branching towards the margin.
    for (const t of [0.45, 0.7]) {
      const px = cx + (ex - cx) * t, py = cy + 10 + (ey - cy - 10) * t
      for (const s of [-1, 1]) side += `M${f(px)} ${f(py)} l${f(Math.cos(a + s * 0.9) * R * 0.22)} ${f(Math.sin(a + s * 0.9) * R * 0.22)} `
    }
  }
  const petiole = `M${cx} ${cy + 10} L${cx + 2} ${H - 1}`
  litSprite(`cucumber-leaf-${v}`, W, H, {
    shadow: { x: 1.6, y: 2.2, blur: 1.8, opacity: 0.38 },
    body: `<defs><clipPath id='b'><path d='${blade}'/></clipPath></defs>
      <path d='${petiole}' stroke='#5a8a3a' stroke-width='3' stroke-linecap='round'/>
      <path d='${blade}' fill='${v ? '#4a7a32' : '#518236'}'/>
      <g clip-path='url(#b)'>${hairs(201 + v, W, H, 520, 0.22)}</g>
      <path d='${main}' stroke='#b9d48c' stroke-width='1.1' fill='none' stroke-opacity='.75'/>
      <path d='${side}' stroke='#a8c67c' stroke-width='.55' fill='none' stroke-opacity='.6'/>`,
    material: 'matteLeaf',
    height(api) {
      api.ridge(petiole, { width: 3, amount: 2 })
      api.dome(blade, { blur: 7, amount: 5 })
      api.groove(main, { width: 1.5, amount: 1.4 })
      api.groove(side, { width: 0.9, amount: 0.7 })
      api.grain(210 + v, 4.5, 1.6)
      api.grain(220 + v, 0.7, 0.3)
    },
  })
}

// Watermelon: deeply cut, three main lobes each lobed again, grey-green with
// silvery veins. Each lobe domes on its own; the cuts between them fall away.
for (let v = 0; v < 2; v++) {
  const r = rng(300 + v)
  const W = 100, H = 80, cx = 50, cy = 46, R = 38
  const outline = []
  const N = 220
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const main = Math.pow(Math.abs(Math.cos(1.5 * (a + Math.PI / 2))), 0.55)
    const sub = 0.82 + 0.18 * Math.cos(7.5 * a + v)
    const rr = R * (0.32 + 0.68 * main * sub) * (0.95 + r() * 0.06)
    outline.push([cx + Math.cos(a) * rr * 1.08, cy + Math.sin(a) * rr * 0.82])
  }
  const blade = smooth(outline.filter((_, i) => i % 2 === 0), 0.6)
  let veins = ''
  for (const a of [-Math.PI / 2, -Math.PI / 2 - 2.09, -Math.PI / 2 + 2.09, -Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05])
    veins += `M${cx} ${cy} L${f(cx + Math.cos(a) * R * 0.78 * 1.08)} ${f(cy + Math.sin(a) * R * 0.78 * 0.82)} `
  litSprite(`melon-leaf-${v}`, W, H, {
    shadow: { x: 1.4, y: 2, blur: 1.6, opacity: 0.38 },
    body: `<defs><clipPath id='b'><path d='${blade}'/></clipPath></defs>
      <path d='${blade}' fill='${v ? '#58764a' : '#5f7e4e'}'/>
      <g clip-path='url(#b)'>${hairs(301 + v, W, H, 420, 0.2)}<path d='${veins}' stroke='#dbe6c6' stroke-width='.9' stroke-opacity='.75'/></g>`,
    material: { ...MATERIALS.matteLeaf, rimColour: [0.6, 0.7, 0.45] },
    height(api) {
      api.dome(blade, { blur: 3.6, amount: 3.6 })
      api.groove(veins, { width: 1.1, amount: 0.9 })
      api.grain(310 + v, 3.5, 1.1)
      api.grain(320 + v, 0.7, 0.25)
    },
  })
}

// Basil: ovate, cupped and glossy, quilted between arched side veins.
for (let v = 0; v < 3; v++) {
  const r = rng(400 + v)
  const W = 64, H = 50
  const twist = (r() - 0.5) * 6
  const blade = `M4 ${26 + twist * 0.2} C10 ${6 + twist} 44 ${2 + twist} 60 ${22 + twist * 0.4} C46 ${44 - twist} 14 ${46 - twist} 4 ${26 + twist * 0.2}Z`
  const midrib = `M5 26 C24 ${20 + twist * 0.5} 44 ${18 + twist * 0.4} 58 22`
  let side = ''
  for (let k = 0; k < 4; k++) {
    const x = 14 + k * 10
    side += `M${x} ${f(24 + twist * 0.1)} q4 -8 10 -12 M${x} ${f(24 + twist * 0.1)} q4 8 10 11 `
  }
  litSprite(`basil-leaf-${v}`, W, H, {
    shadow: { x: 1.1, y: 1.6, blur: 1.2, opacity: 0.4 },
    body: `<path d='${blade}' fill='${['#3b8130', '#438a35', '#37772d'][v]}'/>
      <path d='${midrib}' stroke='#b6e08e' stroke-width='1' fill='none' stroke-opacity='.7'/>
      <path d='${side}' stroke='#a4d47e' stroke-width='.55' fill='none' stroke-opacity='.55'/>`,
    material: 'glossyLeaf',
    height(api) {
      api.dome(blade, { blur: 7, amount: 7 })
      api.groove(midrib, { width: 1.4, amount: 1.4 })
      api.groove(side, { width: 1, amount: 0.9 })
      api.grain(410 + v, 0.9, 0.12)
    },
  })
}

// Geranium: round, toothed and velvety, with the dark horseshoe of a zonal
// geranium. The blade is gently waved and its veins fan from the stalk.
for (let v = 0; v < 2; v++) {
  const W = 80, H = 66, cx = 40, cy = 34, R = 30
  const outline = []
  // Seven shallow lobes, each finely toothed, and a deep notch where the stalk joins.
  for (let i = 0; i < 168; i++) {
    const a = (i / 168) * Math.PI * 2
    const lobes = 1 + 0.1 * Math.pow(Math.abs(Math.cos(3.5 * (a - Math.PI / 2))), 0.7)
    const teeth = 1 + 0.025 * Math.abs(Math.sin(21 * a + v))
    const notch = 1 - 0.5 * Math.exp(-Math.pow((a - Math.PI / 2) / 0.24, 2))
    const rr = R * 0.94 * lobes * teeth * notch
    outline.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92])
  }
  const blade = smooth(outline.filter((_, i) => i % 2 === 0), 0.8)
  const veins = Array.from({ length: 7 }, (_, k) => {
    const a = Math.PI / 2 + Math.PI * 0.2 + (k / 6) * Math.PI * 1.6
    return `M${cx} ${f(cy + R * 0.58)} Q${f(cx + Math.cos(a) * R * 0.4)} ${f(cy + R * 0.3 + Math.sin(a) * R * 0.4)} ${f(cx + Math.cos(a) * R * 0.9)} ${f(cy + Math.sin(a) * R * 0.84)}`
  }).join(' ')
  litSprite(`geranium-leaf-${v}`, W, H, {
    shadow: { x: 1.4, y: 2, blur: 1.6, opacity: 0.36 },
    body: `<defs>
        <radialGradient id='zone' cx='.5' cy='.58' r='.5'><stop offset='.36' stop-color='#5c2a16' stop-opacity='0'/><stop offset='.5' stop-color='#5c2a16' stop-opacity='.42'/><stop offset='.64' stop-color='#4a2a14' stop-opacity='.34'/><stop offset='.78' stop-color='#4a3a1e' stop-opacity='0'/></radialGradient>
        <clipPath id='b'><path d='${blade}'/></clipPath>
      </defs>
      <path d='${blade}' fill='${v ? '#5a8a3a' : '#62913f'}'/>
      <path d='${blade}' fill='url(#zone)'/>
      <g clip-path='url(#b)'>${hairs(501 + v, W, H, 700, 0.18)}</g>
      <path d='${veins}' stroke='#b9d38e' stroke-width='.7' fill='none' stroke-opacity='.5'/>`,
    material: 'velvet',
    height(api) {
      api.dome(blade, { blur: 7, amount: 5 })
      api.groove(veins, { width: 1.2, amount: 0.8 })
      // A gentle wave round the margin.
      api.grain(510 + v, 7, 2.2)
      api.grain(520 + v, 0.6, 0.18)
    },
  })
}

// Flowers: petals that dome and curl back, round a raised centre.
{
  const petal = 'M12 12 C13.6 8 13 3 12 1.5 C11 3 10.4 8 12 12Z'
  litSingle('tomato-flower', 24, 24, {
    scale: 3,
    body: `${Array.from({ length: 5 }, (_, k) => `<path transform='rotate(${k * 72 + 10} 12 12)' d='${petal}' fill='#f4cd2c'/>`).join('')}
      <path d='M10.4 9 L12 4.5 L13.6 9 Z' fill='#d8a018'/><circle cx='12' cy='12' r='2' fill='#c88a0c'/>`,
    material: 'petal',
    height(api) {
      for (let k = 0; k < 5; k++) api.dome(petal, { blur: 0.9, amount: 1.4, transform: rotateAbout(12, 12, k * 72 + 10) })
      api.bumps([[12, 9, 1.4, 1.6], [12, 12, 2, 1]])
    },
  })
  const squash = 'M14 14 C8 10 8 2 14 1 C20 2 20 10 14 14Z'
  litSingle('squash-flower', 28, 28, {
    scale: 3,
    body: `${Array.from({ length: 5 }, (_, k) => `<path transform='rotate(${k * 72} 14 14)' d='${squash}' fill='#f5c232'/><path transform='rotate(${k * 72} 14 14)' d='M14 13 L14 4' stroke='#e2a52a' stroke-width='.5'/>`).join('')}
      <circle cx='14' cy='14' r='3' fill='#d98a10'/>`,
    material: 'petal',
    height(api) {
      for (let k = 0; k < 5; k++) {
        api.dome(squash, { blur: 1.4, amount: 1.8, transform: rotateAbout(14, 14, k * 72) })
        api.groove('M14 13 L14 4', { width: 0.6, amount: 0.4, transform: rotateAbout(14, 14, k * 72) })
      }
      api.bumps([[14, 14, 2.6, 1.8]])
    },
  })
}

/** Rotation about a point, as a canvas matrix. */
function rotateAbout(x, y, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return [c, s, -s, c, x - c * x + s * y, y - s * x - c * y]
}

// Tomato fruit: a slightly flattened globe with soft ribs running from the
// stalk, waxy enough to hold a hard little highlight, under a matte calyx.
// Green and ripe versions, cross-faded by --ripe.
{
  const r = rng(500)
  const W = 44, H = 42, cx = 22, cy = 24, R = 17.5
  const outline = []
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2
    const rr = R * (1 + 0.035 * Math.cos(5 * a + 0.4)) * (1 + 0.02 * r())
    outline.push([cx + Math.cos(a) * rr * 1.04, cy + Math.sin(a) * rr * 0.92])
  }
  const globe = smooth(outline.filter((_, i) => i % 3 === 0))
  const sepals = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 + 0.3
    const lx = cx + Math.cos(a) * 9, ly = cy - 14 + Math.sin(a) * 3.2
    return `M${cx} ${cy - 15} Q${f((cx + lx) / 2 + Math.sin(a) * 2)} ${f((cy - 15 + ly) / 2 - 1.5)} ${f(lx)} ${f(ly + (Math.sin(a) > 0 ? 1.5 : -0.5))}`
  }).join(' ')
  const ribs = Array.from({ length: 5 }, (_, k) => {
    const a = (k / 5) * Math.PI * 2 + 0.4
    return `M${cx} ${cy - 13} Q${f(cx + Math.cos(a) * R * 0.7)} ${f(cy - 13 + Math.sin(a) * R * 0.4 + 6)} ${f(cx + Math.cos(a) * R * 1.02)} ${f(cy + Math.sin(a) * R * 0.85)}`
  }).join(' ')
  const stalk = `M${cx} ${cy - 15} l.5 -5`
  const fruit = (skin, shoulder) => `
    <defs><radialGradient id='s' cx='.5' cy='.12' r='.55'><stop offset='0' stop-color='${shoulder}'/><stop offset='1' stop-color='${shoulder}' stop-opacity='0'/></radialGradient></defs>
    <path d='${globe}' fill='${skin}'/><path d='${globe}' fill='url(#s)'/>
    <path d='${sepals}' stroke='#3f6f2a' stroke-width='2.2' stroke-linecap='round' fill='none'/>
    <path d='${stalk}' stroke='#4c7d32' stroke-width='2.4' stroke-linecap='round'/>`
  const height = (api) => {
    api.dome(globe, { blur: 7, amount: 14 })
    api.groove(ribs, { width: 3.2, blur: 2.4, amount: 1.4 })
    api.ridge(sepals, { width: 2.2, amount: 1.6 })
    api.ridge(stalk, { width: 2.4, amount: 2.2 })
    api.matte(sepals, { stroke: 2.6 })
    api.matte(stalk, { stroke: 2.8 })
  }
  const shadow = { x: 1.2, y: 1.8, blur: 1.4, opacity: 0.42 }
  litSingle('tomato-green', W, H, { scale: 3, shadow, body: fruit('#8eb24c', '#c5d681'), material: { ...MATERIALS.waxyFruit, spec: 0.6 }, height })
  const red = lit(W, H, { scale: 3, shadow, body: fruit('#d9361b', '#e8742c'), material: 'waxyFruit', height })
  rule('.kipos-sprite--tomato-red', [`background-image: ${red}`])
  // The ripe drawing is also laid over a green tomato, so it can cross-fade into it.
  material('kipos-tomato-red', red)
}

// Cucumber: long, slightly curved and dark, paler stripes from the blossom
// end, its skin raised in little warts each tipped with a pale spine.
{
  const r = rng(600)
  const W = 22, H = 72
  const body = 'M11 2 C17 4 18 20 17.5 40 C17 58 15 69 11 70 C7 69 4.5 58 4.5 40 C4.5 20 5 4 11 2Z'
  const warts = []
  for (let i = 0; i < 34; i++) warts.push([5.5 + r() * 11, 7 + r() * 60, 0.75 + r() * 0.35, 0.9])
  litSingle('cucumber', W, H, {
    shadow: { x: 1.2, y: 1.8, blur: 1.2, opacity: 0.4 },
    scale: 3,
    body: `<defs><linearGradient id='st' x1='0' y1='1' x2='0' y2='0'><stop offset='0' stop-color='#a9c77a' stop-opacity='.6'/><stop offset='.6' stop-color='#a9c77a' stop-opacity='0'/></linearGradient></defs>
      <path d='${body}' fill='#3c6b2b'/>
      <path d='M8 66 C7 50 7 30 8 14 M14 66 C15 50 15 30 14 14' stroke='url(#st)' stroke-width='2' fill='none'/>
      ${warts.map(([x, y]) => `<circle cx='${f(x)}' cy='${f(y)}' r='.35' fill='#eef3d6'/>`).join('')}
      <path d='M11 2 l0 -2' stroke='#4c7d32' stroke-width='2.6' stroke-linecap='round'/>
      <circle cx='11' cy='69' r='1.6' fill='#d9c66a' opacity='.8'/>`,
    material: 'rind',
    height(api) {
      api.dome(body, { blur: 4, amount: 9 })
      api.bumps(warts, 0.5)
      api.ridge('M11 2 l0 -2', { width: 2.6, amount: 1.5 })
    },
  })
}

// Watermelon: dark green bands running pole to pole, their edges torn into
// the jagged flames of a Crimson Sweet, over a pale rind with a dull bloom
// and the yellow spot it lay on. A big, hard globe with a soft waxy sheen.
{
  const W = 132, H = 86, cx = 66, cy = 44, rx = 62, ry = 39
  let stripes = ''
  for (let k = -7; k <= 7; k++) {
    // Each band follows a line of longitude: squeezed together near the poles.
    const offset = (k / 7.2) * ry
    const top = [], bottom = []
    for (let x = cx - rx - 4; x <= cx + rx + 4; x += 2) {
      const lat = Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / rx, 2)))
      const width = 1.55 * (0.3 + 0.7 * lat)
      top.push([x, cy + offset * lat - width])
      bottom.push([x, cy + offset * lat + width])
    }
    stripes += `<path d='M${pts(top)} L${pts(bottom.reverse())}Z'/>`
  }
  const globe = ellipse(cx, cy, rx, ry)
  const stalk = `M${cx + rx - 3} ${cy - 3} q5 -1 7 -6`
  litSingle('melon', W, H, {
    body: `<defs>
        <clipPath id='e'><path d='${globe}'/></clipPath>
        <filter id='flame' x='-5%' y='-5%' width='110%' height='110%'>
          <feTurbulence type='fractalNoise' baseFrequency='.09 .35' numOctaves='3' seed='12' result='n'/>
          <feDisplacementMap in='SourceGraphic' in2='n' scale='4.5' xChannelSelector='R' yChannelSelector='G'/>
        </filter>
        <filter id='bloom' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.05' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 .82  0 0 0 0 .87  0 0 0 0 .74  0 0 0 -2 1.1'/></filter>
        <filter id='speck' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='6'/><feColorMatrix values='0 0 0 0 .1  0 0 0 0 .22  0 0 0 0 .08  0 0 0 -9 4.4'/></filter>
      </defs>
      <g clip-path='url(#e)'>
        <rect width='${W}' height='${H}' fill='#a6c87e'/>
        <g fill='#244f1d' filter='url(#flame)'>${stripes}</g>
        <rect width='${W}' height='${H}' filter='url(#speck)' opacity='.35'/>
        <rect width='${W}' height='${H}' filter='url(#bloom)' opacity='.32'/>
        <ellipse cx='${cx + 10}' cy='${cy + ry - 3}' rx='30' ry='9' fill='#e2cc78' opacity='.7' filter='url(#flame)'/>
      </g>
      <path d='${stalk}' stroke='#5b7a34' stroke-width='2' fill='none' stroke-linecap='round'/>`,
    material: { ...MATERIALS.rind, spec: 0.32, shine: 22, ambient: 0.3 },
    height(api) {
      api.dome(globe, { blur: 22, amount: 30 })
      api.ridge(stalk, { width: 2, amount: 1.4 })
      api.grain(830, 1.4, 0.3)
      api.matte(stalk, { stroke: 2.4 })
    },
  })
}

// Geranium umbel: a dome of five-petalled florets in coral and scarlet, with
// a few buds. The head is round as a whole, and every petal cups.
{
  const r = rng(800)
  const W = 64, H = 56
  const reds = ['#e8473a', '#f05a48', '#d9362c', '#f26b55', '#c92e26']
  const placed = []
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 20
    placed.push([32 + Math.cos(a) * d * 1.1, 28 + Math.sin(a) * d * 0.85, 6.5 + r() * 2.5, r() * 72, reds[Math.floor(r() * reds.length)]])
  }
  placed.sort((p, q) => p[1] - q[1])
  const buds = Array.from({ length: 4 }, () => [10 + r() * 44, 44 + r() * 8])
  const petals = (x, y, s, rot) => Array.from({ length: 5 }, (_, k) => [ellipse(x, y - s * 0.55, s * 0.42, s * 0.55), rotateAbout(x, y, rot + k * 72), `rotate(${f(rot + k * 72)} ${f(x)} ${f(y)})`])
  let body = buds.map(([x, y]) => `<ellipse cx='${f(x)}' cy='${f(y)}' rx='2.4' ry='3.2' fill='#8a9a4a'/><ellipse cx='${f(x)}' cy='${f(y - 1.5)}' rx='1.6' ry='1.8' fill='#e8473a'/>`).join('')
  for (const [x, y, s, rot, c] of placed) {
    body += petals(x, y, s, rot).map(([d, , tf]) => `<path d='${d}' fill='${c}' transform='${tf}'/>`).join('')
    body += `<circle cx='${f(x)}' cy='${f(y)}' r='${f(s * 0.22)}' fill='#fff2d2' opacity='.85'/>`
  }
  litSingle('bloom', W, H, {
    shadow: { x: 1.2, y: 1.8, blur: 1.4, opacity: 0.3 },
    scale: 3,
    body,
    material: 'petal',
    height(api) {
      api.dome(ellipse(32, 30, 26, 22), { blur: 10, amount: 8 })
      for (const [x, y, s, rot] of placed) for (const [d, t] of petals(x, y, s, rot)) api.dome(d, { blur: s * 0.18, amount: 1.2, transform: t })
      api.bumps(buds.map(([x, y]) => [x, y, 2.6, 1.6]))
    },
  })
}

// Stems, vines and flower stalks: a lit, round tile repeated along each
// segment. A tomato stem is downy, a cucumber vine ridged, a geranium stalk
// smooth and blushed. 10 units across, 24 along.
{
  const r = rng(960)
  let down = ''
  for (let i = 0; i < 70; i++) down += `<circle cx='${f(0.8 + r() * 8.4)}' cy='${f(r() * 24)}' r='${f(0.18 + r() * 0.16)}' fill='#e4eecb' opacity='${f(0.25 + r() * 0.35)}'/>`
  let streaks = ''
  for (let i = 0; i < 6; i++) {
    const x = 1 + r() * 8
    streaks += `<path d='M${f(x)} 0 L${f(x + (r() - 0.5))} 24' stroke='${r() < 0.5 ? '#2f5420' : '#8fb862'}' stroke-width='.4' opacity='.45'/>`
  }
  const round = (api) => api.cylinder({ left: -0.3, right: 10.3, amount: 4.5 })
  material('kipos-stem', lit(10, 24, { scale: 4, body: `<rect width='10' height='24' fill='#4f7f35'/>${streaks}${down}`, material: 'stem', height: round }))
  material(
    'kipos-vine',
    lit(10, 24, {
      scale: 4,
      body: `<rect width='10' height='24' fill='#5a8a3e'/><path d='M3 0 V24 M7 0 V24' stroke='#9cc472' stroke-width='.6' opacity='.6'/>${down.replace(/opacity='[\d.]+'/g, "opacity='.25'")}`,
      material: 'stem',
      height(api) {
        round(api)
        api.ridge('M3 -2 V26 M7 -2 V26', { width: 1, amount: 0.6 })
      },
    }),
  )
  material('kipos-stalk', lit(10, 24, { scale: 4, body: `<rect width='10' height='24' fill='#6b8a42'/><rect width='10' height='24' fill='#9a4a3a' opacity='.12'/>${streaks}`, material: 'stem', height: round }))
}

// Bamboo cane: one internode, node at the foot, tiled up the cane so nodes
// stay evenly spaced however long the cane is drawn. A round, faintly glossy
// cane with fine fibres running its length.
{
  let fibres = ''
  const r = rng(900)
  for (let i = 0; i < 9; i++) {
    const x = 1.5 + r() * 11
    fibres += `<path d='M${f(x)} 0 L${f(x + (r() - 0.5) * 0.6)} 72' stroke='${r() < 0.5 ? '#9c8150' : '#e6d6a6'}' stroke-width='.35' opacity='.45'/>`
  }
  material(
    'kipos-cane',
    lit(14, 72, {
      scale: 3,
      body: `<rect width='14' height='72' fill='#cdb27a'/>${fibres}<rect x='0' y='66' width='14' height='3.4' fill='#a88a52'/>`,
      material: 'stem',
      height(api) {
        // Taller than the tile, so the cane rounds across its width and not at the seams.
        api.cylinder({ left: -0.5, right: 14.5, amount: 6 })
        api.ridge('M-2 67.7 H16', { width: 3.4, amount: 1.4 })
      },
    }),
  )
}

// A watermelon vine trailing along the soil and over the front of the bed,
// with curling tendrils. Drawn from its root at the top left.
{
  const vine = 'M2 10 C40 6 80 16 118 14 C146 13 156 22 154 44 C152 70 146 92 150 118 C153 140 148 160 152 178'
  const tendrils = 'M86 14 c4 -10 14 -10 14 -2 c0 6 -8 6 -7 0 M152 62 c10 2 12 12 4 14 c-5 1 -6 -5 -1 -6 M149 128 c-10 0 -12 10 -5 12 c5 1 6 -4 1 -5'
  litSingle('melon-vine', 170, 180, {
    body: `<path d='${vine}' stroke='#5f8a43' stroke-width='4.6' fill='none' stroke-linecap='round'/>
      <path d='${tendrils}' stroke='#6f9a4c' stroke-width='1.1' fill='none'/>`,
    material: 'stem',
    height(api) {
      api.ridge(vine, { width: 4.6, amount: 2.6 })
      api.ridge(tendrils, { width: 1.1, amount: 0.7 })
    },
  })
}

// Tendril: a fine shoot that reaches out from the vine, then coils tight.
{
  const cx = 29, cy = 12
  let d = 'M2 34 C9 29 15 20 22 13'
  let angle = Math.PI, radius = 7
  for (let k = 0; k < 30; k++) {
    angle += 0.42
    radius *= 0.93
    d += ` L${f(cx + Math.cos(angle) * radius)} ${f(cy + Math.sin(angle) * radius)}`
  }
  litSprite('tendril', 40, 36, {
    scale: 3,
    body: `<path d='${d}' stroke='#5f8a3e' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/>`,
    material: 'stem',
    height(api) {
      api.ridge(d, { width: 1.6, amount: 1 })
    },
  })
}

// Rag ties: strips of old cotton knotted round the cane.
for (const [name, cloth, fold] of [['tie-cream', '#ece3cf', '#cfc4ab'], ['tie-blue', '#7a9fc2', '#5a7ea2']]) {
  const band = 'M2 6 Q13 2 24 6 L24 10 Q13 7 2 10Z'
  const knot = ellipse(13, 7.5, 4, 4.2)
  const ends = 'M14 10 q2 3 1 4 M12 10 q-1 3 -3 3.6'
  litSingle(name, 26, 14, {
    scale: 3,
    body: `<path d='${band}' fill='${cloth}'/><path d='${ends}' stroke='${fold}' stroke-width='2' fill='none' stroke-linecap='round'/><path d='${knot}' fill='${cloth}'/>`,
    material: 'velvet',
    height(api) {
      api.dome(band, { blur: 1.2, amount: 1.4 })
      api.dome(knot, { blur: 1.6, amount: 2.8 })
      api.ridge(ends, { width: 2, amount: 1 })
      api.grain(950, 0.5, 0.25)
    },
  })
}

// A hand trowel resting on the capstones: worn steel blade, olive handle.
const single = (name, w, h, defs, body) => rule(`.kipos-sprite--${name}`, [`background-image: ${uri(w, h, `<defs>${defs}</defs>${body}`)}`])
single('trowel', 150, 40, `
  <linearGradient id='blade' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#d7dbdc'/><stop offset='.5' stop-color='#9aa1a3'/><stop offset='1' stop-color='#5f6668'/></linearGradient>
  <linearGradient id='h' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#c99a62'/><stop offset='.5' stop-color='#8a5c33'/><stop offset='1' stop-color='#5a3a1e'/></linearGradient>
  <filter id='rust' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.08' numOctaves='3' seed='3'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .24  0 0 0 0 .1  0 0 0 -5 2.6'/><feComposite in2='SourceGraphic' operator='in'/></filter>`, `
  <path d='M4 20 C10 8 52 6 74 14 L80 18 L80 22 L74 26 C52 34 10 32 4 20Z' fill='url(#blade)'/>
  <path d='M4 20 C10 8 52 6 74 14 L80 18 L80 22 L74 26 C52 34 10 32 4 20Z' fill='#000' filter='url(#rust)' opacity='.6'/>
  <path d='M8 20 L74 20' stroke='#fff' stroke-opacity='.25' stroke-width='1'/>
  <rect x='78' y='17' width='16' height='6' rx='2' fill='#7d8587'/>
  <rect x='92' y='13' width='56' height='14' rx='7' fill='url(#h)'/>
  <rect x='96' y='15' width='46' height='2.4' rx='1.2' fill='#f2d3a6' opacity='.45'/>
  <circle cx='142' cy='20' r='2' fill='#3d2814'/>`)

const css = `/*
 * Generated by scripts/build-art.mjs. Do not edit by hand: change the script
 * and run \`node packages/kipos/scripts/build-art.mjs\`.
 */

${materials.join('\n\n')}

${rules.join('\n\n')}
`
let baked = css
// A drawing used in two places shares one token, so replace every use.
for (const job of bakes) baked = baked.replaceAll(job.token, job.run ? await job.run() : await bake(job))
writeFileSync(OUT, baked)
console.log(`kipos art: ${(baked.length / 1024).toFixed(0)} KB, ${rules.length} sprites, ${materials.length} materials, ${bakes.length} baked`)
