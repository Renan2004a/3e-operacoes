// Gravador automático da demonstração do 3E Operações (Playwright).
//
// Faz login real em cada perfil (usa o banco configurado em .env), navega o
// fluxo principal e grava a tela do navegador. Não altera dados: apenas navega
// e exibe as telas (nenhum formulário é enviado).
//
// Uso:
//   node scripts/gravar-demo.mjs
//
// Requer o app rodando (npm run dev) em http://localhost:3000.
// Saída: docs/video/demo-3e.webm (+ .mp4 se o ffmpeg do Playwright permitir).

import { chromium } from '@playwright/test'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const RAIZ = process.cwd()
const DIR_VIDEO = join(RAIZ, 'docs', 'video')
const DIR_RAW = join(DIR_VIDEO, 'raw')
const DIR_STEPS = join(DIR_VIDEO, 'steps')
const NUMERO_PEDIDO = process.env.PEDIDO_DEMO ?? '70435'

const CRED = {
  vendedor: { email: 'vendedor@3e.local', senha: 'vendedor123' },
  operador: { email: 'operador@3e.local', senha: 'operador123' },
  gerente: { email: 'gerente@3e.local', senha: 'gerente123' },
  expedicao: { email: 'expedicao@3e.local', senha: 'expedicao123' },
  admin: { email: 'admin@3e.local', senha: 'admin123' },
}

rmSync(DIR_RAW, { recursive: true, force: true })
mkdirSync(DIR_RAW, { recursive: true })
mkdirSync(DIR_STEPS, { recursive: true })

const pausa = (page, ms = 900) => page.waitForTimeout(ms)

/** Faixa de legenda fixa no rodapé (re-injetada após cada navegação). */
async function legenda(page, texto) {
  await page
    .evaluate((t) => {
      let el = document.getElementById('__legenda')
      if (!el) {
        el = document.createElement('div')
        el.id = '__legenda'
        el.style.cssText = [
          'position:fixed',
          'left:0',
          'right:0',
          'bottom:0',
          'z-index:2147483647',
          'background:rgba(15,23,42,.92)',
          'color:#fff',
          'font:600 20px/1.45 system-ui,Segoe UI,sans-serif',
          'padding:14px 24px',
          'text-align:center',
          'pointer-events:none',
          'box-shadow:0 -2px 14px rgba(0,0,0,.4)',
        ].join(';')
        document.body.appendChild(el)
      }
      el.textContent = t
    }, texto)
    .catch(() => {})
}

/** Cursor falso que segue o mouse (o vídeo do Playwright não mostra o ponteiro). */
async function cursor(page) {
  await page
    .evaluate(() => {
      if (document.getElementById('__cursor')) return
      const c = document.createElement('div')
      c.id = '__cursor'
      c.style.cssText = [
        'position:fixed',
        'left:-100px',
        'top:-100px',
        'width:20px',
        'height:20px',
        'border-radius:50%',
        'background:rgba(13,148,136,.85)',
        'border:2px solid #fff',
        'box-shadow:0 0 0 2px rgba(0,0,0,.35)',
        'transform:translate(-50%,-50%)',
        'z-index:2147483647',
        'pointer-events:none',
      ].join(';')
      document.body.appendChild(c)
      window.addEventListener(
        'mousemove',
        (e) => {
          c.style.left = e.clientX + 'px'
          c.style.top = e.clientY + 'px'
        },
        true,
      )
    })
    .catch(() => {})
}

/** Executa um passo: legenda + cursor + ação + screenshot + pausa. */
async function passo(page, nome, texto, fn) {
  await legenda(page, texto)
  await cursor(page)
  try {
    await fn()
  } catch (erro) {
    console.warn(`[passo ${nome}] ${erro.message}`)
  }
  await page.screenshot({ path: join(DIR_STEPS, `${nome}.png`) }).catch(() => {})
  await pausa(page)
}

async function login(context, page, perfil) {
  await context.clearCookies()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await pausa(page, 500)
  const { email, senha } = CRED[perfil]
  await page.getByLabel('E-mail').click()
  await page.getByLabel('E-mail').pressSequentially(email, { delay: 16 })
  await page.getByLabel('Senha').click()
  await page.getByLabel('Senha').pressSequentially(senha, { delay: 16 })
  await pausa(page, 350)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 })
    .catch(() => {})
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await pausa(page, 1200)
}

