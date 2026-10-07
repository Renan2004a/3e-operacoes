import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
      include: ['src/modules/**/*.ts'],
    },
  },
})
