// Vídeo do FLUXO COMPLETO por perfil, executando de verdade no sistema.
//
// - Vendedor: puxa o pedido do Top Gerente (importação real) e faz o desmembramento por setor.
// - Operador: executa a atividade e registra ocorrência.
// - Gerente: painel/indicadores.
// - Expedição: registra a entrega.
// - Admin e Técnico: cadastros e integração.
//
// Requer: app em http://localhost:3000 e o conector local em http://localhost:8787.
// GRAVA dados no banco do app (o Top Gerente continua somente leitura).
//
// Uso:
//   node scripts/gravar-demo-fluxo.mjs
// Saída: docs/video/demo-fluxo.webm (+ .mp4 se houver ffmpeg).

import { chromium } from '@playwright/test'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const RAIZ = process.cwd()
const DIR_VIDEO = join(RAIZ, 'docs', 'video')
const DIR_RAW = join(DIR_VIDEO, 'raw-fluxo')
const DIR_STEPS = join(DIR_VIDEO, 'steps-fluxo')
const PEDIDO = process.env.PEDIDO_DEMO ?? '82269'

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

const pausa = (page, ms = 1600) => page.waitForTimeout(ms)

/** Tempo de leitura da legenda (proporcional ao texto), entre 3,5 s e 9 s. */
function tempoLeitura(texto) {
  return Math.min(9000, Math.max(3500, Math.round(String(texto).length * 72)))
}

async function legenda(page, texto) {
  await page
    .evaluate((t) => {
      let el = document.getElementById('__legenda')
      if (!el) {
        el = document.createElement('div')
        el.id = '__legenda'
        el.style.cssText = [
          'position:fixed', 'left:0', 'right:0', 'bottom:0', 'z-index:2147483646',
          'background:rgba(15,23,42,.92)', 'color:#fff',
          'font:600 21px/1.5 system-ui,Segoe UI,sans-serif', 'padding:16px 26px',
          'text-align:center', 'pointer-events:none', 'box-shadow:0 -2px 14px rgba(0,0,0,.4)',
        ].join(';')
        document.body.appendChild(el)
      }
      el.textContent = t
    }, texto)
    .catch(() => {})
}

