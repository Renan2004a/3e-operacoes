import { expect, test } from '@playwright/test'

/**
 * E2E de responsividade e acessibilidade do refino visual (VIS-03, VIS-04,
 * VIS-05, VIS-06, VIS-08). Não depende de banco: usa a tela pública `/login` e o
 * guarda de sessão das rotas autenticadas.
 *
 * A responsividade do shell autenticado (topbar + sidebar) é coberta pelos
 * testes de unidade `src/shared/ui/app-shell.test.tsx`, porque o shell só
 * renderiza com sessão e banco, indisponíveis no E2E sem dependência externa.
 */

test.describe('login responsivo (VIS-04, VIS-05)', () => {
  test('mostra o hero a partir de 780px e o esconde abaixo disso', async ({ page }) => {
    const hero = page.getByText(/pedidos, produção e expedição/i)

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')
    await expect(hero).toBeHidden()

    await page.setViewportSize({ width: 780, height: 1024 })
    await expect(hero).toBeVisible()

    await page.setViewportSize({ width: 360, height: 800 })
    await expect(hero).toBeHidden()
  })
})

test.describe('acessibilidade do login (VIS-06, VIS-08)', () => {
  test('tem um único cabeçalho de nível 1', async ({ page }) => {
    await page.goto('/login')

    const titulos = page.getByRole('heading', { level: 1 })
    await expect(titulos).toHaveCount(1)
    await expect(titulos).toHaveText('3E Operações')
  })

  test('expõe landmark main e campos rotulados', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expect(page.getByLabel('Senha')).toBeVisible()
  })

  test('expõe foco visível no campo de e-mail', async ({ page }) => {
    await page.goto('/login')

    const email = page.getByLabel('E-mail')
    await email.focus()

    const boxShadow = await email.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(boxShadow).not.toBe('none')
  })
})

test.describe('guarda de sessão e responsividade (VIS-03)', () => {
  test('rota autenticada sem sessão volta ao login sem rolagem horizontal em 360px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.goto('/operador/fila')

    await expect(page).toHaveURL(/\/login$/)

    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
  })
})
