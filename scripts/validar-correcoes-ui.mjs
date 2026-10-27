// Valida as correções de UI do professor/Saul sem criar dados.
// Uso: node scripts/validar-correcoes-ui.mjs
// Opcional: PLAYWRIGHT_BASE_URL=https://... node scripts/validar-correcoes-ui.mjs

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const DIR = join(process.cwd(), 'docs', 'video', 'validacao-ui')
mkdirSync(DIR, { recursive: true })

const resultados = []
function registrar(nome, ok, detalhe = '') {
  resultados.push({ nome, ok, detalhe })
  console.log(`${ok ? 'OK   ' : 'FALHA'} | ${nome}${detalhe ? ` | ${detalhe}` : ''}`)
}

const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' })
const pagina = await contexto.newPage()
const erros = []
pagina.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text())
})
pagina.on('pageerror', (e) => erros.push(e.message))

async function login(email, senha) {
  await contexto.clearCookies()
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Entrar' }).waitFor({ timeout: 30000 })
  await pagina.waitForTimeout(1600)
  await pagina.getByLabel('E-mail').fill(email)
  await pagina.getByLabel('Senha').fill(senha)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
  await pagina.waitForTimeout(800)
}

async function abrirPrimeiroPedido() {
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().waitFor({ timeout: 30000 })
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().click()
  await pagina.waitForURL(/\/pedidos\/.+/, { timeout: 30000 })
  await pagina.getByText('Histórico de prazos').first().waitFor({ timeout: 30000 })
}

try {
  // ---------------- Vendedor ----------------
  await login('vendedor@3e.local', 'vendedor123')
  await pagina.goto(`${BASE}/vendedor/pedidos`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Vendas' }).waitFor({ timeout: 30000 })
  await pagina.getByRole('columnheader', { name: 'Previsão' }).waitFor({ timeout: 30000 })
  registrar('vendedor: coluna de previsão na lista', true)

  await abrirPrimeiroPedido()
  const textoVendedor = await pagina.locator('body').innerText()
  registrar('vendedor: histórico de prazos disponível', textoVendedor.includes('Histórico de prazos'))
  registrar(
    'vendedor: não gerencia remessas',
    !textoVendedor.includes('Adicionar remessa') &&
      (await pagina.getByLabel('Remessa (item 1)').count()) === 0,
  )
  registrar('vendedor: quantidades com vírgula', /\d,\d{2}/.test(textoVendedor))

  await pagina.getByRole('button', { name: /Histórico de prazos/ }).first().click()
  await pagina.waitForTimeout(2500)
  const textoHistorico = await pagina.locator('body').innerText()
  registrar(
    'vendedor: histórico carrega sem erro',
    !textoHistorico.includes('Não foi possível carregar o histórico'),
  )
  await pagina.screenshot({ path: join(DIR, 'vendedor-detalhe.png') })

  // ---------------- Gerente ----------------
  await login('gerente@3e.local', 'gerente123')
  await pagina.goto(`${BASE}/gerente/painel`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Painel' }).waitFor({ timeout: 30000 })
  await pagina.getByRole('button', { name: 'Atualizar' }).waitFor({ timeout: 30000 })
  registrar('gerente: painel com Atualizar', true)
  await pagina.screenshot({ path: join(DIR, 'gerente-painel.png') })

  await pagina.goto(`${BASE}/gerente/pedidos`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Pedidos' }).waitFor({ timeout: 30000 })
  await pagina.getByRole('columnheader', { name: 'Previsão' }).waitFor({ timeout: 30000 })
  await abrirPrimeiroPedido()
  const textoGerente = await pagina.locator('body').innerText()
  registrar('gerente: rótulo de prazo de entrega', textoGerente.includes('Prazo de entrega (item'))
  registrar('gerente: histórico de prazos disponível', textoGerente.includes('Histórico de prazos'))

  const adicionar = pagina.getByRole('button', { name: 'Adicionar remessa do item 1' })
  if ((await adicionar.count()) > 0) {
    await adicionar.click()
    await pagina.waitForTimeout(500)
    const textoRemessa = await pagina.locator('body').innerText()
    registrar(
      'gerente: remessa com número automático',
      textoRemessa.includes('ª remessa (automática)') &&
        (await pagina.getByLabel('Remessa (item 1)').count()) === 0,
    )
    await pagina.getByRole('button', { name: '− Fechar' }).first().click().catch(() => null)
  } else {
    registrar('gerente: remessa com número automático', false, 'botão de remessa ausente')
  }
  await pagina.screenshot({ path: join(DIR, 'gerente-detalhe.png') })

  // ---------------- Admin ----------------
  await login('admin@3e.local', 'admin123')
  await pagina.goto(`${BASE}/admin/setores`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Setores e mapeamentos' }).waitFor({ timeout: 30000 })
  const textoSetores = await pagina.locator('body').innerText()
  registrar(
    'admin: explicação do mapeamento',
    textoSetores.includes('Como funciona o mapeamento de categoria'),
  )
  registrar('admin: lista de mapeamentos', textoSetores.includes('Mapeamentos cadastrados'))
  await pagina.screenshot({ path: join(DIR, 'admin-setores.png') })

  await pagina.goto(`${BASE}/admin/usuarios`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Usuários', level: 1 }).waitFor({ timeout: 30000 })
  const textoUsuarios = await pagina.locator('body').innerText()
  registrar(
    'admin: explicação de inativação',
    textoUsuarios.includes('Inativação em vez de exclusão'),
  )
  await pagina.screenshot({ path: join(DIR, 'admin-usuarios.png') })

  // ---------------- Operador ----------------
  await login('operador@3e.local', 'operador123')
  await pagina.goto(`${BASE}/operador/fila`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Meus pedidos' }).waitFor({ timeout: 30000 })
  await pagina.getByRole('link', { name: /Abrir atividade/ }).first().click()
  await pagina.waitForURL(/\/operador\/atividades\/.+/, { timeout: 30000 })
  await pagina.getByText('Previsão de entrega:').waitFor({ timeout: 30000 })
  registrar('operador: previsão na atividade', true)
  await pagina.screenshot({ path: join(DIR, 'operador-atividade.png') })

  await pagina.getByRole('link', { name: 'Ver ordem de produção' }).click()
  await pagina.waitForURL(/\/ordem/, { timeout: 30000 })
  await pagina.getByText('Previsão de entrega').waitFor({ timeout: 30000 })
  registrar('operador: previsão na ordem de produção', true)
  await pagina.screenshot({ path: join(DIR, 'operador-ordem.png') })

  registrar('sem erros de console/hidratação', erros.length === 0, erros.slice(0, 2).join(' | '))
} finally {
  await contexto.close()
  await navegador.close()
}

const falhas = resultados.filter((r) => !r.ok)
console.log(`\nResumo: ${resultados.length - falhas.length}/${resultados.length} verificações OK.`)
if (falhas.length) {
  console.log('Falhas:', JSON.stringify(falhas, null, 2))
  process.exitCode = 1
}
