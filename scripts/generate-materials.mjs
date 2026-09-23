// Local, deterministic SVG materials. No image service, bitmap or runtime generation.
import { writeFileSync } from 'node:fs'

const seededRandom = (seed) => {
  let state = seed
  return () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296
}
const random = seededRandom(68431)
const save = (name, text) =>
  writeFileSync(
    new URL(`../src/assets/${name}.svg`, import.meta.url),
    `${text}\n`,
  )
const svg = (width, height, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${content}</svg>`

// Fibres follow one slow wood flow, with uneven spacing and local departures.
// Interruptions and tapered strength avoid an evenly ruled, full-width stripe.
const grain = [
  '<defs><linearGradient id="fade"><stop stop-color="#352619" stop-opacity="0"/><stop offset=".16" stop-color="#352619"/><stop offset=".72" stop-color="#352619"/><stop offset="1" stop-color="#352619" stop-opacity="0"/></linearGradient></defs>',
]
const flow = (x, y) =>
  Math.sin(x / 178) * 0.8 +
  Math.sin(x / 310 + y / 19) * 1.5 +
  Math.exp(-(((x - 760) / 170) ** 2)) * Math.sin(y / 17) * 2.5
let y = -4
while (y < 65) {
  y += 0.5 + random() ** 1.3 * 2.5
  const phase = random() * 6.28
  const amplitude = 0.12 + random() * 0.45
  const width = (0.25 + random() * 0.65).toFixed(2)
  let start = -80 + random() * 140
  while (start < 1200) {
    const end = Math.min(1220, start + 90 + random() * 420)
    const opacity = (0.1 + random() * 0.25).toFixed(2)
    const points = []
    for (let x = start; x < end; x += 12) {
      const ripple = Math.sin(x / 58 + phase) * amplitude
      points.push(`${x.toFixed(1)},${(y + flow(x, y) + ripple).toFixed(2)}`)
    }
    grain.push(
      `<polyline points="${points.join(' ')}" fill="none" stroke="url(#fade)" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"/>`,
    )
    start = end + 14 + random() * 88
  }
}
// Interrupted oak pores, stretched along the timber, never perpendicular to it.
for (let i = 0; i < 220; i++) {
  grain.push(
    `<path d="M${(random() * 1200).toFixed(1)} ${(random() * 60).toFixed(1)}h${(1 + random() * 9).toFixed(1)}" stroke="#34281e" stroke-width=".5" opacity="${(0.05 + random() * 0.18).toFixed(2)}"/>`,
  )
}
save('oak-grain', svg(1200, 60, grain.join('')))
save(
  'oak-grain-vertical',
  svg(
    60,
    1200,
    `<g transform="translate(60 0) rotate(90)">${grain.join('')}</g>`,
  ),
)
save(
  'noise',
  svg(
    160,
    160,
    '<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="3" stitchTiles="stitch" seed="27"/><feColorMatrix type="saturate" values="0"/></filter><path fill="#888" filter="url(#n)" d="M0 0h160v160H0z"/>',
  ),
)
save(
  'mineral',
  svg(
    1000,
    620,
    '<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".008 .013" numOctaves="3" seed="8"/><feColorMatrix type="saturate" values="0"/></filter><path filter="url(#n)" d="M0 0h1000v620H0z"/>',
  ),
)
// Independent seed preserves the existing dust when the timber changes.
const dustRandom = seededRandom(1441559149)
const dust = []
for (let i = 0; i < 280; i++) {
  const x = 30 + dustRandom() * 910
  const y = 8 + dustRandom() * 14
  dust.push(
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.15 + dustRandom() * 0.65).toFixed(2)}" fill="#eee7ce" opacity="${(0.04 + dustRandom() * 0.12).toFixed(2)}"/>`,
  )
}
save('dust', svg(1000, 30, dust.join('')))
