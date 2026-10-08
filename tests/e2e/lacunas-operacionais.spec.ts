import { expect, test } from '@playwright/test'

/**
 * E2E das novas telas (lacunas operacionais) na superfície pública.
 *
 * As telas autenticadas — importar pedido (`/integracao`), ordem de produção
 * (`/producao/atividades/[id]/ordem`) e responsável técnico
 * (`/tecnico/integracao`) — exigem sessão e banco, então não renderizam no E2E
 * sem dependência externa. O que é observável publicamente é o guarda de sessão:
 * sem sessão, cada rota nova redireciona ao login. O conteúdo dessas telas fica
 * coberto por testes de unidade (`src/app/(app)/**`).
 *
 * O guarda redireciona antes de consultar o repositório (`(app)/layout.tsx`),
 * então estes testes não dependem de banco.
 */

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const

test.describe('guarda de sessão das novas telas (LAC-01, LAC-07, LAC-09)', () => {
  test('importar pedido exige sessão e volta ao login (LAC-01)', async ({ page }) => {
    await page.goto('/integracao')

    await expect(page).toHaveURL(/\/login$/)
  })

  test('ordem de produção exige sessão e volta ao login (LAC-07)', async ({ page }) => {
    await page.goto('/producao/atividades/1/ordem')

    await expect(page).toHaveURL(/\/login$/)
  })

  test('tela do responsável técnico exige sessão e volta ao login (LAC-09)', async ({ page }) => {
    await page.goto('/tecnico/integracao')

    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('login de destino das novas telas (LAC-01, LAC-07, LAC-09)', () => {
  test('inicia sem textos de demonstração', async ({ page }) => {
    await page.goto('/integracao')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: '3E Operações' })).toBeVisible()
    await expect(page.getByText(/demonstrativ/i)).toHaveCount(0)
    await expect(page.getByText(/protótipo visual/i)).toHaveCount(0)
  })

  test('não rola horizontalmente de 360 a 1440', async ({ page }) => {
    for (const { width, height } of VIEWPORTS) {
      await page.setViewportSize({ width, height })
      await page.goto('/tecnico/integracao')

      await expect(page).toHaveURL(/\/login$/)

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))

      expect(scrollWidth, `rolagem horizontal em ${width}px`).toBeLessThanOrEqual(innerWidth)
    }
  })
})
