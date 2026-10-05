import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { packageConfig, workspaceAliases } from '../../vite.shared.ts'

const library = packageConfig()

// `vite build --mode page` builds the demo page instead of the library, for
// scripts/build-page.mjs to fold into one self-contained HTML file.
export default defineConfig((env) =>
  env.mode === 'page'
    ? {
        plugins: [react()],
        resolve: { alias: workspaceAliases },
        build: {
          outDir: 'output/page',
          emptyOutDir: true,
          cssCodeSplit: false,
          modulePreload: false,
          sourcemap: false,
        },
      }
    : library(env),
)
