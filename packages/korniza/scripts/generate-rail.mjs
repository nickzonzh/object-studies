// Mirrors a variant's rail tile onto its vertical rails:
// node scripts/generate-rail.mjs [VariantDirectory]   (default BaroqueGold)
//
// A mitre reflects ornament across its diagonal, so the left and right rails
// carry the transpose of the top and bottom ones — (x, y) -> (y, x). Wrapping
// the drawn tile in that matrix keeps one authored source: edit rail.svg, run
// this, and the vertical tile follows, including the relief offsets, which
// transpose with it so the key stays on the outer-upper side of every lobe.
import { readFile, writeFile } from 'node:fs/promises'

const variant = process.argv[2] ?? 'BaroqueGold'
const dir = new URL(`../src/variants/${variant}/`, import.meta.url)
const source = await readFile(new URL('rail.svg', dir), 'utf8')

const head = source.indexOf('>') + 1
const open = source.slice(0, head)
const size = (name) => open.match(new RegExp(`${name}="(\\d+)"`))?.[1]
const [width, height] = [size('width'), size('height')]
if (!width || !height) throw new Error(`${variant}/rail.svg needs literal width and height attributes`)

const body = source.slice(head, source.lastIndexOf('</svg>'))
const [defs, marks] = [body.slice(0, body.indexOf('</defs>') + 7), body.slice(body.indexOf('</defs>') + 7)]

const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${height}" height="${width}" viewBox="0 0 ${height} ${width}" preserveAspectRatio="none">
  <!-- Generated from rail.svg by scripts/generate-rail.mjs; edit that file. -->${defs.replace(/\n\s*<!--[\s\S]*?-->/g, '')}
  <g transform="matrix(0 1 1 0 0 0)">${marks.trimEnd()}
  </g>
</svg>
`

await writeFile(new URL('rail-vertical.svg', dir), tile)
console.log(`${variant}/rail-vertical.svg ${tile.length} bytes`)
