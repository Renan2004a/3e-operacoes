// Validação local de responsividade e impressão com o app real.
//
// Requer: `npm run dev` em http://localhost:3000 e o banco configurado.
//
// Uso: node scripts/validar-responsivo-impressao.mjs
//
// - Em 390x844, verifica que a PÁGINA não rola horizontalmente nas telas-chave.
// - Na tela de usuários, confirma que a tabela vira cartões (display: block).
// - Na ordem de produção, confere o CSS de impressão e gera o PDF, contando as páginas.
//
// Saída: docs/video/validacao/*.png e um resumo no console.

import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const PRODUCAO = !BASE.includes('localhost') && !BASE.includes('127.0.0.1')
const DIR = join(process.cwd(), 'docs', 'video', PRODUCAO ? 'validacao-prod' : 'validacao')
mkdirSync(DIR, { recursive: true })

const CRED = {
  vendedor: { email: 'vendedor@3e.local', senha: 'vendedor123' },
  gerente: { email: 'gerente@3e.local', senha: 'gerente123' },
  admin: { email: 'admin@3e.local', senha: 'admin123' },
  operador: { email: 'operador@3e.local', senha: 'operador123' },
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
  // Em dev o primeiro carregamento compila/hidrata; preencher antes disso faz o
  // formulário cair no submit nativo (GET) em vez do handler do React.
  await page.waitForTimeout(1800)
  const { email, senha } = CRED[perfil]
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
  await page.waitForLoadState('domcontentloaded')
}

async function semRolagemHorizontal(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    return {
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }
  })
}

async function verificarTela(page, nome, rota, seletorEspera) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' })
  if (seletorEspera) await page.locator(seletorEspera).first().waitFor({ timeout: 30000 }).catch(() => {})
  const medida = await semRolagemHorizontal(page)
  const ok = medida.scrollWidth <= medida.innerWidth + 1
  await page.screenshot({ path: join(DIR, `${nome}.png`), fullPage: false })
  registrar(`responsivo: ${nome}`, ok, `scrollWidth=${medida.scrollWidth}, innerWidth=${medida.innerWidth}`)
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
const page = await context.newPage()
context.setDefaultTimeout(30000)

try {
  // ---- Vendedor ----
  await login(context, page, 'vendedor')
  await verificarTela(page, 'vendedor-lista', '/vendedor/pedidos', 'table[aria-label="Pedidos"]')

  const pedidos = await (await page.request.get(`${BASE}/api/pedidos`)).json()
  let alvo = null
  for (const p of pedidos?.pedidos ?? []) {
    const detalhe = await (await page.request.get(`${BASE}/api/pedidos/${p.id}`)).json()
    if (detalhe?.pedido?.itens?.[0]?.classificationStatus === 'CLASSIFIED') {
      alvo = p
      break
    }
  }
  if (alvo) {
    await verificarTela(
      page,
      'vendedor-detalhe',
      `/vendedor/pedidos/${alvo.id}`,
      'text=Resumo do pedido',
    )
    // Correção de setor (AD-007): a ação aparece para o vendedor em item desmembrado.
    const corrigir = page.getByRole('button', { name: /Corrigir setor do item 1/ })
    const qtdCorrigir = await corrigir.count()
    registrar('setor: ação de correção disponível', qtdCorrigir > 0, `botões=${qtdCorrigir}`)

    // Totais por unidade (AD-008): o resumo mostra uma execução por unidade.
    const progressoUnidade = page.getByText(/Execução do pedido \(/)
    const qtdProgresso = await progressoUnidade.count()
    registrar('totais: progresso por unidade', qtdProgresso > 0, `labels=${qtdProgresso}`)

    // A listagem volta a funcionar: o link aponta para a lista e a rota existe.
    const voltar = page.getByRole('link', { name: /voltar para os pedidos/i })
    const href = await voltar.getAttribute('href')
    registrar('navegação: voltar do detalhe', href === '/vendedor/pedidos', `href=${href}`)
  }

  // ---- Gerente ----
  await login(context, page, 'gerente')
  await verificarTela(page, 'gerente-painel', '/gerente/painel', 'text=Alertas operacionais')
  await verificarTela(page, 'gerente-pedidos', '/gerente/pedidos', 'table[aria-label="Pedidos"]')

  // ---- Admin (tabela de usuários vira cartões no celular) ----
  await login(context, page, 'admin')
  await verificarTela(page, 'admin-usuarios', '/admin/usuarios', 'table[aria-label="Usuários"]')
  const tabelaMobile = await page.evaluate(() => {
    const tabela = document.querySelector('table[aria-label="Usuários"]')
    const cabecalho = tabela?.querySelector('thead')
    if (!tabela) return null
    return {
      tabela: getComputedStyle(tabela).display,
      cabecalho: cabecalho ? getComputedStyle(cabecalho).display : null,
    }
  })
  registrar(
    'admin: tabela em cartões no celular',
    tabelaMobile?.tabela === 'block' && tabelaMobile?.cabecalho === 'none',
    JSON.stringify(tabelaMobile),
  )

  // ---- Operador: ordem de produção e impressão ----
  await login(context, page, 'operador')
  const atividades = await (await page.request.get(`${BASE}/api/producao/atividades`)).json()
  const atividade = atividades?.atividades?.[0]
  if (atividade) {
    await page.goto(`${BASE}/producao/atividades/${atividade.id}/ordem`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Ordem de produção').first().waitFor({ timeout: 30000 })

    await page.emulateMedia({ media: 'print' })
    const estiloImpressao = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell')
      return shell ? getComputedStyle(shell).minHeight : null
    })
    registrar('impressão: shell sem min-height', estiloImpressao === '0px', `minHeight=${estiloImpressao}`)

    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    const caminhoPdf = join(DIR, 'ordem-producao.pdf')
    writeFileSync(caminhoPdf, pdf)
    const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
    registrar('impressão: sem página extra', paginas === 1, `páginas=${paginas} (${caminhoPdf})`)
    await page.emulateMedia({ media: 'screen' })
  } else {
    registrar('impressão: ordem de produção', false, 'nenhuma atividade disponível para o operador')
  }
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
