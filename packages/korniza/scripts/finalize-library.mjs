import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// CSS is bundled into style.css. Declaration imports must not reference source CSS.
async function cleanDeclarations(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await cleanDeclarations(path)
    else if (entry.name.endsWith('.d.ts')) {
      const source = await readFile(path, 'utf8')
      await writeFile(path, source.replace(/^import ['"].*\.css['"];?\r?\n/gm, ''))
    }
  }
}
await cleanDeclarations('dist-lib')
await writeFile('dist-lib/style.css.d.ts', 'export {}\n')
