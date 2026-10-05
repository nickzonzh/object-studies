// Builds the demo page as one self-contained file, output/komboloi.html, with
// its script and stylesheet inlined. The file is written the way a hosted
// artifact page expects (no html/head/body wrapper), so it can be published
// as is. Run from the package directory: npm run build:page
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const vite = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
execFileSync(process.execPath, [vite, 'build', '--mode', 'page', '--logLevel', 'warn'], { stdio: 'inherit' })

const dir = resolve('output/page')
const html = readFileSync(join(dir, 'index.html'), 'utf8')
const asset = (href) => readFileSync(join(dir, href.replace(/^\//, '')), 'utf8')

const scripts = [...html.matchAll(/<script type="module" crossorigin src="([^"]+)"><\/script>/g)]
const styles = [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g)]
if (scripts.length !== 1 || styles.length !== 1) throw new Error('Expected one built script and one stylesheet')

const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
const keep = (pattern) => head.match(pattern)?.[0] ?? ''
const page = [
  keep(/<title>[^<]*<\/title>/),
  ...head.match(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts\.[^>]+>/g),
  `<style>${asset(styles[0][1]).trim()}</style>`,
  '<div id="root"></div>',
  `<script type="module">${asset(scripts[0][1]).replace(/<\/script/gi, '<\\/script').trim()}</script>`,
  '',
].join('\n')

writeFileSync('output/komboloi.html', page)
console.log(`output/komboloi.html ${(page.length / 1024).toFixed(0)} KB`)
