// Rebuilds the demo painting derivatives: node scripts/build-demo-images.mjs
//
// Source: The Metropolitan Museum of Art Open Access (CC0) primary image for
// object 436535, Vincent van Gogh, Wheat Field with Cypresses (1889). The
// 8 MB original is not committed; only the responsive widths below are. The
// museum scan sits on a black field, so the painting is detected and cropped
// rather than nudged into place with CSS.
//
// JPEG only: on this canvas @napi-rs/canvas encoded WebP within a few percent
// of JPEG at matching quality (1600 px, q60: 441 kB vs 500 kB; q74: 599 kB vs
// 583 kB), so a second format would double the committed weight for nothing.
import { mkdir, writeFile } from 'node:fs/promises'
import { createCanvas, loadImage } from '@napi-rs/canvas'

const OBJECT = 436535
const WIDTHS = [800, 1600]
const QUALITY = 66
const OUTPUT = 'demo/public'
const NAME = 'wheat-field-with-cypresses'
/** Luminance above which a scan row or column counts as painting, not field. */
const THRESHOLD = 28
/** Trim of the detected edge, keeping the scan's darkest brushwork out. */
const SAFETY = 6

const object = await (await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${OBJECT}`)).json()
if (!object.isPublicDomain) throw new Error(`Met object ${OBJECT} is not public domain`)
console.log(`${object.title} — ${object.artistDisplayName}, ${object.objectDate} (CC0)`)

const source = await loadImage(Buffer.from(await (await fetch(object.primaryImage)).arrayBuffer()))
const scan = createCanvas(source.width, source.height)
const scanContext = scan.getContext('2d')
scanContext.drawImage(source, 0, 0)
const pixels = scanContext.getImageData(0, 0, source.width, source.height).data
const luminance = (x, y) => {
  const index = (y * source.width + x) * 4
  return (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
}
const lit = (fixed, length, vertical) => {
  for (let index = 0; index < length; index += 4) {
    if (luminance(vertical ? fixed : index, vertical ? index : fixed) >= THRESHOLD) return true
  }
  return false
}
let top = 0
let bottom = source.height - 1
let left = 0
let right = source.width - 1
while (top < bottom && !lit(top, source.width, false)) top++
while (bottom > top && !lit(bottom, source.width, false)) bottom--
while (left < right && !lit(left, source.height, true)) left++
while (right > left && !lit(right, source.height, true)) right--
const crop = {
  x: left + SAFETY, y: top + SAFETY,
  width: right - left + 1 - SAFETY * 2, height: bottom - top + 1 - SAFETY * 2,
}
console.log(`source ${source.width}×${source.height} → painting ${crop.width}×${crop.height} at ${crop.x},${crop.y}`)

await mkdir(OUTPUT, { recursive: true })
for (const width of WIDTHS) {
  const height = Math.round((crop.height / crop.width) * width)
  const canvas = createCanvas(width, height)
  canvas.getContext('2d').drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
  const data = await canvas.encode('jpeg', QUALITY)
  const file = `${OUTPUT}/${NAME}-${width}.jpg`
  await writeFile(file, data)
  console.log(`${file} ${width}×${height} ${(data.length / 1024).toFixed(0)} kB`)
}
