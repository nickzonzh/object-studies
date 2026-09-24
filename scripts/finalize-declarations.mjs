// Run from a package directory after `tsc -p tsconfig.build.json`.
// CSS and assets are bundled by Vite, so emitted declarations must not import
// them; consumers would otherwise need our source files to type-check.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const assetImport = /^import ['"][^'"]+\.(css|svg|png|jpe?g|webp)['"];?\r?\n/gm

async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await clean(path)
    else if (entry.name.endsWith('.d.ts')) {
      const source = await readFile(path, 'utf8')
      const cleaned = source.replace(assetImport, '')
      if (cleaned !== source) await writeFile(path, cleaned)
    }
  }
}

await clean('dist')
await writeFile('dist/style.css.d.ts', 'export {}\n')