async function cursor(page) {
  await page
    .evaluate(() => {
      if (document.getElementById('__cursor')) return
      const c = document.createElement('div')
      c.id = '__cursor'
      c.style.cssText = [
        'position:fixed', 'left:-100px', 'top:-100px', 'width:20px', 'height:20px',
        'border-radius:50%', 'background:rgba(13,148,136,.85)', 'border:2px solid #fff',
        'box-shadow:0 0 0 2px rgba(0,0,0,.35)', 'transform:translate(-50%,-50%)',
        'z-index:2147483647', 'pointer-events:none',
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

async function cartao(page, titulo, subtitulo) {
  await page
    .evaluate(
      ({ t, s }) => {
        document.getElementById('__cartao')?.remove()
        const el = document.createElement('div')
        el.id = '__cartao'
        el.style.cssText = [
          'position:fixed', 'inset:0', 'z-index:2147483647',
          'background:linear-gradient(135deg,#0f2b2a,#115e59)', 'color:#fff',
          'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
          'gap:18px', 'text-align:center', 'padding:48px',
          'font-family:system-ui,Segoe UI,sans-serif',
        ].join(';')
        const a = document.createElement('div')
        a.textContent = t
        a.style.cssText = 'font-size:48px;font-weight:800'
        const b = document.createElement('div')
        b.textContent = s
        b.style.cssText = 'font-size:21px;opacity:.88;max-width:900px;line-height:1.6'
        el.appendChild(a)
        el.appendChild(b)
        document.body.appendChild(el)
      },
      { t: titulo, s: subtitulo },
    )
    .catch(() => {})
  await page.waitForTimeout(2600)
  await page.evaluate(() => document.getElementById('__cartao')?.remove()).catch(() => {})
  await pausa(page, 500)
}

async function passo(page, nome, texto, fn) {
  await legenda(page, texto)
  await cursor(page)
  try {
    await fn()
  } catch (erro) {
    console.warn(`[passo ${nome}] ${erro.message}`)
  }
  await page.screenshot({ path: join(DIR_STEPS, `${nome}.png`) }).catch(() => {})
  await pausa(page, tempoLeitura(texto))
}

async function login(context, page, perfil) {
  await context.clearCookies()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await pausa(page, 600)
  const { email, senha } = CRED[perfil]
  await page.getByLabel('E-mail').click()
  await page.getByLabel('E-mail').pressSequentially(email, { delay: 42 })
  await page.getByLabel('Senha').click()
  await page.getByLabel('Senha').pressSequentially(senha, { delay: 42 })
  await pausa(page, 500)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    .catch(() => {})
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await pausa(page, 1400)
}

async function irPara(page, rota) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' })
}

async function aquecer(browser) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const alvos = {
    vendedor: ['/vendedor/pedidos'],
    gerente: ['/gerente/painel', '/gerente/pedidos', '/integracao'],
    operador: ['/operador/fila'],
    expedicao: ['/expedicao/entregas'],
    admin: ['/admin/usuarios', '/admin/setores', '/tecnico/integracao'],
  }
  for (const [perfil, rotas] of Object.entries(alvos)) {
    await login(ctx, page, perfil)
    for (const rota of rotas) {
      await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(450)
    }
  }
  await ctx.close()
}

const browser = await chromium.launch()
console.log('Aquecendo rotas...')
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
  // ---- Abertura -------------------------------------------------------------
  await passo(page, '01-abertura', '3E Operações — fluxo completo por perfil, executando de verdade.', async () => {
    await irPara(page, '/login')
    await cartao(
      page,
      '3E Operações',
      'Fluxo completo: o vendedor puxa o pedido do Top Gerente, vê o setor sugerido, desmembra e programa a remessa; a produção executa; a expedição entrega; o gerente acompanha os alertas.',
    )
  })

  // ---- VENDEDOR -------------------------------------------------------------
  await login(context, page, 'vendedor')
  await passo(page, '02-vendedor-login', 'Vendedor — o perfil começa na área de Vendas.', async () => {})

  await passo(
    page,
    '03-vendedor-importar',
    `Vendedor puxa o pedido ${PEDIDO} do Top Gerente pelo número.`,
    async () => {
      await irPara(page, '/vendedor/pedidos')
      await page.getByText('Puxar pedido do Top Gerente').first().waitFor({ timeout: 30000 })
      await page.getByLabel('Número do pedido').click()
      await page.getByLabel('Número do pedido').pressSequentially(PEDIDO, { delay: 140 })
      await pausa(page, 700)
      await page.getByRole('button', { name: 'Importar pedido' }).click()
    },
  )
  await passo(page, '04-vendedor-importado', 'Importação concluída: o pedido entra na lista automaticamente.', async () => {
    await page.getByText('Importação concluída').first().waitFor({ timeout: 90000 }).catch(() => {})
    await pausa(page, 1500)
  })

  await passo(page, '05-vendedor-abrir', 'Abrir o pedido importado para desmembrar os itens.', async () => {
    await page.getByRole('button', { name: `Abrir pedido ${PEDIDO}` }).first().waitFor({ timeout: 30000 })
    await page.getByRole('button', { name: `Abrir pedido ${PEDIDO}` }).first().click()
    await page.getByText('Desmembramento por setor').first().waitFor({ timeout: 30000 })
  })

  await passo(page, '06-vendedor-detalhe', 'Visão do pedido: métricas, itens e o resumo do desmembramento por setor.', async () => {
    await page.getByText('Pendentes de desmembramento').first().scrollIntoViewIfNeeded().catch(() => {})
    await pausa(page, 1000)
  })

  await passo(
    page,
    '06b-vendedor-sugestao',
    'Sugestão de setor: cada item pendente já vem com o setor sugerido pelas regras do produto — a decisão final continua com o vendedor.',
    async () => {
      const dica = page.getByText('Sugerido pelo produto').first()
      await dica.waitFor({ timeout: 15000 }).catch(() => {})
      await dica.scrollIntoViewIfNeeded().catch(() => {})
      await pausa(page, 1600)
    },
  )

  await passo(
    page,
    '07-vendedor-desmembrar',
    'Desmembramento: associar cada item ao setor responsável (Corte e Dobra, Telhas, Revenda).',
    async () => {
      const setores = ['Corte e Dobra', 'Telhas', 'Revenda']
      for (let i = 1; i <= 3; i++) {
        const select = page.getByLabel(`Setor do item ${i}`, { exact: true })
        if (!(await select.count())) break
        await select.scrollIntoViewIfNeeded().catch(() => {})
        await select.selectOption({ label: setores[(i - 1) % setores.length] })
        await pausa(page, 400)
        await page.getByRole('button', { name: `Classificar item ${i}`, exact: true }).click()
        await pausa(page, 1400)
      }
    },
  )
  await passo(page, '08-vendedor-desmembrado', 'Itens desmembrados: o resumo por setor e as pendências se atualizam.', async () => {
    await page.getByText('Desmembramento por setor').first().scrollIntoViewIfNeeded().catch(() => {})
    await pausa(page, 1200)
  })

  await passo(
    page,
    '08b-vendedor-remessa',
    'Entrega escalonada (remessa): programar a 1ª remessa do item com a data prevista.',
    async () => {
      const confirmar = page.getByRole('button', {
        name: 'Confirmar 1ª remessa do item 1',
        exact: true,
      })
      if (await confirmar.count()) {
        // Já havia remessa programada: apenas exibe.
        await confirmar.scrollIntoViewIfNeeded().catch(() => {})
        return
      }
      const numero = page.getByLabel('Remessa (item 1)', { exact: true })
      await numero.waitFor({ timeout: 30000 }).catch(() => {})
      if (await numero.count()) {
        await numero.scrollIntoViewIfNeeded().catch(() => {})
        await numero.fill('1')
        await page.getByLabel('Data prevista (item 1)', { exact: true }).fill('2026-12-15')
        await pausa(page, 700)
        await page.getByRole('button', { name: 'Programar remessa do item 1', exact: true }).click()
        // Espera o botão de confirmar surgir (evita casar com a própria legenda).
        await confirmar.waitFor({ timeout: 45000 }).catch(() => {})
      }
    },
  )
  await passo(
    page,
    '08c-vendedor-remessa-ok',
    'A remessa fica vinculada ao item; confirmar registra a entrega prevista.',
    async () => {
      const confirmar = page.getByRole('button', {
        name: 'Confirmar 1ª remessa do item 1',
        exact: true,
      })
      if (await confirmar.count()) {
        await confirmar.click()
        await page.getByText('Confirmada em').first().waitFor({ timeout: 45000 }).catch(() => {})
      }
      await pausa(page, 1200)
    },
  )

  await passo(page, '09-vendedor-prazo', 'Vendedor define o prazo de entrega do item (opcional).', async () => {
    const campo = page.getByLabel('Prazo do item 1', { exact: true })
    if (await campo.count()) {
      await campo.scrollIntoViewIfNeeded().catch(() => {})
      await campo.fill('2026-11-30')
      await pausa(page, 500)
      await page.getByRole('button', { name: 'Salvar prazo do item 1', exact: true }).click()
      await pausa(page, 1200)
    }
  })

  // ---- GERENTE --------------------------------------------------------------
  await login(context, page, 'gerente')
  await passo(page, '10-gerente-painel', 'Gerente — painel com produção e atividades por setor.', async () => {
    await irPara(page, '/gerente/painel')
    await page.getByText('Produção por setor').first().waitFor({ timeout: 30000 })
    await cartao(page, 'Gerente de Produção', 'Painel, alertas, pedidos e acompanhamento da produção.')
  })
  await passo(
    page,
    '10b-gerente-alertas',
    'Alertas operacionais: itens ATRASADOS, PARADOS e NÃO ENCAMINHADOS, com link direto para o pedido.',
    async () => {
      const titulo = page.getByText('Alertas operacionais').first()
      await titulo.waitFor({ timeout: 20000 }).catch(() => {})
      await titulo.scrollIntoViewIfNeeded().catch(() => {})
      await page.getByText('Atrasados').first().waitFor({ timeout: 20000 }).catch(() => {})
      await pausa(page, 1800)
    },
  )
  await passo(page, '11-gerente-pedidos', 'Gerente — consulta e detalhe dos pedidos.', async () => {
    await irPara(page, '/gerente/pedidos')
    await page.getByText(`Pedido ${PEDIDO}`).first().waitFor({ timeout: 30000 })
  })

  // ---- OPERADOR -------------------------------------------------------------
  await login(context, page, 'operador')
  await passo(page, '12-operador-fila', 'Operador — fila de atividades dos seus setores (inclui as novas).', async () => {
    await irPara(page, '/operador/fila')
    await page.getByRole('heading', { name: 'Minha fila' }).waitFor({ timeout: 30000 })
    await page.getByRole('link', { name: 'Abrir' }).first().waitFor({ timeout: 30000 })
    await cartao(page, 'Operador', 'Executar atividades, registrar ocorrências e imprimir a ordem de produção.')
  })

  let atividadeId = null
  try {
    const resposta = await page.request.get(`${BASE}/api/producao/atividades`)
    const lista = (await resposta.json())?.atividades ?? []
    atividadeId = lista[0]?.id ?? null
  } catch {
    // sem id, os passos seguintes do operador são ignorados
  }

  await passo(page, '13-operador-executar', 'Registrar a execução: 5 unidades produzidas.', async () => {
    if (!atividadeId) return
    await page.goto(`${BASE}/operador/atividades/${atividadeId}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Executar atividade' }).waitFor({ timeout: 30000 })
    await page.getByLabel('Quantidade produzida').click()
    await page.getByLabel('Quantidade produzida').pressSequentially('5', { delay: 200 })
    await pausa(page, 600)
    await page.getByRole('button', { name: 'Registrar execução' }).click()
  })
  await passo(page, '14-operador-executado', 'Execução registrada — o saldo do item é atualizado.', async () => {
    await page.getByText('Execução registrada.').first().waitFor({ timeout: 30000 }).catch(() => {})
    await pausa(page, 1200)
  })
  await passo(page, '15-operador-ocorrencia', 'Registrar ocorrência (perda) com motivo obrigatório.', async () => {
    await page.getByText('Registrar ocorrência').first().scrollIntoViewIfNeeded().catch(() => {})
    await page.getByLabel('Tipo de ocorrência').selectOption('PERDA').catch(() => {})
    await page.getByLabel('Motivo', { exact: true }).selectOption({ index: 1 }).catch(() => {})
    await page.getByLabel('Quantidade', { exact: true }).fill('1')
    await pausa(page, 600)
    await page.getByRole('button', { name: 'Registrar ocorrência' }).click()
  })
  await passo(page, '16-operador-ocorrencia-ok', 'Ocorrência registrada e rastreada.', async () => {
    await page.getByText('Ocorrência registrada').first().waitFor({ timeout: 30000 }).catch(() => {})
  })
  await passo(page, '17-operador-ordem', 'Ordem de produção, pronta para imprimir.', async () => {
    if (!atividadeId) return
    await page.goto(`${BASE}/producao/atividades/${atividadeId}/ordem`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Ordem de produção').first().waitFor({ timeout: 30000 })
    await page.getByText('Solicitado').first().waitFor({ timeout: 30000 })
  })

  // ---- EXPEDIÇÃO ------------------------------------------------------------
  let itemEntrega = null
  try {
    const lista = await (await page.request.get(`${BASE}/api/pedidos`)).json()
    const pedidoId = lista?.pedidos?.find((p) => p.numero === PEDIDO)?.id
    if (pedidoId) {
      const detalhe = await (await page.request.get(`${BASE}/api/pedidos/${pedidoId}`)).json()
      const itens = detalhe?.pedido?.itens ?? []
      const idx = itens.findIndex((item) => Number(item.disponivel) > 0)
      itemEntrega = idx >= 0 ? idx + 1 : null
    }
  } catch {
    // sem item, a entrega é ignorada
  }

  await login(context, page, 'expedicao')
  await passo(page, '18-expedicao-entregas', 'Expedição — registrar a entrega de um item com saldo disponível.', async () => {
    await irPara(page, '/expedicao/entregas')
    await page.getByRole('heading', { name: 'Entregas' }).waitFor({ timeout: 30000 })
    await page.getByLabel('Pedido').selectOption({ label: `Pedido ${PEDIDO}` }).catch(() => {})
    await cartao(page, 'Expedição', 'Entregas totais ou parciais, respeitando o disponível.')
  })
  await passo(page, '19-expedicao-entrega', 'Entrega registrada — o disponível é atualizado.', async () => {
    if (!itemEntrega) return
    const campo = page.getByLabel(`Quantidade do item ${itemEntrega}`, { exact: true })
    await campo.waitFor({ timeout: 30000 })
    await campo.click()
    await campo.pressSequentially('1', { delay: 200 })
    await pausa(page, 600)
    await page
      .getByRole('button', { name: `Registrar entrega do item ${itemEntrega}`, exact: true })
      .click()
    await page.getByText('Entrega registrada').first().waitFor({ timeout: 30000 }).catch(() => {})
  })

  // ---- ADMIN E TÉCNICO ------------------------------------------------------
  await login(context, page, 'admin')
  await passo(page, '20-admin-usuarios', 'Responsável de Sistema — usuários, perfis e permissões.', async () => {
    await irPara(page, '/admin/usuarios')
    await page.getByRole('heading', { name: 'Usuários', exact: true }).waitFor({ timeout: 30000 })
    await cartao(page, 'Responsável de Sistema', 'Usuários, setores e mapeamento de categoria.')
  })
  await passo(page, '21-admin-setores', 'Setores e mapeamento de categoria → setor.', async () => {
    await irPara(page, '/admin/setores')
    await page.getByText('Mapeamento de categoria').first().waitFor({ timeout: 30000 })
  })
  await passo(page, '22-tecnico-jobs', 'Responsável Técnico — jobs de integração com o Top Gerente.', async () => {
    await irPara(page, '/tecnico/integracao')
    await page.getByText('Jobs', { exact: true }).first().waitFor({ timeout: 30000 })
    await cartao(page, 'Responsável Técnico', 'Acompanhar integrações, erros e eventos.')
  })
  await passo(page, '23-tecnico-eventos', 'Eventos do job selecionado (rastreabilidade da integração).', async () => {
    const lista = page.getByRole('list', { name: 'Jobs de integração' })
    const botao = lista.getByRole('button').first()
    if (await botao.count()) {
      await botao.click()
      await page.getByText('Eventos do job').first().waitFor({ timeout: 30000 })
      await page
        .getByRole('list', { name: 'Eventos' })
        .or(page.getByText('Este job não possui eventos.'))
        .first()
        .waitFor({ timeout: 30000 })
        .catch(() => {})
    }
  })

  // ---- RESPONSIVO E LOGOUT --------------------------------------------------
  await login(context, page, 'vendedor')
  await passo(page, '24-mobile', 'Responsividade — a mesma área de Vendas no celular.', async () => {
    await page.setViewportSize({ width: 390, height: 780 })
    await irPara(page, '/vendedor/pedidos')
    await page.getByText(`Pedido ${PEDIDO}`).first().waitFor({ timeout: 30000 }).catch(() => {})
    await pausa(page, 1200)
  })
  await passo(page, '25-logout', 'Sair encerra a sessão e volta ao login.', async () => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const sair = page.getByRole('button', { name: 'Sair' }).first()
    if (await sair.count()) {
      await sair.click()
      await page.waitForURL(/\/login$/, { timeout: 30000 }).catch(() => {})
    }
  })
  await passo(page, '26-final', '3E Operações — do pedido comercial à entrega, com rastreabilidade.', async () => {
    await irPara(page, '/login')
    await cartao(page, 'Fim', 'Obrigado!')
  })
} finally {
  await context.close()
  const bruto = await video.path()
  const destinoWebm = join(DIR_VIDEO, 'demo-fluxo.webm')
  renameSync(bruto, destinoWebm)
  console.log(`Vídeo gravado: ${destinoWebm}`)

  const { spawnSync } = await import('node:child_process')
  const destinoMp4 = join(DIR_VIDEO, 'demo-fluxo.mp4')
  const argsMp4 = ['-y', '-i', destinoWebm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', destinoMp4]
  const candidatos = ['ffmpeg']
  const local = process.env.LOCALAPPDATA ?? ''
  const acharFfmpeg = (raiz) => {
    try {
      const pilha = [raiz]
      while (pilha.length) {
        const dir = pilha.pop()
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, e.name)
          if (e.isDirectory()) pilha.push(p)
          else if (e.name === 'ffmpeg.exe') return p
        }
      }
    } catch {
      /* ignora */
    }
    return null
  }
  const encontrado = acharFfmpeg(join(local, 'Microsoft', 'WinGet', 'Packages'))
  if (encontrado) candidatos.push(encontrado)
  let ok = false
  for (const bin of candidatos) {
    const r = spawnSync(bin, argsMp4, { stdio: 'ignore' })
    if (!r.error && r.status === 0) {
      ok = true
      break
    }
  }
  console.log(ok ? `MP4 gerado: ${destinoMp4}` : 'MP4 não gerado (o .webm abre no navegador).')
  await browser.close()
}