async function irPara(page, rota) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' })
}

/**
 * Pré-compila as rotas no dev server (o primeiro acesso em dev pode levar
 * dezenas de segundos). Roda em um contexto separado, sem gravar.
 */
async function aquecer(browser) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const alvos = {
    vendedor: ['/vendedor/pedidos'],
    gerente: ['/gerente/painel', '/integracao'],
    operador: ['/operador/fila'],
    expedicao: ['/expedicao/entregas'],
    admin: ['/admin/usuarios', '/admin/setores'],
  }
  for (const [perfil, rotas] of Object.entries(alvos)) {
    await login(ctx, page, perfil)
    for (const rota of rotas) {
      await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(400)
    }
  }
  // Rotas dinâmicas (atividade e ordem de produção) com um id real.
  await login(ctx, page, 'operador')
  try {
    const resposta = await page.request.get(`${BASE}/api/producao/atividades`)
    const dados = await resposta.json()
    const id = dados?.atividades?.[0]?.id
    if (id) {
      await page.goto(`${BASE}/operador/atividades/${id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      await page.goto(`${BASE}/producao/atividades/${id}/ordem`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
    }
  } catch {
    // Aquecimento é best-effort.
  }
  await ctx.close()
}

const browser = await chromium.launch()
console.log('Aquecendo rotas (pré-compilação)...')
await aquecer(browser)
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: DIR_RAW, size: { width: 1280, height: 720 } },
  locale: 'pt-BR',
})
const page = await context.newPage()
const video = page.video()
context.setDefaultTimeout(30000)

try {
  // 1. Login
  await passo(page, '01-login', 'Acesso por perfil — o servidor decide o que cada um vê.', async () => {
    await irPara(page, '/login')
  })
  await login(context, page, 'vendedor')
  await passo(page, '02-vendedor-entrou', 'Login do vendedor.', async () => {
    await irPara(page, '/vendedor/pedidos')
    await page.getByText(`Pedido ${NUMERO_PEDIDO}`).first().waitFor({ timeout: 15000 })
  })

  // 2. Vendedor — pedido e desmembramento
  await passo(
    page,
    '03-vendedor-detalhe',
    `Pedido ${NUMERO_PEDIDO}: os cinco valores por item (solicitado, executado, disponível, entregue, pendente).`,
    async () => {
      await page.getByRole('button', { name: `Abrir pedido ${NUMERO_PEDIDO}` }).click()
      await page.getByText('Solicitado:').first().waitFor({ timeout: 20000 })
      await page.getByText('Solicitado:').first().scrollIntoViewIfNeeded()
    },
  )
  await passo(
    page,
    '04-vendedor-desmembramento',
    'Desmembramento: o pedido dividido por setor (o que o papel não tem) + prazo do item.',
    async () => {
      await page.getByText('Desmembramento por setor').first().scrollIntoViewIfNeeded()
    },
  )

  // 3. Gerente — painel e importação
  await login(context, page, 'gerente')
  await passo(page, '05-gerente-painel', 'Painel do gerente: produção e atividades por setor.', async () => {
    await irPara(page, '/gerente/painel')
    await page.getByText('Produção por setor').first().waitFor({ timeout: 15000 })
  })
  await passo(
    page,
    '06-gerente-importar',
    'Importar pedido do Top Gerente pelo número (job assíncrono, sem escrita no legado).',
    async () => {
      await irPara(page, '/integracao')
      await page.getByText('Número do pedido').first().waitFor({ timeout: 15000 })
    },
  )

  // 4. Operador — fila, execução e ordem de produção
  await login(context, page, 'operador')
  await passo(page, '07-operador-fila', 'Fila do operador: item, pedido, setor e prioridade.', async () => {
    await irPara(page, '/operador/fila')
    await page.getByRole('heading', { name: 'Minha fila' }).waitFor({ timeout: 30000 })
    await page.getByRole('link', { name: 'Abrir' }).first().waitFor({ timeout: 30000 })
    await pausa(page, 900)
  })

  let atividadeId = null
  try {
    const resposta = await page.request.get(`${BASE}/api/producao/atividades`)
    atividadeId = (await resposta.json())?.atividades?.[0]?.id ?? null
  } catch {
    // sem id, os próximos passos são ignorados
  }

  await passo(
    page,
    '08-operador-executar',
    'Registrar execução e ocorrência (perda/refugo com motivo).',
    async () => {
      if (!atividadeId) return
      await page.goto(`${BASE}/operador/atividades/${atividadeId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('heading', { name: 'Executar atividade' }).waitFor({ timeout: 30000 })
      await page.getByText('Registrar execução').first().waitFor({ timeout: 30000 })
      await pausa(page, 800)
    },
  )
  await passo(page, '09-operador-ordem', 'Ordem de produção, pronta para imprimir.', async () => {
    if (!atividadeId) return
    await page.goto(`${BASE}/producao/atividades/${atividadeId}/ordem`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByText('Ordem de produção').first().waitFor({ timeout: 30000 })
    await page.getByText('Solicitado').first().waitFor({ timeout: 30000 })
    await pausa(page, 800)
  })

  // 5. Expedição — entregas
  await login(context, page, 'expedicao')
  await passo(page, '10-expedicao-entregas', 'Entregas: itens disponíveis e registro de entrega.', async () => {
    await irPara(page, '/expedicao/entregas')
    await page.getByRole('heading', { name: 'Entregas' }).waitFor({ timeout: 30000 })
    const select = page.getByLabel('Pedido')
    await select.waitFor({ timeout: 30000 })
    await select.selectOption({ label: `Pedido ${NUMERO_PEDIDO}` }).catch(() => {})
    await page
      .getByText('Disponível', { exact: false })
      .first()
      .waitFor({ timeout: 30000 })
      .catch(() => {})
    await pausa(page, 900)
  })

  // 6. Sistema — usuários e setores
  await login(context, page, 'admin')
  await passo(page, '11-admin-usuarios', 'Perfis de usuário e permissões.', async () => {
    await irPara(page, '/admin/usuarios')
    await pausa(page, 900)
  })
  await passo(page, '12-admin-setores', 'Setores da operação.', async () => {
    await irPara(page, '/admin/setores')
    await pausa(page, 900)
  })

  // 7. Responsividade
  await context.clearCookies()
  await context.setDefaultTimeout(15000)
  await login(context, page, 'vendedor')
  await passo(
    page,
    '13-responsivo',
    'Mesmas telas no celular (funciona no chão de fábrica).',
    async () => {
      await page.setViewportSize({ width: 390, height: 780 })
      await irPara(page, '/vendedor/pedidos')
      await page
        .getByText(`Pedido ${NUMERO_PEDIDO}`)
        .first()
        .waitFor({ timeout: 20000 })
        .catch(() => {})
      await pausa(page, 1200)
    },
  )

  // 8. Encerramento
  await passo(page, '14-final', '3E Operações — leitura do Top Gerente, banco próprio e fluxo por setor.', async () => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await context.clearCookies()
    await irPara(page, '/login')
  })
} finally {
  await context.close()
  const bruto = await video.path()
  const destinoWebm = join(DIR_VIDEO, 'demo-3e.webm')
  renameSync(bruto, destinoWebm)
  console.log(`Vídeo gravado: ${destinoWebm}`)

  // Conversão opcional para mp4 (H.264) usando um ffmpeg disponível.
  const { spawnSync } = await import('node:child_process')
  const destinoMp4 = join(DIR_VIDEO, 'demo-3e.mp4')
  const argsMp4 = [
    '-y',
    '-i',
    destinoWebm,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    destinoMp4,
  ]
  const candidatos = ['ffmpeg']
  const local = process.env.LOCALAPPDATA ?? ''
  candidatos.push(join(local, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'))
  try {
    const base = join(local, 'ms-playwright')
    const pasta = readdirSync(base).find((nome) => nome.startsWith('ffmpeg-'))
    if (pasta) candidatos.push(join(base, pasta, 'ffmpeg-win64.exe'))
  } catch {
    // sem ffmpeg do Playwright
  }
  let convertido = false
  for (const bin of candidatos) {
    const r = spawnSync(bin, argsMp4, { stdio: 'ignore' })
    if (!r.error && r.status === 0) {
      convertido = true
      break
    }
  }
  if (convertido) console.log(`MP4 gerado: ${destinoMp4}`)
  else console.warn('Não foi possível gerar mp4 (o .webm abre no navegador).')

  await browser.close()
}
