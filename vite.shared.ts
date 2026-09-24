import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Workspace packages consume the core from source while developing and testing.
// Library builds keep it (and React) external so consumers dedupe one copy.
export const workspaceAliases = {
  'object-studies-core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
}

const external = [/^react($|\/)/, /^react-dom($|\/)/, /^object-studies-core($|\/)/]

type PackageConfigOptions = {
  /** Library entry points. A record produces one ESM file per key. */
  entry?: string | Record<string, string>
  /**
   * Emit CSS per chunk plus a manifest instead of one `style.css`, so a
   * post-build step can compose a stylesheet per entry (see korniza's
   * scripts/finalize-css.mjs).
   */
  splitCss?: boolean
}

/**
 * `vite` serves the package demo (index.html → demo/). `vite build` emits the
 * library: ESM only, one `style.css`, a "use client" banner for RSC frameworks.
 */
export function packageConfig({ entry = 'src/index.ts', splitCss = false }: PackageConfigOptions = {}) {
  return defineConfig(({ command }) => ({
    plugins: [react()],
    publicDir: command === 'serve' ? 'demo/public' : false,
    resolve: command === 'serve' ? { alias: workspaceAliases } : undefined,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      cssCodeSplit: splitCss,
      manifest: splitCss,
      lib: {
        entry,
        formats: ['es'],
        fileName: (_format, name) => `${name}.js`,
        cssFileName: splitCss ? undefined : 'style',
      },
      rolldownOptions: {
        external,
        output: { banner: '"use client";' },
      },
    },
  }))
}
