// Rebuilds the gallery-wall derivatives: node apps/site/scripts/build-gallery-images.mjs
//
// Sources are The Metropolitan Museum of Art Open Access (CC0) primary images.
// The multi-megabyte originals are not committed: each work is trimmed of its
// scan field, then written at two widths (a ~1200 px longest side for 2x and a
// half-size step for 1x) as JPEG, the format korniza's own demo settled on.
//
// The crop is measured, not guessed: a scan's field is whatever matches the
// image's own corner colour, so the trim works for the black fields the Met
// uses behind paintings and the grey ones behind works on paper alike.
import { mkdir, writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const API = 'https://collectionapi.metmuseum.org/public/collection/v1/objects'
const OUTPUT = 'apps/site/public/gallery'
/** Longest side of the largest derivative, and the 1x step below it. */
const LONGEST = [1200, 600]
/** Per-derivative ceiling; quality steps down until the encode fits. */
const BUDGET = [210, 60]
const QUALITIES = [70, 64, 58, 52, 46]
/** Mean channel distance from the corner colour that counts as artwork. */
const FIELD_TOLERANCE = 16
/** Trim of the detected edge, in percent of the shorter side. */
const SAFETY = 0.4

const WORKS = [
  { id: 10481, name: 'heart-of-the-andes' },
  { id: 12127, name: 'madame-x' },
  { id: 437881, name: 'woman-with-a-water-pitcher' },
  { id: 437916, name: 'still-life-with-cheese' },
  { id: 36742, name: 'wild-geese-full-moon' },
  { id: 261941, name: 'the-great-wave-sete' },
  { id: 824771, name: 'marie-antoinette-in-a-park' },
]

/** Bounding box of everything that is not the uniform field at the corners. */
function contentBox(pixels, width, height) {
  const at = (x, y) => {
    const index = (y * width + x) * 4
    return [pixels[index], pixels[index + 1], pixels[index + 2]]
  }
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)]
  const field = [0, 1, 2].map((c) => corners.reduce((sum, corner) => sum + corner[c], 0) / 4)
  const spread = Math.max(
    ...corners.map((corner) => Math.max(...corner.map((v, c) => Math.abs(v - field[c])))),
  )
  // Corners that disagree mean the artwork reaches the edge: nothing to trim.
  if (spread > FIELD_TOLERANCE) return { x: 0, y: 0, width, height }
  const distance = (x, y) => {
    const pixel = at(x, y)
    return (Math.abs(pixel[0] - field[0]) + Math.abs(pixel[1] - field[1]) + Math.abs(pixel[2] - field[2])) / 3
  }
  const lit = (fixed, length, vertical) => {
    for (let index = 0; index < length; index += 3) {
      if (distance(vertical ? fixed : index, vertical ? index : fixed) > FIELD_TOLERANCE) return true
    }
    return false
  }
  let top = 0
  let bottom = height - 1
  let left = 0
  let right = width - 1
  while (top < bottom && !lit(top, width, false)) top++
  while (bottom > top && !lit(bottom, width, false)) bottom--
  while (left < right && !lit(left, height, true)) left++
  while (right > left && !lit(right, height, true)) right--
  const safety = Math.round((Math.min(width, height) * SAFETY) / 100)
  const inset = (value, limit) => Math.max(0, Math.min(limit, value))
  const x = inset(left + safety, width - 1)
  const y = inset(top + safety, height - 1)
  return {
    x,
    y,
    width: inset(right - safety + 1 - x, width - x),
    height: inset(bottom - safety + 1 - y, height - y),
  }
}

async function encode(canvas, budget) {
  let data
  for (const quality of QUALITIES) {
    data = await canvas.encode('jpeg', quality)
    if (data.length / 1024 <= budget) return { data, quality }
  }
  return { data, quality: QUALITIES.at(-1) }
}

await mkdir(OUTPUT, { recursive: true })
const manifest = []
let total = 0

for (const { id, name } of WORKS) {
  const object = await (await fetch(`${API}/${id}`)).json()
  if (!object.isPublicDomain) throw new Error(`Met object ${id} is not public domain`)
  const source = await loadImage(Buffer.from(await (await fetch(object.primaryImage)).arrayBuffer()))

  const scan = createCanvas(source.width, source.height)
  scan.getContext('2d').drawImage(source, 0, 0)
  const { data: pixels } = scan.getContext('2d').getImageData(0, 0, source.width, source.height)
  const crop = contentBox(pixels, source.width, source.height)

  const widths = []
  for (const [step, longest] of LONGEST.entries()) {
    const scale = longest / Math.max(crop.width, crop.height)
    const width = Math.round(crop.width * scale)
    const height = Math.round(crop.height * scale)
    const canvas = createCanvas(width, height)
    canvas.getContext('2d').drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
    const { data, quality } = await encode(canvas, BUDGET[step])
    await writeFile(`${OUTPUT}/${name}-${width}.jpg`, data)
    widths.push(width)
    total += data.length
    console.log(`  ${name}-${width}.jpg ${width}×${height} q${quality} ${(data.length / 1024).toFixed(0)} kB`)
  }

  manifest.push({
    id,
    name,
    widths,
    title: object.title,
    artist: object.artistDisplayName || 'Unknown',
    date: object.objectDate,
    url: object.objectURL,
    aspectRatio: `${crop.width} / ${crop.height}`,
    ratio: +(crop.width / crop.height).toFixed(3),
  })
  console.log(
    `${object.title} — ${object.artistDisplayName}, ${object.objectDate} (CC0)\n` +
      `  source ${source.width}×${source.height} → crop ${crop.width}×${crop.height} at ${crop.x},${crop.y} (${(crop.width / crop.height).toFixed(3)})`,
  )
}

console.log(`\ntotal ${(total / 1024).toFixed(0)} kB\n`)
console.log(JSON.stringify(manifest, null, 2))
