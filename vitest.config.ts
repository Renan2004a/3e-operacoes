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
      // Adaptadores de infraestrutura (Prisma/HTTP) são exercitados por integração,
      // não por testes unitários do domínio (AD-002). A meta de 80% vale para o domínio.
      exclude: ['src/modules/**/adapters/**'],
    },
  },
})
