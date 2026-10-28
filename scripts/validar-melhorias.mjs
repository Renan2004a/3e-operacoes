import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const DIR = join(process.cwd(), 'docs', 'video', 'validacao-melhorias')
mkdirSync(DIR, { recursive: true })

const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 }, locale: 'pt-BR' })
const pagina = await contexto.newPage()
const ok = []
const falhas = []

function verificar(nome, condicao, detalhe = '') {
  if (condicao) ok.push(nome)
  else falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
}

async function entrar(email, senha) {
  await contexto.clearCookies()
  await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pagina.getByRole('heading', { name: 'Entrar' }).waitFor({ timeout: 40000 })
  await pagina.getByLabel('E-mail').fill(email)
  await pagina.getByLabel('Senha').fill(senha)
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click()
  await pagina.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 40000 })
}

try {
  // 1. Login com campos vazios
  await pagina.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await pagina.getByRole('button', { name: 'Entrar', exact: true }).click()
  await pagina.getByText('Dados incompletos').waitFor({ timeout: 5000 })
  verificar('login: validação antes da requisição', true)

  // 2. Cabeçalhos e robots
  const resposta = await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  verificar('headers: X-Frame-Options', resposta?.headers()['x-frame-options'] === 'DENY')
  verificar('headers: nosniff', resposta?.headers()['x-content-type-options'] === 'nosniff')
  const robots = await fetch(`${BASE}/robots.txt`)
  verificar('robots: noindex', (await robots.text()).includes('Disallow: /'))

  // 3. Vendedor: descrições e códigos
  await entrar('vendedor@3e.local', 'vendedor123')
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().waitFor({ timeout: 40000 })
  await pagina.screenshot({ path: join(DIR, 'vendedor-lista.png'), fullPage: false })
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().click()
  await pagina.waitForURL(/\/pedidos\/.+/, { timeout: 40000 })
  await pagina.getByRole('button', { name: /(Recolher|Expandir) item/ }).first().waitFor({ timeout: 40000 })
  const textoDetalhe = await pagina.locator('main').innerText()
  verificar('vendedor: sem descrição "."', !/Expandir item \d+: \./.test(textoDetalhe))
  verificar('vendedor: sem "Código —"', !textoDetalhe.includes('Código —'))
  verificar('vendedor: sem mojibake', !/Ã§|Ã£|Ãµ|Ã©/.test(textoDetalhe))
  await pagina.screenshot({ path: join(DIR, 'vendedor-detalhe.png'), fullPage: false })

  // 4. Gerente: fila com atividades
  await entrar('gerente@3e.local', 'gerente123')
  await pagina.goto(`${BASE}/operador/fila`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { level: 1, name: 'Fila de produção' }).waitFor({ timeout: 40000 })
  await pagina.waitForTimeout(2500)
  const cartoesGerente = await pagina.getByRole('link', { name: /Abrir atividade/ }).count()
  verificar('gerente: fila com atividades de todos os setores', cartoesGerente > 0, `${cartoesGerente} cartões`)
  await pagina.screenshot({ path: join(DIR, 'gerente-fila.png'), fullPage: false })

  // 5. Divisão de alertas
  await pagina.goto(`${BASE}/gerente/painel`, { waitUntil: 'domcontentloaded' })
  await pagina.getByText('Alertas operacionais').waitFor({ timeout: 40000 })
  verificar('painel: rótulo "Atividades atrasadas"', await pagina.getByText('Atividades atrasadas').isVisible())

  // 6. Expedição: identificação do item
  await entrar('expedicao@3e.local', 'expedicao123')
  await pagina.getByRole('heading', { level: 1, name: 'Entregas' }).waitFor({ timeout: 40000 })
  verificar('expedição: instrução inicial', await pagina.getByText('Selecione um pedido').first().isVisible())
  const select = pagina.getByLabel('Pedido')
  const opcoes = await select.locator('option').count()
  if (opcoes > 1) {
    await select.selectOption({ index: opcoes - 1 })
    await pagina.getByText(/Disponível:|Aguardando produção/).first().waitFor({ timeout: 30000 })
    const texto = await pagina.locator('main').innerText()
    verificar('expedição: item com descrição ou fallback', /Item \d+ sem descrição|Disponível:/.test(texto))
    verificar('expedição: cliente no cartão', texto.includes('Cliente '))
    await pagina.screenshot({ path: join(DIR, 'expedicao-itens.png'), fullPage: false })
  }

  // 7. Admin usuários no celular
  await entrar('admin@3e.local', 'admin123')
  await pagina.setViewportSize({ width: 390, height: 844 })
  await pagina.goto(`${BASE}/admin/usuarios`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { level: 1, name: 'Usuários' }).waitFor({ timeout: 40000 })
  await pagina.waitForTimeout(2500)
  const medidas = await pagina.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    largura: window.innerWidth,
  }))
  verificar(
    'admin usuários: sem overflow no celular',
    medidas.scroll <= medidas.largura + 1,
    `scroll ${medidas.scroll} / ${medidas.largura}`,
  )
  await pagina.screenshot({ path: join(DIR, 'admin-usuarios-mobile.png'), fullPage: true })

  // 8. 404 amigável
  await pagina.setViewportSize({ width: 1280, height: 900 })
  const resposta404 = await pagina.goto(`${BASE}/rota-inexistente`, { waitUntil: 'domcontentloaded' })
  verificar('404: status 404', resposta404?.status() === 404)
  verificar('404: texto em português', await pagina.getByText('Página não encontrada').isVisible())
  await pagina.screenshot({ path: join(DIR, 'pagina-404.png'), fullPage: false })
} finally {
  await navegador.close()
}

console.log(ok.map((item) => `OK   | ${item}`).join('\n'))
if (falhas.length) console.log('\n' + falhas.map((item) => `FALHA| ${item}`).join('\n'))
console.log(`\nResumo: ${ok.length} OK, ${falhas.length} falha(s).`)
process.exitCode = falhas.length ? 1 : 0
