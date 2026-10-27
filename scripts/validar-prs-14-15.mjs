// Valida a integração dos PRs #14/#15 no navegador, sem criar dados.
// Uso: node scripts/validar-prs-14-15.mjs

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const DIR = join(process.cwd(), 'docs', 'video', 'validacao-prs-14-15')
mkdirSync(DIR, { recursive: true })

const resultados = []
function registrar(nome, ok, detalhe = '') {
  resultados.push({ nome, ok, detalhe })
  console.log(`${ok ? 'OK   ' : 'FALHA'} | ${nome}${detalhe ? ` | ${detalhe}` : ''}`)
}

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 900 },
  locale: 'pt-BR',
})
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
  await pagina.waitForLoadState('domcontentloaded')
  await pagina.waitForTimeout(800)
}

async function esperarLista() {
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().waitFor({ timeout: 30000 })
}

async function voltarDoDetalhe(prefixo) {
  await esperarLista()
  const abrir = pagina.getByRole('button', { name: /Abrir pedido/ }).first()
  if ((await abrir.count()) === 0) return { ok: false, motivo: 'sem pedidos' }
  await abrir.click()
  await pagina.waitForURL(new RegExp(`\\${prefixo}\\/.+`), { timeout: 30000 })
  await pagina.waitForTimeout(1200)
  const urlDetalhe = pagina.url()
  const temRetorno = urlDetalhe.includes('retorno=')
  const voltar = pagina.getByRole('link', { name: /Voltar para os pedidos/ }).first()
  await voltar.click()
  await pagina.waitForURL(new RegExp(`\\${prefixo}(\\?|$)`), { timeout: 30000 })
  await pagina.waitForTimeout(1500)
  return { ok: true, temRetorno, urlVolta: pagina.url() }
}

