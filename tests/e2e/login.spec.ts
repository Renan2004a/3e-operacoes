import { expect, test, type Page } from '@playwright/test'

/**
 * E2E de login e responsividade (QF-01, QF-02, QF-03). Não depende de banco:
 * usa apenas a página `/login` e as rotas `/api/auth/**` mockadas via
 * `page.route`.
 *
 * A base é `localhost` (não `127.0.0.1`) porque o Next.js 16 bloqueia recursos
 * de desenvolvimento quando a origem do navegador difere da origem de dev, o
 * que impede a hidratação.
 */

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const

async function mockLogin(page: Page, status: number, body: unknown) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    }),
  )
}

/** Abre o login e espera a hidratação para que o submit seja do React. */
async function abrirLogin(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' })
}

test.describe('login', () => {
  test('login válido navega para a tela do perfil (QF-01)', async ({ page }) => {
    await mockLogin(page, 200, { usuario: { id: 'u1' } })
    await page.route('**/api/auth/sessao', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ usuario: { id: 'u1', roles: ['OPERATOR'] } }),
      }),
    )

    await abrirLogin(page)
    await page.getByLabel('E-mail').fill('ana@example.com')
    await page.getByLabel('Senha').fill('segredo')

    // Sem banco não há sessão real, então o servidor redireciona a tela de
    // perfil de volta ao login. O que o login garante é a navegação do cliente
    // para a rota inicial do perfil.
    const navegou = page.waitForRequest((request) => request.url().includes('/operador/fila'))
    await page.getByRole('button', { name: 'Entrar' }).click()

    await navegou
  })

  test('login inválido mostra erro acessível e não navega (QF-01)', async ({ page }) => {
    await mockLogin(page, 401, { error: 'invalid_credentials' })

    await abrirLogin(page)
    await page.getByLabel('E-mail').fill('ana@example.com')
    await page.getByLabel('Senha').fill('errada')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByRole('alert').filter({ hasText: /inválidos/i })).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('roda no Chromium headless sem banco (QF-03)', async ({ page, browserName }) => {
    expect(browserName).toBe('chromium')

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: '3E Operações' })).toBeVisible()
  })
})

test.describe('responsividade do login', () => {
  for (const { width, height } of VIEWPORTS) {
    test(`não há rolagem horizontal em ${width}px (QF-02)`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/login')

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }))

      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })
  }
})
