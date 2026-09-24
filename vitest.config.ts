import { defineConfig } from 'vitest/config'
import { workspaceAliases } from './vite.shared.ts'

export default defineConfig({
  resolve: { alias: workspaceAliases },
  test: {
    include: ['packages/*/test/**/*.test.{ts,tsx,js}'],
    environment: 'node',
  },
})
