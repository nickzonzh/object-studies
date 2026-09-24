// Composes the published stylesheets after `vite build`: node scripts/finalize-css.mjs
//
// Vite emits one CSS file per chunk plus a manifest. Every entry gets its own
// stylesheet assembled from the chunks it imports, in import order:
//
//   dist/style.css          the root entry: shared shell and all six materials
//   dist/<variant>.css      shared shell and that one material only
//
// so a single-material consumer downloads a sixth of the textures. On the way
// through, every inlined SVG is compacted: comments and inter-tag whitespace
// dropped, path data written with the fewest separators, and the data URL
// encoded minimally inside a quoted url() — only %, #, < and > are escaped,
// where Vite's encoder spends three bytes on every space.
import { readFile, rm, writeFile } from 'node:fs/promises'

const DIST = 'dist'
const manifest = JSON.parse(await readFile(`${DIST}/.vite/manifest.json`, 'utf8'))

/** CSS files an entry pulls in, dependencies first, each once. */
function stylesheets(key, seen = new Set(), out = []) {
  if (seen.has(key)) return out
  seen.add(key)
  const chunk = manifest[key]
  for (const dependency of chunk.imports ?? []) stylesheets(dependency, seen, out)
  for (const file of chunk.css ?? []) if (!out.includes(file)) out.push(file)
  return out
}

/* --- SVG compaction ----------------------------------------------------- */

/** Path data with separators only where a number boundary needs one. */
const compactPath = d => d.trim()
  .replace(/\s*([MLHVCSQTAZmlhvcsqtaz])\s*/g, '$1')
  .replace(/\s*,\s*/g, ' ')
  .replace(/(\d)\s+(?=-)/g, '$1')
  .replace(/(\.\d+)\s+(?=\.)/g, '$1')
  .replace(/\s+/g, ',')

const compactSvg = svg => svg
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\sd=(["'])([^"']*)\1/g, (_, quote, d) => ` d=${quote}${compactPath(d)}${quote}`)
  .replace(/>\s+</g, '><')
  .replace(/\s+/g, ' ')
  // 0.5 → .5 wherever a number starts a value, a list item or a coordinate.
  .replace(/([\s"'(,:;=])(-?)0\.(\d)/g, '$1$2.$3')
  .trim()

const encode = svg => `data:image/svg+xml,${compactSvg(svg)
  .replace(/"/g, "'")
  .replace(/%/g, '%25')
  .replace(/#/g, '%23')
  .replace(/</g, '%3c')
  .replace(/>/g, '%3e')}`

/** Rewrites every url() that inlines an SVG, however Vite chose to quote and encode it. */
function compactUrls(css) {
  let out = ''
  let at = 0
  for (let start = css.indexOf('url(', at); start >= 0; start = css.indexOf('url(', at)) {
    const open = start + 4
    const quote = css[open] === '"' || css[open] === "'" ? css[open] : ''
    const from = open + quote.length
    const to = css.indexOf(quote ? `${quote})` : ')', from)
    const url = css.slice(from, to)
    out += css.slice(at, start)
    at = to + quote.length + 1
    if (!url.startsWith('data:image/svg+xml')) { out += css.slice(start, at); continue }
    const body = url.slice(url.indexOf(',') + 1)
    const svg = url.startsWith('data:image/svg+xml;base64,') ? Buffer.from(body, 'base64').toString('utf8') : decodeURIComponent(body)
    out += `url("${encode(svg)}")`
  }
  return out + css.slice(at)
}

/* --- emission ----------------------------------------------------------- */

const emitted = new Set()
const sizes = []
for (const [key, chunk] of Object.entries(manifest)) {
  if (!chunk.isEntry) continue
  const files = stylesheets(key)
  const parts = []
  for (const file of files) {
    parts.push(await readFile(`${DIST}/${file}`, 'utf8'))
    emitted.add(file)
  }
  const name = chunk.name === 'index' ? 'style' : chunk.name
  const css = compactUrls(parts.join('\n'))
  await writeFile(`${DIST}/${name}.css`, css)
  await writeFile(`${DIST}/${name}.css.d.ts`, 'export {}\n')
  sizes.push(`${name}.css ${(css.length / 1024).toFixed(1)} kB`)
}
for (const file of emitted) await rm(`${DIST}/${file}`)
await rm(`${DIST}/.vite`, { recursive: true })
console.log(sizes.join('\n'))
