import { expect, test, type Page } from '@playwright/test'

/**
 * E2E de fidelidade ao prototipo (PROT-08, PROT-09). A superficie publica e a
 * tela `/login`: as telas autenticadas dependem de sessao/banco e nao rodam no
 * E2E sem dependencia externa (ficam cobertas por testes de unidade do shell e
 * das paginas).
 *
 * A responsividade aqui cobre o estado de erro do login (com o alerta visivel),
 * cenario distinto dos testes de responsividade da tela inicial.
 */

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const

async function mockLoginInvalido(page: Page) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_credentials' }),
    }),
  )
}

test.describe('sem textos de demonstracao (PROT-08)', () => {
  test('login nao exibe textos de demonstracao nem seletor de perfil', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    await expect(page.getByText(/demonstrativ/i)).toHaveCount(0)
    await expect(page.getByText(/protótipo visual/i)).toHaveCount(0)
    await expect(page.getByLabel(/perfil para demonstra/i)).toHaveCount(0)
  })
})

test.describe('responsividade da superficie publica (PROT-09)', () => {
  for (const { width, height } of VIEWPORTS) {
    test(`login com erro sem rolagem horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await mockLoginInvalido(page)
      await page.goto('/login', { waitUntil: 'networkidle' })

      await page.getByLabel('E-mail').fill('ana@example.com')
      await page.getByLabel('Senha').fill('errada')
      await page.getByRole('button', { name: 'Entrar' }).click()
      await expect(page.getByRole('alert').filter({ hasText: /inválidos/i })).toBeVisible()

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))

      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })
  }
})
