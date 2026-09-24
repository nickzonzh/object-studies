// End-to-end check of what npm users actually receive: pack every package,
// install the tarballs into a throwaway project, then
//   1. server-render all three components from the installed packages,
//   2. type-check a consumer under `moduleResolution: nodenext`,
//   3. bundle a browser consumer (JS + the three stylesheets) with Vite.
// Run after `npm run build`. Exits non-zero on the first failure.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const packages = ['core', 'korniza', 'kimolia', 'melani']
const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const dev = rootManifest.devDependencies
const dir = mkdtempSync(join(tmpdir(), 'object-studies-consumer-'))
const run = (command, args, cwd = dir, shell = false) =>
  execFileSync(command, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', shell })
// Under `npm run`, npm_execpath points at npm's JS entry, so no shell is needed.
// Invoked directly on Windows, npm is a .cmd shim that only a shell can start.
const runNpm = (args, cwd) =>
  process.env.npm_execpath?.endsWith('.js')
    ? run(process.execPath, [process.env.npm_execpath, ...args], cwd)
    : run('npm', args, cwd, process.platform === 'win32')

try {
  const tarballs = {}
  for (const name of packages) {
    const packageDir = join(root, 'packages', name)
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    const [info] = JSON.parse(runNpm(['pack', '--json', '--pack-destination', dir], packageDir))
    tarballs[manifest.name] = `file:./${info.filename}`
  }

  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'consumer',
      private: true,
      type: 'module',
      dependencies: { ...tarballs, react: dev.react, 'react-dom': dev['react-dom'] },
      devDependencies: { '@types/react': dev['@types/react'], '@types/react-dom': dev['@types/react-dom'] },
      overrides: { 'object-studies-core': tarballs['object-studies-core'] },
    }),
  )
  runNpm(['install', '--no-audit', '--no-fund', '--loglevel=error'])

  // 1. Server rendering straight from the installed packages.
  writeFileSync(
    join(dir, 'ssr.mjs'),
    `import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { Whiteboard } from 'melani'
import { Chalkboard } from 'kimolia'
import { Frame, FrameImage, frameVariants } from 'korniza'
import { Frame as ModernBlack } from 'korniza/modern-black'

const checks = [
  ['melani', renderToString(h(Whiteboard, { persistence: { key: 'smoke' } }))],
  ['kimolia', renderToString(h(Chalkboard, { persistence: { key: 'smoke' } }))],
  ...frameVariants.map(({ variant }) => ['korniza', renderToString(h(Frame, { variant, mat: true, glazing: true }, h(FrameImage, { src: 'a.jpg', alt: 'A' })))]),
  ['korniza', renderToString(h(ModernBlack, null, 'content'))],
]
for (const [name, html] of checks) {
  if (!html.includes('class="' + name) && !html.includes(' ' + name + ' ') && !html.includes('"' + name + ' ')) throw new Error(name + ' SSR output is missing its root class')
}
console.log('ssr: ' + checks.length + ' renders ok')
`,
  )
  process.stdout.write(run(process.execPath, ['ssr.mjs']))

  // 2. Types under the strictest modern resolution.
  writeFileSync(
    join(dir, 'consumer.tsx'),
    `import { useRef } from 'react'
import { Whiteboard, type WhiteboardHandle, type Stroke } from 'melani'
import { Chalkboard, type ChalkboardHandle, type DrawingStroke } from 'kimolia'
import { Frame, FrameImage, type FrameVariant } from 'korniza'
import { Frame as WalnutFrame } from 'korniza/dark-walnut'
import 'melani/style.css'
import 'kimolia/style.css'
import 'korniza/style.css'

export function Consumer({ variant }: { variant: FrameVariant }) {
  const whiteboard = useRef<WhiteboardHandle>(null)
  const chalkboard = useRef<ChalkboardHandle>(null)
  const saved: readonly Stroke[] = whiteboard.current?.getStrokes() ?? []
  const chalk: readonly DrawingStroke[] = chalkboard.current?.getStrokes() ?? []
  return (
    <>
      <Whiteboard ref={whiteboard} defaultStrokes={saved} persistence={false} />
      <Chalkboard ref={chalkboard} defaultStrokes={chalk} labels={{}} />
      <Frame variant={variant} mat={{ width: '8%' }} glazing>
        <FrameImage src="a.jpg" alt="A" />
      </Frame>
      <WalnutFrame aspectRatio="3 / 2">text</WalnutFrame>
    </>
  )
}
`,
  )
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022', lib: ['ES2023', 'DOM'], module: 'NodeNext', moduleResolution: 'NodeNext',
        jsx: 'react-jsx', strict: true, noEmit: true, types: [],
      },
      files: ['consumer.tsx'],
    }),
  )
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'])
  console.log('types: nodenext consumer ok')

  // 3. A browser bundle, including the published stylesheets.
  writeFileSync(join(dir, 'index.html'), '<div id="root"></div><script type="module" src="/main.js"></script>')
  writeFileSync(
    join(dir, 'main.js'),
    `import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { Whiteboard } from 'melani'
import { Chalkboard } from 'kimolia'
import { Frame } from 'korniza'
import 'melani/style.css'
import 'kimolia/style.css'
import 'korniza/style.css'
createRoot(document.getElementById('root')).render([
  h(Whiteboard, { key: 'a' }), h(Chalkboard, { key: 'k' }), h(Frame, { key: 'f', variant: 'carved-oak' }),
])
`,
  )
  run(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'error'])
  console.log('bundle: vite consumer build ok')
} finally {
  if (!process.env.KEEP_SMOKE) rmSync(dir, { recursive: true, force: true })
  else console.log('kept ' + dir)
}
