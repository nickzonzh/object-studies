// Local, deterministic SVG materials. No image service, bitmap or runtime generation.
import { writeFileSync } from 'node:fs'

let state = 68431
const random = () =>
  (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296
const save = (name, text) =>
  writeFileSync(
    new URL(`../src/assets/${name}.svg`, import.meta.url),
    `${text}\n`,
  )
const svg = (width, height, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${content}</svg>`

const grain = []
for (let line = 0; line < 46; line++) {
  const y = line * 1.4 - 2
  const phase = random() * 6.28
  const amplitude = 0.25 + random() * 1.2
  const frequency = 100 + random() * 120
  const points = []
  for (let x = -20; x <= 1220; x += 20) {
    const ripple =
      Math.sin(x / frequency + phase) * amplitude +
      Math.sin(x / 45 + phase) * 0.17
    const bow = Math.exp(-(((x - 770) / 150) ** 2)) * Math.sin(y / 16) * 3
    points.push(`${x},${(y + ripple + bow).toFixed(2)}`)
  }
  grain.push(
    `<polyline points="${points.join(' ')}" fill="none" stroke="#352619" stroke-width="${(0.25 + random() * 0.7).toFixed(2)}" opacity="${(0.13 + random() * 0.25).toFixed(2)}"/>`,
  )
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
const dust = []
for (let i = 0; i < 280; i++) {
  const x = 30 + random() * 910
  const y = 8 + random() * 14
  dust.push(
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.15 + random() * 0.65).toFixed(2)}" fill="#eee7ce" opacity="${(0.04 + random() * 0.12).toFixed(2)}"/>`,
  )
}
save('dust', svg(1000, 30, dust.join('')))
