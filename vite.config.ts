import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, so the build works from any path (e.g. GitHub Pages' /<repo>/).
  base: './',
  // Listen on all interfaces so the dev server is reachable from outside the container.
  server: { host: true },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
