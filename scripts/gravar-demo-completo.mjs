// Gravador da demonstração do 3E Operações (Playwright), em dois modos:
//
//   MODO=demo      (padrão)  -> só navega e exibe as telas (não grava dados)
//   MODO=execucao            -> executa de verdade: importa o pedido e registra
//                               execução, ocorrência e entrega (GRAVA no banco
//                               do app; o Top Gerente continua somente leitura)
//
// As legendas ficam visíveis por tempo proporcional ao texto (leitura confortável).
//
// Uso (PowerShell):
//   npm run dev
//   node scripts/gravar-demo-completo.mjs                 # demo  -> docs/video/demo-3e-completo.mp4
//   $env:MODO='execucao'; node scripts/gravar-demo-completo.mjs  # -> docs/video/demo-3e-execucao.mp4
//
// Requer o app em http://localhost:3000 e, no modo execucao, o conector local no ar.
// Não substitui docs/video/demo-3e.mp4 (vídeo curto anterior).

import { chromium } from '@playwright/test'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const RAIZ = process.cwd()
const DIR_VIDEO = join(RAIZ, 'docs', 'video')
const NUMERO_PEDIDO = process.env.PEDIDO_DEMO ?? '70435'
const MODO = (process.env.MODO ?? 'demo').toLowerCase()
const REAL = MODO === 'execucao'
const NOME = REAL ? 'demo-3e-execucao' : 'demo-3e-completo'
const DIR_RAW = join(DIR_VIDEO, `raw-${NOME}`)
const DIR_STEPS = join(DIR_VIDEO, `steps-${NOME}`)

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

const pausa = (page, ms) => page.waitForTimeout(ms)

/** Tempo de leitura da legenda (proporcional ao texto), entre 3,5 s e 9 s. */
function tempoLeitura(texto) {
  const ms = Math.round(String(texto).length * 72)
  return Math.min(9000, Math.max(3500, ms))
}

/** Faixa de legenda fixa no rodapé. */
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
          'z-index:2147483646',
          'background:rgba(15,23,42,.92)',
          'color:#fff',
          'font:600 21px/1.5 system-ui,Segoe UI,sans-serif',
          'padding:16px 26px',
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

/** Cursor falso que segue o mouse. */
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

