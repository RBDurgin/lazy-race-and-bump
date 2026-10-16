import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Listen on all interfaces so the dev server is reachable from outside the container.
  server: { host: true },
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
