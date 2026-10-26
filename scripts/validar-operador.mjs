// Validação do perfil Operador + visão de ocorrências do Gerente.
// Requer o app em http://localhost:3000 e o banco configurado.
//
// Uso: node scripts/validar-operador.mjs
// Saída: docs/video/validacao-operador/*.png e resumo no console.

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const DIR = join(process.cwd(), 'docs', 'video', 'validacao-operador')
mkdirSync(DIR, { recursive: true })

const CRED = {
  operador: { email: 'operador@3e.local', senha: 'operador123' },
  gerente: { email: 'gerente@3e.local', senha: 'gerente123' },
}

const resultados = []
function registrar(nome, ok, detalhe) {
  resultados.push({ nome, ok, detalhe })
  console.log(`${ok ? 'OK ' : 'FALHA'} | ${nome} | ${detalhe}`)
}

async function login(context, page, perfil) {
  await context.clearCookies()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Entrar' }).waitFor({ timeout: 30000 })
  await page.waitForTimeout(1800)
  const { email, senha } = CRED[perfil]
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForLoadState('domcontentloaded')
}

async function semRolagemHorizontal(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
const page = await context.newPage()
context.setDefaultTimeout(30000)

try {
  // ---- Operador: meus pedidos ----
  await login(context, page, 'operador')
  await page.goto(`${BASE}/operador/fila`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Meus pedidos' }).waitFor({ timeout: 30000 })
  await page.screenshot({ path: join(DIR, 'operador-meus-pedidos.png'), fullPage: false })
  const medidaFila = await semRolagemHorizontal(page)
  registrar(
    'operador: meus pedidos sem rolagem horizontal',
    medidaFila.scrollWidth <= medidaFila.innerWidth + 1,
    `scrollWidth=${medidaFila.scrollWidth}, innerWidth=${medidaFila.innerWidth}`,
  )

  const abrir = page.getByRole('link', { name: /Abrir atividade/i }).first()
  const temAtividade = (await abrir.count()) > 0
  registrar('operador: atividade disponível na fila', temAtividade, `links=${await abrir.count()}`)

  if (temAtividade) {
    await abrir.click()
    await page.waitForURL(/\/operador\/atividades\/.+/, { timeout: 30000 })
    await page.getByRole('heading', { name: 'Executar atividade' }).waitFor({ timeout: 30000 })
    const medidaAtividade = await semRolagemHorizontal(page)
    await page.screenshot({ path: join(DIR, 'operador-atividade.png'), fullPage: false })
    registrar(
      'operador: atividade sem rolagem horizontal',
      medidaAtividade.scrollWidth <= medidaAtividade.innerWidth + 1,
      `scrollWidth=${medidaAtividade.scrollWidth}, innerWidth=${medidaAtividade.innerWidth}`,
    )

    const linkOcorrencia = page.getByRole('link', { name: 'Registrar ocorrência' }).first()
    registrar(
      'operador: link de ocorrência na atividade',
      (await linkOcorrencia.count()) > 0,
      `href=${await linkOcorrencia.getAttribute('href')}`,
    )

    await linkOcorrencia.click()
    await page.waitForURL(/\/operador\/ocorrencias\?atividade=/, { timeout: 30000 })
    await page.getByRole('heading', { level: 1, name: 'Ocorrências' }).waitFor({ timeout: 30000 })
    const atividadeId = new URL(page.url()).searchParams.get('atividade')
    const selecionado = await page.getByLabel('Atividade').inputValue()
    registrar(
      'operador: atividade pré-selecionada',
      selecionado === atividadeId,
      `select=${selecionado}, url=${atividadeId}`,
    )
    registrar(
      'operador: formulário de ocorrência visível',
      (await page.getByLabel('Tipo de ocorrência').count()) > 0,
      'campo Tipo de ocorrência',
    )
    await page.getByText('Minhas ocorrências').first().waitFor({ timeout: 30000 })
    const medidaOcorrencias = await semRolagemHorizontal(page)
    await page.screenshot({ path: join(DIR, 'operador-ocorrencias.png'), fullPage: false })
    registrar(
      'operador: ocorrências sem rolagem horizontal',
      medidaOcorrencias.scrollWidth <= medidaOcorrencias.innerWidth + 1,
      `scrollWidth=${medidaOcorrencias.scrollWidth}, innerWidth=${medidaOcorrencias.innerWidth}`,
    )
  }

  // ---- Gerente: ocorrências no dashboard ----
  await login(context, page, 'gerente')
  await page.goto(`${BASE}/gerente/painel`, { waitUntil: 'domcontentloaded' })
  await page.getByText('Ocorrências recentes').first().waitFor({ timeout: 30000 })
  await page.getByText('Ocorrências recentes').first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(DIR, 'gerente-ocorrencias.png'), fullPage: false })
  const textoPainel = await page.locator('body').innerText()
  const temResumo =
    /no total/.test(textoPainel) && /nos últimos 7 dias/.test(textoPainel)
  registrar('gerente: resumo de ocorrências no painel', temResumo, 'badges de total/7 dias')

  const medidaPainel = await semRolagemHorizontal(page)
  registrar(
    'gerente: painel sem rolagem horizontal',
    medidaPainel.scrollWidth <= medidaPainel.innerWidth + 1,
    `scrollWidth=${medidaPainel.scrollWidth}, innerWidth=${medidaPainel.innerWidth}`,
  )
} finally {
  await context.close()
  await browser.close()
}

const falhas = resultados.filter((r) => !r.ok)
console.log(`\nResumo: ${resultados.length - falhas.length}/${resultados.length} verificações OK.`)
if (falhas.length) {
  console.log('Falhas:', JSON.stringify(falhas, null, 2))
  process.exitCode = 1
}