/** Cartão de seção em tela cheia (tempo de leitura pelo tamanho do texto). */
async function cartao(page, titulo, subtitulo) {
  await page
    .evaluate(
      ({ t, s }) => {
        document.getElementById('__cartao')?.remove()
        const el = document.createElement('div')
        el.id = '__cartao'
        el.style.cssText = [
          'position:fixed',
          'inset:0',
          'z-index:2147483647',
          'background:linear-gradient(135deg,#0f2b2a,#115e59)',
          'color:#fff',
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'justify-content:center',
          'gap:18px',
          'text-align:center',
          'padding:48px',
          'font-family:system-ui,Segoe UI,sans-serif',
        ].join(';')
        const a = document.createElement('div')
        a.textContent = t
        a.style.cssText = 'font-size:48px;font-weight:800;letter-spacing:-.5px'
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
  await page.waitForTimeout(Math.min(9000, Math.max(3500, (titulo.length + subtitulo.length) * 60)))
  await page.evaluate(() => document.getElementById('__cartao')?.remove()).catch(() => {})
  await pausa(page, 600)
}

/** Executa um passo: legenda + cursor + ação + screenshot + pausa de leitura. */
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
  await pausa(page, 700)
  const { email, senha } = CRED[perfil]
  await page.getByLabel('E-mail').click()
  await page.getByLabel('E-mail').pressSequentially(email, { delay: 45 })
  await page.getByLabel('Senha').click()
  await page.getByLabel('Senha').pressSequentially(senha, { delay: 45 })
  await pausa(page, 600)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page
    .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
    .catch(() => {})
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await pausa(page, 1500)
}

async function irPara(page, rota) {
  await page.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' })
}

/** Pré-compila as rotas no dev server (primeiro acesso pode ser lento). */
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
      await page.waitForTimeout(500)
    }
  }
  try {
    await login(ctx, page, 'gerente')
    const pedidos = await (await page.request.get(`${BASE}/api/pedidos`)).json()
    const pedidoId = pedidos?.pedidos?.[0]?.id
    if (pedidoId) {
      await page.goto(`${BASE}/gerente/pedidos/${pedidoId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
    }
    await login(ctx, page, 'operador')
    const fila = await (await page.request.get(`${BASE}/api/producao/atividades`)).json()
    const atividadeId = fila?.atividades?.[0]?.id
    if (atividadeId) {
      await page.goto(`${BASE}/operador/atividades/${atividadeId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForTimeout(900)
      await page.goto(`${BASE}/producao/atividades/${atividadeId}/ordem`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForTimeout(900)
    }
  } catch {
    // best-effort
  }
  await ctx.close()
}

const browser = await chromium.launch()
console.log(`Aquecendo rotas... (modo ${MODO})`)
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
  // ---- Abertura e login -----------------------------------------------------
  await passo(
    page,
    '01-abertura',
    '3E Operações: leitura do Top Gerente, banco próprio e trabalho por setor.',
    async () => {
      await irPara(page, '/login')
      await cartao(
        page,
        '3E Operações',
        'Sistema de operações da fábrica. Lê os pedidos do Top Gerente (somente leitura), guarda tudo em banco próprio e organiza o trabalho por setor.',
      )
    },
  )
  await login(context, page, 'vendedor')
  await passo(page, '02-login', 'Login por perfil: o servidor decide o que cada um vê.', async () => {})

  // ---- Vendedor -------------------------------------------------------------
  await passo(
    page,
    '03-vendedor-lista',
    'Vendedor — consulta de pedidos, com filtros de cliente, setor, status e período.',
    async () => {
      await irPara(page, '/vendedor/pedidos')
      await page.getByText(`Pedido ${NUMERO_PEDIDO}`).first().waitFor({ timeout: 30000 })
    },
  )
  await passo(
    page,
    '04-vendedor-valores',
    `Pedido ${NUMERO_PEDIDO}: os cinco valores por item — solicitado, executado, disponível, entregue e pendente.`,
    async () => {
      await page.getByRole('button', { name: `Abrir pedido ${NUMERO_PEDIDO}` }).click()
      await page.getByText('Solicitado:').first().waitFor({ timeout: 30000 })
      await page.getByText('Solicitado:').first().scrollIntoViewIfNeeded()
    },
  )
  await passo(
    page,
    '05-vendedor-desmembramento',
    'Desmembramento por setor: o pedido dividido por setor, algo que o papel não mostra.',
    async () => {
      await page.getByText('Desmembramento por setor').first().scrollIntoViewIfNeeded()
    },
  )
  await passo(
    page,
    '06-vendedor-prazo',
    'Prazo do item e classificação: o vendedor define o prazo e desmembra o item por setor.',
    async () => {
      await page.getByText('Prazo do item 1').first().scrollIntoViewIfNeeded()
    },
  )

  // ---- Gerente --------------------------------------------------------------
  await login(context, page, 'gerente')
  await passo(
    page,
    '07-gerente-painel',
    'Gerente de Produção — painel com pendências, em andamento, concluídas e cumprimento de prazo.',
    async () => {
      await irPara(page, '/gerente/painel')
      await page.getByText('Produção por setor').first().waitFor({ timeout: 30000 })
      await cartao(page, 'Gerente de Produção', 'Painel, pedidos, importação e fila de produção.')
    },
  )
  await passo(
    page,
    '08-gerente-setores',
    'Indicadores por setor e por status, com o nome dos setores (sem códigos internos).',
    async () => {
      await page.getByText('Atividades por setor').first().scrollIntoViewIfNeeded()
    },
  )
  await passo(page, '09-gerente-pedidos', 'Gerente — consulta de pedidos.', async () => {
    await irPara(page, '/gerente/pedidos')
    await page.getByText(`Pedido ${NUMERO_PEDIDO}`).first().waitFor({ timeout: 30000 })
  })
  await passo(
    page,
    '10-gerente-detalhe',
    'Detalhe do pedido do gerente, com desmembramento e classificação por setor.',
    async () => {
      await page.getByRole('button', { name: `Abrir pedido ${NUMERO_PEDIDO}` }).click()
      await page.getByText('Desmembramento por setor').first().waitFor({ timeout: 30000 })
    },
  )
  await passo(page, '11-gerente-fila', 'Fila de produção, também acessível ao gerente.', async () => {
    await irPara(page, '/operador/fila')
    await page
      .getByRole('heading', { name: 'Minha fila' })
      .or(page.getByText('Sem atividades na fila'))
      .first()
      .waitFor({ timeout: 30000 })
      .catch(() => {})
  })

  if (REAL) {
    await passo(
      page,
      '12-importar',
      'Importar pedido do Top Gerente: informar o número do pedido e iniciar a importação.',
      async () => {
        await irPara(page, '/integracao')
        await page.getByLabel('Número do pedido').click()
        await page.getByLabel('Número do pedido').pressSequentially(NUMERO_PEDIDO, { delay: 140 })
        await pausa(page, 700)
        await page.getByRole('button', { name: 'Importar pedido' }).click()
        await page.getByText('Status da importação').first().waitFor({ timeout: 30000 })
      },
    )
    await passo(
      page,
      '13-importar-status',
      'Acompanhamento do job: o sistema despacha ao conector local e confirma a importação.',
      async () => {
        await page.getByText('Importação concluída').first().waitFor({ timeout: 45000 }).catch(() => {})
      },
    )
  } else {
    await passo(
      page,
      '12-importar',
      'Importar pedido do Top Gerente pelo número (job assíncrono, sem escrita no legado).',
      async () => {
        await irPara(page, '/integracao')
        await page.getByText('Número do pedido').first().waitFor({ timeout: 30000 })
      },
    )
  }

  // ---- Operador -------------------------------------------------------------
  await login(context, page, 'operador')
  await passo(
    page,
    '14-operador-fila',
    'Operador — fila com item, pedido, setor e prioridade.',
    async () => {
      await irPara(page, '/operador/fila')
      await page.getByRole('heading', { name: 'Minha fila' }).waitFor({ timeout: 30000 })
      await page.getByRole('link', { name: 'Abrir' }).first().waitFor({ timeout: 30000 })
      await cartao(page, 'Operador', 'Fila, execução, ocorrências e ordem de produção.')
    },
  )

  let atividadeId = null
  try {
    const resposta = await page.request.get(`${BASE}/api/producao/atividades`)
    const lista = (await resposta.json())?.atividades ?? []
    atividadeId = (lista.find((a) => a.sectorName === 'Corte e Dobra') ?? lista[0])?.id ?? null
  } catch {
    // sem id, os passos seguintes do operador são ignorados
  }

  await passo(
    page,
    '15-operador-executar',
    REAL
      ? 'Executar atividade: registrar 5 unidades produzidas no item.'
      : 'Executar atividade: progresso, valores e registro de execução.',
    async () => {
      if (!atividadeId) return
      await page.goto(`${BASE}/operador/atividades/${atividadeId}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('heading', { name: 'Executar atividade' }).waitFor({ timeout: 30000 })
      await page.getByText('Registrar execução').first().waitFor({ timeout: 30000 })
      if (REAL) {
        await page.getByLabel('Quantidade produzida').click()
        await page.getByLabel('Quantidade produzida').pressSequentially('5', { delay: 220 })
        await pausa(page, 700)
        await page.getByRole('button', { name: 'Registrar execução' }).click()
      }
    },
  )
  if (REAL) {
    await passo(
      page,
      '16-operador-executado',
      'Execução registrada: o saldo do item é atualizado na hora.',
      async () => {
        await page.getByText('Execução registrada.').first().waitFor({ timeout: 30000 }).catch(() => {})
        await pausa(page, 1200)
      },
    )
  }
  await passo(
    page,
    '17-operador-ocorrencia',
    REAL
      ? 'Registrar ocorrência: perda de 1 unidade com o motivo obrigatório.'
      : 'Registrar ocorrência: perda e refugo com motivo obrigatório.',
    async () => {
      await page.getByText('Registrar ocorrência').first().scrollIntoViewIfNeeded()
      if (REAL) {
        await page.getByLabel('Tipo de ocorrência').selectOption('PERDA').catch(() => {})
        await page.getByLabel('Motivo', { exact: true }).selectOption({ index: 1 }).catch(() => {})
        await page.getByLabel('Quantidade', { exact: true }).fill('1')
        await pausa(page, 700)
        await page.getByRole('button', { name: 'Registrar ocorrência' }).click()
      }
    },
  )
  if (REAL) {
    await passo(
      page,
      '18-operador-ocorrencia-ok',
      'Ocorrência registrada e rastreada (a perda não abate a obrigação de produzir).',
      async () => {
        await page.getByText('Ocorrência registrada').first().waitFor({ timeout: 30000 }).catch(() => {})
      },
    )
  }
  await passo(page, '19-operador-ordem', 'Ordem de produção, pronta para imprimir.', async () => {
    if (!atividadeId) return
    await page.goto(`${BASE}/producao/atividades/${atividadeId}/ordem`, {
      waitUntil: 'domcontentloaded',
    })
    await page.getByText('Ordem de produção').first().waitFor({ timeout: 30000 })
    await page.getByText('Solicitado').first().waitFor({ timeout: 30000 })
  })

  // ---- Expedição ------------------------------------------------------------
  let itemEntrega = null
  if (REAL) {
    try {
      const lista = await (await page.request.get(`${BASE}/api/pedidos`)).json()
      const pedidoId = lista?.pedidos?.find((p) => p.numero === NUMERO_PEDIDO)?.id
      if (pedidoId) {
        const detalhe = await (await page.request.get(`${BASE}/api/pedidos/${pedidoId}`)).json()
        const itens = detalhe?.pedido?.itens ?? []
        const idx = itens.findIndex((item) => Number(item.disponivel) > 0)
        itemEntrega = idx >= 0 ? idx + 1 : null
      }
    } catch {
      // sem item, a entrega real é ignorada
    }
  }

  await login(context, page, 'expedicao')
  await passo(
    page,
    '20-expedicao-entregas',
    'Expedição — entregas: itens disponíveis e registro de entrega.',
    async () => {
      await irPara(page, '/expedicao/entregas')
      await page.getByRole('heading', { name: 'Entregas' }).waitFor({ timeout: 30000 })
      await page.getByLabel('Pedido').selectOption({ label: `Pedido ${NUMERO_PEDIDO}` }).catch(() => {})
      await page
        .getByText('Disponível', { exact: false })
        .first()
        .waitFor({ timeout: 30000 })
        .catch(() => {})
      await cartao(page, 'Expedição', 'Entrega dentro do disponível; acima dele exige gerente + motivo.')
    },
  )
  if (REAL && itemEntrega) {
    await passo(
      page,
      '21-expedicao-entrega',
      `Registrar a entrega de 1 unidade do item ${itemEntrega} (dentro do disponível).`,
      async () => {
        const campo = page.getByLabel(`Quantidade do item ${itemEntrega}`)
        await campo.waitFor({ timeout: 30000 })
        await campo.click()
        await campo.pressSequentially('1', { delay: 220 })
        await pausa(page, 700)
        await page.getByRole('button', { name: `Registrar entrega do item ${itemEntrega}` }).click()
      },
    )
    await passo(
      page,
      '22-expedicao-entrega-ok',
      'Entrega registrada: o disponível diminui e a expedição confirma o saldo.',
      async () => {
        await page.getByText('Entrega registrada').first().waitFor({ timeout: 30000 }).catch(() => {})
      },
    )
  } else {
    await passo(
      page,
      '21-expedicao-excecao',
      'Entrega acima do disponível: exige autorização de gerente e motivo (auditado).',
      async () => {
        const campo = page.getByLabel('Quantidade do item 1')
        if (await campo.count()) {
          await campo.click()
          await campo.pressSequentially('9999', { delay: 140 })
          await page
            .getByText('acima do disponível', { exact: false })
            .first()
            .waitFor({ timeout: 10000 })
            .catch(() => {})
          await page
            .getByText('Autorizar acima do disponível')
            .first()
            .scrollIntoViewIfNeeded()
            .catch(() => {})
          await pausa(page, 1400)
        }
      },
    )
  }

  // ---- Sistema --------------------------------------------------------------
  await login(context, page, 'admin')
  await passo(
    page,
    '23-admin-usuarios',
    'Responsável de Sistema — usuários, perfis e setores por usuário.',
    async () => {
      await irPara(page, '/admin/usuarios')
      await page.getByRole('heading', { name: 'Usuários', exact: true }).waitFor({ timeout: 30000 })
      await cartao(page, 'Responsável de Sistema', 'Usuários, setores e mapeamento de categoria.')
    },
  )
  await passo(
    page,
    '24-admin-setores',
    'Setores e mapeamento categoria → setor: a categoria do legado vira setor operacional.',
    async () => {
      await irPara(page, '/admin/setores')
      await page.getByText('Mapeamento de categoria').first().waitFor({ timeout: 30000 })
    },
  )
  await passo(page, '25-admin-setores-lista', 'Setores cadastrados.', async () => {
    await page.getByText('Setores cadastrados').first().scrollIntoViewIfNeeded()
  })

  // ---- Técnico --------------------------------------------------------------
  await passo(
    page,
    '26-tecnico-jobs',
    'Responsável Técnico — jobs de integração com o Top Gerente.',
    async () => {
      await irPara(page, '/tecnico/integracao')
      await page.getByText('Jobs', { exact: true }).first().waitFor({ timeout: 30000 })
      await cartao(page, 'Responsável Técnico', 'Jobs de integração, status, erros e eventos.')
    },
  )
  await passo(page, '27-tecnico-eventos', 'Eventos do job selecionado.', async () => {
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
      await pausa(page, 900)
    }
  })

  // ---- Saldo atualizado (modo execucao) ------------------------------------
  if (REAL) {
    await login(context, page, 'vendedor')
    await passo(
      page,
      '28-vendedor-saldo',
      'Vendedor confere o saldo do item já atualizado pela execução e pela entrega.',
      async () => {
        await irPara(page, '/vendedor/pedidos')
        await page.getByRole('button', { name: `Abrir pedido ${NUMERO_PEDIDO}` }).click()
        await page.getByText('Solicitado:').first().waitFor({ timeout: 30000 })
        await page.getByText('Solicitado:').first().scrollIntoViewIfNeeded()
      },
    )
  }

  // ---- Responsividade e logout ---------------------------------------------
  await login(context, page, 'vendedor')
  await passo(
    page,
    '29-mobile-lista',
    'Responsividade: as mesmas telas funcionam no celular (390 px).',
    async () => {
      await page.setViewportSize({ width: 390, height: 780 })
      await irPara(page, '/vendedor/pedidos')
      await page
        .getByText(`Pedido ${NUMERO_PEDIDO}`)
        .first()
        .waitFor({ timeout: 30000 })
        .catch(() => {})
    },
  )
  await passo(page, '30-mobile-detalhe', 'Detalhe do pedido no celular.', async () => {
    const abrir = page.getByRole('button', { name: `Abrir pedido ${NUMERO_PEDIDO}` })
    if (await abrir.count()) {
      await abrir.click()
      await page.getByText('Desmembramento por setor').first().waitFor({ timeout: 30000 })
    }
  })
  await passo(page, '31-logout', 'Sair encerra a sessão e volta para o login.', async () => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const sair = page.getByRole('button', { name: 'Sair' }).first()
    if (await sair.count()) {
      await sair.click()
      await page.waitForURL(/\/login$/, { timeout: 30000 }).catch(() => {})
    }
  })
  await passo(
    page,
    '32-final',
    '3E Operações — leitura do Top Gerente, banco próprio e fluxo por setor.',
    async () => {
      await irPara(page, '/login')
      await cartao(page, 'Fim', 'Obrigado! Ficamos à disposição para dúvidas.')
    },
  )
} finally {
  await context.close()
  const bruto = await video.path()
  const destinoWebm = join(DIR_VIDEO, `${NOME}.webm`)
  renameSync(bruto, destinoWebm)
  console.log(`Vídeo gravado: ${destinoWebm}`)

  const { spawnSync } = await import('node:child_process')
  const destinoMp4 = join(DIR_VIDEO, `${NOME}.mp4`)
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
  const acharFfmpeg = (raiz) => {
    try {
      const pilha = [raiz]
      while (pilha.length) {
        const dir = pilha.pop()
        for (const entrada of readdirSync(dir, { withFileTypes: true })) {
          const caminho = join(dir, entrada.name)
          if (entrada.isDirectory()) pilha.push(caminho)
          else if (entrada.name === 'ffmpeg.exe' || entrada.name === 'ffmpeg-win64.exe') return caminho
        }
      }
    } catch {
      // ignora raiz inexistente
    }
    return null
  }
  for (const raiz of [
    join(local, 'Microsoft', 'WinGet', 'Packages'),
    join(local, 'ms-playwright'),
  ]) {
    const encontrado = acharFfmpeg(raiz)
    if (encontrado) candidatos.push(encontrado)
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
