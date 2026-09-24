import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The site consumes the *built* packages exactly as an npm user would.
// Run `npm run build` at the root first (or `npm run dev:site`).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/object-studies/' : '/',
}))