try {
  // ---------------- Vendedor ----------------
  await login('vendedor@3e.local', 'vendedor123')
  await pagina.goto(`${BASE}/vendedor/pedidos?setor=TELHAS`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Vendas' }).waitFor({ timeout: 30000 })
  await esperarLista()
  const setorInicial = await pagina.getByLabel('Setor').inputValue()
  registrar('vendedor: filtro de setor aplicado pela URL', setorInicial === 'TELHAS', setorInicial)
  await pagina.screenshot({ path: join(DIR, 'vendedor-filtro.png') })

  const retornoVendedor = await voltarDoDetalhe('/vendedor/pedidos')
  registrar(
    'vendedor: detalhe carrega com retorno na URL',
    retornoVendedor.ok && retornoVendedor.temRetorno === true,
    retornoVendedor.ok ? retornoVendedor.urlVolta : retornoVendedor.motivo,
  )
  if (retornoVendedor.ok) {
    const setorVolta = new URL(retornoVendedor.urlVolta).searchParams.get('setor')
    registrar('vendedor: voltar preserva o setor', setorVolta === 'TELHAS', setorVolta ?? '')
    const selectVolta = await pagina.getByLabel('Setor').inputValue()
    registrar('vendedor: select continua em Telhas', selectVolta === 'TELHAS', selectVolta)
  }

  await pagina.goto(`${BASE}/vendedor/pedidos?pagina=2`, { waitUntil: 'domcontentloaded' })
  await pagina.waitForTimeout(2500)
  const textoPagina = await pagina.locator('body').innerText()
  const temPaginacao = (await pagina.getByRole('button', { name: 'Próxima' }).count()) > 0
  if (temPaginacao) {
    const temPagina2 = /página 2 de/i.test(textoPagina)
    registrar('vendedor: link direto abre a página 2', temPagina2, temPagina2 ? 'página 2' : 'página 2 não renderizada')
  } else {
    registrar('vendedor: paginação não aplicável (menos de 21 pedidos)', true, 'N/A')
  }

  // ---------------- Gerente ----------------
  await login('gerente@3e.local', 'gerente123')
  await pagina.goto(`${BASE}/gerente/painel`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Painel' }).waitFor({ timeout: 30000 })
  await pagina.waitForTimeout(2500)
  const textoPainel = await pagina.locator('body').innerText()
  registrar('gerente: painel exibe Atualizar', (await pagina.getByRole('button', { name: 'Atualizar' }).count()) > 0)
  registrar('gerente: painel exibe ocorrências', textoPainel.includes('Ocorrências recentes'))
  registrar(
    'gerente: cumprimento de prazo não mostra 0% sem denominador',
    !/Cumprimento de prazo\s*\n?0%/i.test(textoPainel),
  )
  await pagina.screenshot({ path: join(DIR, 'gerente-painel.png') })
  if ((await pagina.getByRole('button', { name: 'Atualizar' }).count()) > 0) {
    await pagina.getByRole('button', { name: 'Atualizar' }).click()
    await pagina.getByRole('button', { name: 'Atualizar' }).waitFor({ timeout: 20000 })
    registrar('gerente: atualização manual conclui sem erro', true)
  }

  await pagina.goto(`${BASE}/gerente/pedidos?setor=TELHAS`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Pedidos' }).waitFor({ timeout: 30000 })
  await esperarLista()
  const retornoGerente = await voltarDoDetalhe('/gerente/pedidos')
  registrar(
    'gerente: voltar do detalhe preserva filtros',
    retornoGerente.ok && new URL(retornoGerente.urlVolta).searchParams.get('setor') === 'TELHAS',
    retornoGerente.ok ? retornoGerente.urlVolta : retornoGerente.motivo,
  )

  // Detalhe do gerente: itens recolhíveis e rótulos.
  await esperarLista()
  const abrirGerente = pagina.getByRole('button', { name: /Abrir pedido/ }).first()
  if ((await abrirGerente.count()) > 0) {
    await abrirGerente.click()
    await pagina.waitForURL(/\/gerente\/pedidos\/.+/, { timeout: 30000 })
    const botoesItens = pagina.getByRole('button', { name: /(Recolher|Expandir) item/ })
    await botoesItens.first().waitFor({ timeout: 30000 })
    const totalItens = await botoesItens.count()
    registrar('gerente: detalhe lista os itens', totalItens > 0, `${totalItens} item(ns)`)
    if (totalItens > 0) {
      const recolherTodos = pagina.getByRole('button', { name: 'Recolher todos' })
      if ((await recolherTodos.count()) > 0) {
        await recolherTodos.click()
        await pagina.waitForTimeout(400)
        const fechados = await pagina.getByRole('button', { name: /Expandir item/ }).count()
        registrar('gerente: “Recolher todos” fecha os itens', fechados === totalItens, `${fechados}/${totalItens}`)
        await pagina.getByRole('button', { name: 'Abrir todos' }).click()
        await pagina.getByRole('button', { name: /Recolher item/ }).first().waitFor({ timeout: 10000 })
        const abertos = await pagina.getByRole('button', { name: /Recolher item/ }).count()
        registrar('gerente: “Abrir todos” abre os itens', abertos === totalItens, `${abertos}/${totalItens}`)
      }
    }
    const textoDetalhe = await pagina.locator('body').innerText()
    registrar('gerente: rótulo “Prazo de entrega (item)”', textoDetalhe.includes('Prazo de entrega (item'))
    const temNovoPrazoSetor = textoDetalhe.includes('Prazo operacional (setor)')
    const temAntigoPrazoSetor = textoDetalhe.includes('Prazo do setor:')
    registrar(
      'gerente: rótulo de prazo do setor padronizado',
      !temAntigoPrazoSetor,
      temNovoPrazoSetor ? 'novo rótulo visível' : 'sem item com prazo de setor (N/A; coberto por teste unitário)',
    )
    await pagina.screenshot({ path: join(DIR, 'gerente-detalhe.png') })
  }

  // ---------------- Importação (sem enviar) ----------------
  await pagina.goto(`${BASE}/integracao`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Importar pedido' }).waitFor({ timeout: 30000 })
  await pagina.waitForTimeout(1200)
  const campoNumero = await pagina.getByLabel('Número do pedido').count()
  const botaoImportar = await pagina.getByRole('button', { name: 'Importar pedido' }).count()
  registrar('importação: formulário disponível', campoNumero > 0 && botaoImportar > 0)
  await pagina.screenshot({ path: join(DIR, 'importacao.png') })

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
