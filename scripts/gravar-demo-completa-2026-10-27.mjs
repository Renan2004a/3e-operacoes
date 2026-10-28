// Grava a demonstração completa do 3E Operações com legendas em tela.
// Requer o app em http://localhost:3000.
// Saída: docs/video/demo-completa-2026-10-27.webm (+ .mp4 via ffmpeg).

import { chromium } from '@playwright/test'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const DIR = join(process.cwd(), 'docs', 'video', 'tmp-demo')
mkdirSync(DIR, { recursive: true })

const narracao = []
const inicio = Date.now()
const navegador = await chromium.launch({ slowMo: 80 })
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'pt-BR',
  recordVideo: { dir: DIR, size: { width: 1280, height: 800 } },
})
const pagina = await contexto.newPage()

async function overlay(titulo, texto) {
  narracao.push({ segundo: Math.round((Date.now() - inicio) / 1000), titulo, texto })
  await pagina.evaluate(
    ({ titulo, texto }) => {
      let estilo = document.getElementById('demo-overlay-style')
      if (!estilo) {
        estilo = document.createElement('style')
        estilo.id = 'demo-overlay-style'
        estilo.textContent = `
          #demo-overlay { position: fixed; left: 24px; right: 24px; bottom: 24px; z-index: 2147483647;
            background: rgba(15,23,42,.95); color: #fff; border: 2px solid #93c5fd; border-radius: 14px;
            padding: 14px 20px; font-family: "Segoe UI", Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,.35); pointer-events: none; }
          #demo-overlay .kicker { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #93c5fd; font-weight: 700; }
          #demo-overlay .titulo { font-size: 18px; font-weight: 700; margin-top: 2px; }
          #demo-overlay .texto { font-size: 15px; line-height: 1.4; margin-top: 4px; color: #e5e7eb; }
          #demo-topo { position: fixed; left: 18px; top: 14px; z-index: 2147483647; background: rgba(15,23,42,.88);
            color: #bfdbfe; border: 1px solid #3b82f6; border-radius: 999px; padding: 5px 12px;
            font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; font-weight: 700; pointer-events: none; }
        `
        document.head.appendChild(estilo)
      }
      let el = document.getElementById('demo-overlay')
      if (!el) {
        el = document.createElement('div')
        el.id = 'demo-overlay'
        document.body.appendChild(el)
      }
      el.innerHTML = `<div class="kicker">3E Operações · demonstração</div><div class="titulo"></div><div class="texto"></div>`
      el.querySelector('.titulo').textContent = titulo
      el.querySelector('.texto').textContent = texto
      if (!document.getElementById('demo-topo')) {
        const topo = document.createElement('div')
        topo.id = 'demo-topo'
        topo.textContent = 'Fluxo completo · 27/10/2026'
        document.body.appendChild(topo)
      }
    },
    { titulo, texto },
  )
}

async function narrar(titulo, texto, ms = 6000) {
  await overlay(titulo, texto)
  await pagina.waitForTimeout(ms)
}

async function tentar(nome, fn) {
  try {
    await fn()
  } catch (erro) {
    console.log(`[aviso] ${nome}: ${String(erro).slice(0, 180)}`)
    await narrar(nome, 'Este passo será retomado na próxima tela; seguindo o fluxo.', 3000)
  }
}

function dataMaisDias(diaCivil, dias) {
  const d = new Date(`${diaCivil}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function login(email, senha, perfil) {
  await contexto.clearCookies()
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Entrar' }).waitFor({ timeout: 30000 })
  await narrar(
    'Login e perfis',
    `Entrada única. Vou entrar como ${perfil}; o sistema identifica o perfil e abre a tela inicial correta.`,
    6000,
  )
  await pagina.waitForTimeout(1200)
  await pagina.getByLabel('E-mail').fill(email)
  await pagina.getByLabel('Senha').fill(senha)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
  await pagina.waitForTimeout(1200)
}

async function abrirPrimeiroPedido() {
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().waitFor({ timeout: 30000 })
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().click()
  await pagina.waitForURL(/\/pedidos\/.+/, { timeout: 30000 })
  // O detalhe busca saldo e especificações no RDS; espera os itens reais.
  await pagina.getByRole('button', { name: /(Recolher|Expandir) item/ }).first().waitFor({ timeout: 30000 })
  await pagina.waitForTimeout(1000)
}

async function abrirAtividade() {
  await pagina.getByRole('link', { name: /Abrir atividade/ }).first().waitFor({ timeout: 30000 })
  await pagina.getByRole('link', { name: /Abrir atividade/ }).first().click()
  await pagina.waitForURL(/\/operador\/atividades\/.+/, { timeout: 30000 })
  await pagina.waitForTimeout(1500)
}

try {
  // ============================================================ VENDEDOR
  await login('vendedor@3e.local', 'vendedor123', 'Vendedor')
  await pagina.getByRole('heading', { name: 'Vendas' }).waitFor({ timeout: 30000 })
  await narrar(
    'Vendedor · Vendas',
    'Tela de Vendas: importação por número, instruções e a lista de pedidos com filtros. O Vendedor consulta todos os pedidos.',
    7000,
  )

  await tentar('Vendedor · filtros', async () => {
    await pagina.getByLabel('Setor').selectOption('TELHAS')
    await pagina.getByRole('button', { name: 'Filtrar' }).click()
    await pagina.waitForTimeout(2200)
    await narrar(
      'Vendedor · filtros',
      'Filtrei por setor Telhas. A lista, o total e a URL acompanham o filtro; o botão Limpar filtros aparece.',
      6000,
    )
    await pagina.getByRole('button', { name: 'Limpar filtros' }).click()
    await pagina.waitForTimeout(1800)
  })

  await narrar(
    'Vendedor · lista',
    'Cada linha mostra pedido, cliente, previsão de entrega e status. A previsão é o maior prazo entre os itens do pedido.',
    6000,
  )
  await pagina.getByRole('columnheader', { name: 'Previsão' }).scrollIntoViewIfNeeded()
  await pagina.waitForTimeout(1000)

  await abrirPrimeiroPedido()
  await narrar(
    'Vendedor · detalhe',
    'Detalhe do pedido: identificação, itens, pendências de desmembramento e pendências de produção. O botão Voltar preserva filtros e página.',
    7000,
  )

  await tentar('Vendedor · resumo', async () => {
    await pagina.getByText('Resumo do pedido').scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(800)
    await narrar(
      'Vendedor · resumo',
      'Resumo por unidade e por setor. Unidades diferentes nunca são somadas; o progresso mostra percentual com vírgula quando há fração.',
      6000,
    )
  })

  await tentar('Vendedor · itens recolhíveis', async () => {
    const abrirTodos = pagina.getByRole('button', { name: 'Abrir todos' })
    if ((await abrirTodos.count()) > 0) {
      await abrirTodos.click()
      await pagina.waitForTimeout(700)
      await narrar(
        'Vendedor · abrir todos',
        'O primeiro item abre por padrão. “Abrir todos” expande os 8 itens; “Recolher todos” compacta a página.',
        5000,
      )
    }
    const recolherTodos = pagina.getByRole('button', { name: 'Recolher todos' })
    if ((await recolherTodos.count()) > 0) {
      await recolherTodos.click()
      await pagina.waitForTimeout(700)
      await narrar(
        'Vendedor · recolher todos',
        'Com os itens recolhidos, o percentual de cada um continua visível no cabeçalho; a página fica curta para consulta rápida.',
        5000,
      )
    }
    const abrirNovamente = pagina.getByRole('button', { name: 'Abrir todos' })
    if ((await abrirNovamente.count()) > 0) await abrirNovamente.click()
    await pagina.waitForTimeout(700)
  })

  await tentar('Vendedor · prazo e histórico', async () => {
    await pagina.getByLabel('Prazo de entrega (item 1)').first().scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(800)
    await narrar(
      'Vendedor · prazo',
      'O prazo de entrega do item é editável pelo Vendedor e pelo Gerente. O prazo operacional do setor aparece apenas para leitura.',
      6000,
    )
    await pagina.getByRole('button', { name: /Histórico de prazos/ }).first().click()
    await pagina.waitForTimeout(2200)
    await narrar(
      'Vendedor · histórico de prazos',
      'O histórico mostra quem alterou o prazo, quando e o valor anterior e o novo. Se ainda não houve alteração, aparece o estado vazio.',
      6000,
    )
  })

  await tentar('Vendedor · desmembramento e remessas', async () => {
    await pagina.getByText('Desmembramento').first().scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(700)
    await narrar(
      'Vendedor · desmembramento',
      'O desmembramento associa o item a um setor. As remessas são tarefas da Expedição: o Vendedor apenas acompanha as datas, sem criar, confirmar ou remover.',
      7000,
    )
  })

  await pagina.getByRole('link', { name: /Voltar para os pedidos/ }).click()
  await pagina.waitForURL(/\/vendedor\/pedidos/, { timeout: 30000 })
  await pagina.waitForTimeout(1500)
  await narrar('Vendedor · retorno', 'Voltamos à lista; filtros e página são preservados.', 4000)

  // ============================================================ GERENTE
  await login('gerente@3e.local', 'gerente123', 'Gerente de Produção')
  await pagina.getByRole('heading', { name: 'Painel' }).waitFor({ timeout: 30000 })
  await narrar(
    'Gerente · painel',
    'Painel do Gerente: pendências, em andamento, concluídas e cumprimento de prazo. Sem concluídas com prazo, o indicador mostra “—”, não 0%.',
    7000,
  )

  await tentar('Gerente · alertas e ocorrências', async () => {
    await pagina.getByText('Alertas operacionais').scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(700)
    await narrar(
      'Gerente · alertas',
      'Alertas de atrasados, parados e não encaminhados. Cada alerta abre o pedido correspondente.',
      6000,
    )
    await pagina.getByText('Ocorrências recentes').scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(700)
    await narrar(
      'Gerente · ocorrências',
      'Ocorrências registradas pelos Operadores: total, últimos 7 dias, tipo, pedido, item, setor, responsável e motivo. É o elo entre o chão de fábrica e o Gerente.',
      8000,
    )
  })

  await tentar('Gerente · atualizar', async () => {
    await pagina.getByRole('button', { name: 'Atualizar' }).scrollIntoViewIfNeeded()
    await pagina.getByRole('button', { name: 'Atualizar' }).click()
    await pagina.getByRole('button', { name: 'Atualizar' }).waitFor({ timeout: 20000 })
    await narrar('Gerente · atualização', 'A atualização recarrega os blocos de forma independente; uma falha em um bloco não derruba os demais.', 5000)
  })

  await pagina.goto(`${BASE}/gerente/pedidos`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Pedidos', level: 1 }).waitFor({ timeout: 30000 })
  await narrar('Gerente · pedidos', 'A mesma consulta do Vendedor, com filtros, previsão e paginação; o Gerente pode abrir o detalhe e corrigir setor.', 6000)

  await abrirPrimeiroPedido()
  await narrar('Gerente · detalhe', 'No detalhe, o Gerente vê os mesmos saldos e prazos e pode corrigir o setor com justificativa quando o item já tem histórico.', 7000)

  await tentar('Gerente · histórico', async () => {
    await pagina.getByRole('button', { name: /Histórico de prazos/ }).first().click()
    await pagina.waitForTimeout(2200)
    await narrar('Gerente · histórico', 'O histórico é o mesmo para os dois perfis; a auditoria registra antes e depois.', 5000)
  })

  await tentar('Gerente · alterar e restaurar prazo', async () => {
    const campo = pagina.getByLabel('Prazo de entrega (item 1)').first()
    await campo.scrollIntoViewIfNeeded()
    const original = await campo.inputValue()
    if (original) {
      const novo = dataMaisDias(original, 7)
      await campo.fill(novo)
      await pagina.getByRole('button', { name: 'Salvar prazo de entrega (item 1)' }).click()
      await pagina.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 30000 })
      await narrar('Gerente · alteração de prazo', `Prazo alterado para ${novo}. O histórico registra a mudança com usuário, data/hora e valores.`, 6000)
      await campo.fill(original)
      await pagina.getByRole('button', { name: 'Salvar prazo de entrega (item 1)' }).click()
      await pagina.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 30000 })
      await narrar('Gerente · restauração', `Prazo restaurado para ${original}; o histórico mantém as duas alterações para auditoria.`, 4000)

      const historico = pagina.getByRole('button', { name: /Histórico de prazos/ }).first()
      if ((await historico.getAttribute('aria-expanded')) === 'true') await historico.click()
      await historico.click()
      await pagina.waitForTimeout(2000)
      await narrar('Gerente · histórico atualizado', 'Ao reabrir o histórico, as duas alterações aparecem com usuário, data/hora e valores anterior e novo.', 6000)
    } else {
      await narrar('Gerente · alteração de prazo', 'Este item está sem prazo. O Gerente pode definir uma data; o campo e o histórico ficam disponíveis.', 5000)
    }
  })

  await tentar('Gerente · remessa automática', async () => {
    await pagina.getByRole('button', { name: 'Adicionar remessa do item 1' }).scrollIntoViewIfNeeded()
    await pagina.getByRole('button', { name: 'Adicionar remessa do item 1' }).click()
    await pagina.waitForTimeout(600)
    await narrar(
      'Gerente · remessa automática',
      'A remessa recebe o próximo número automaticamente; o usuário informa apenas a data prevista. Vou programar e remover para não deixar resíduo.',
      7000,
    )
    const data = pagina.getByLabel('Data prevista (item 1)')
    await data.fill('2026-12-20')
    await pagina.getByRole('button', { name: 'Programar remessa do item 1' }).click()
    await pagina.getByText('Remessa criada com sucesso.').waitFor({ timeout: 30000 })
    await narrar('Gerente · remessa criada', 'Remessa criada sem digitar número. Agora vou removê-la para demonstrar a confirmação.', 4000)
    await pagina.getByRole('button', { name: /Remover .* remessa/ }).last().click()
    await pagina.getByRole('button', { name: 'Excluir remessa' }).click()
    await pagina.getByText('Remessa excluída.').waitFor({ timeout: 30000 })
    await narrar('Gerente · remessa removida', 'Remoção confirmada; entregas e saldos não foram alterados.', 4000)
  })

  // ============================================================ OPERADOR
  await login('operador@3e.local', 'operador123', 'Operador')
  await pagina.getByRole('heading', { name: 'Meus pedidos' }).waitFor({ timeout: 30000 })
  await narrar('Operador · meus pedidos', 'Fila do turno: somente atividades dos setores do Operador, com prioridade, item, pedido e status. Um clique abre a execução.', 7000)

  await abrirAtividade()
  await narrar('Operador · executar', 'A atividade mostra item, pedido, setor e a previsão de entrega definida pelo Gerente. O progresso e o saldo vêm das execuções.', 7000)

  await tentar('Operador · registrar execução', async () => {
    await pagina.getByLabel('Quantidade produzida').fill('1')
    await pagina.waitForTimeout(700)
    await narrar(
      'Operador · registrar execução',
      'O Operador informa a quantidade na unidade da atividade. Vou apenas preencher para demonstrar; o registro não será enviado nesta gravação.',
      6000,
    )
    await pagina.getByLabel('Quantidade produzida').fill('')
  })

  await tentar('Operador · ocorrência', async () => {
    await pagina.getByRole('link', { name: 'Registrar ocorrência' }).click()
    await pagina.waitForURL(/\/operador\/ocorrencias/, { timeout: 30000 })
    await pagina.waitForTimeout(1800)
    await narrar('Operador · ocorrências', 'Tela dedicada: registrar para uma das atividades e consultar o histórico. A atividade já vem pré-selecionada quando o Operador veio da execução.', 7000)
    await pagina.getByLabel('Tipo de ocorrência').selectOption('PERDA')
    await pagina.waitForTimeout(1200)
    await narrar('Operador · formulário', 'Tipo, motivo, quantidade e observação. Perda, refugo e indisponibilidade exigem motivo; o formulário preserva os dados se a gravação falhar.', 7000)
  })

  await pagina.goto(`${BASE}/operador/fila`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Meus pedidos' }).waitFor({ timeout: 30000 })
  await abrirAtividade()
  await pagina.getByRole('link', { name: 'Ver ordem de produção' }).click()
  await pagina.waitForURL(/\/ordem/, { timeout: 30000 })
  await pagina.waitForTimeout(1200)
  await narrar('Operador · ordem de produção', 'Documento de produção: pedido, item, setor, previsão, unidade, solicitado, executado e pendente. A impressão remove o menu e cabe em uma página.', 7000)

  // ============================================================ EXPEDIÇÃO
  await login('expedicao@3e.local', 'expedicao123', 'Expedição')
  await pagina.getByRole('heading', { name: 'Entregas' }).waitFor({ timeout: 30000 })
  await narrar('Expedição · entregas', 'Selecione o pedido para ver os itens, o disponível e a previsão de entrega. A entrega é registrada por item.', 6000)
  await tentar('Expedição · abrir pedido', async () => {
    const select = pagina.getByLabel('Pedido')
    const opcoes = await select.locator('option').count()
    if (opcoes > 1) await select.selectOption({ index: 1 })
    await pagina.waitForTimeout(2500)
    await narrar('Expedição · itens', 'Cada item mostra disponível, previsão e saldos. A entrega acima do disponível exige autorização de gerente e motivo.', 7000)
    const quantidade = pagina.getByLabel(/Quantidade do item 1/)
    await quantidade.fill('999')
    await pagina.waitForTimeout(700)
    await narrar('Expedição · exceção', 'Ao digitar acima do disponível, o sistema avisa e oferece a autorização com motivo. Não vou registrar para não alterar o estoque.', 6000)
    await quantidade.fill('')
  })

  // ============================================================ ADMIN
  await login('admin@3e.local', 'admin123', 'Responsável pelo Sistema')
  await pagina.goto(`${BASE}/admin/usuarios`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Usuários', level: 1 }).waitFor({ timeout: 30000 })
  await narrar('Admin · usuários', 'Cadastro de usuários com perfis e setores. Usuários não são excluídos: a inativação bloqueia o acesso e preserva pedidos, execuções e auditoria.', 7000)
  await tentar('Admin · confirmação de inativação', async () => {
    await pagina.getByRole('button', { name: /Inativar usuário/ }).first().click()
    await pagina.waitForTimeout(600)
    await narrar('Admin · confirmação', 'A inativação pede confirmação em linha, com Confirmar e Cancelar. Vou cancelar para não alterar o usuário.', 5000)
    await pagina.getByRole('button', { name: 'Cancelar' }).first().click()
  })

  await pagina.goto(`${BASE}/admin/setores`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Setores e mapeamentos' }).waitFor({ timeout: 30000 })
  await narrar('Admin · setores', 'A tela explica o mapeamento: a categoria vem do Top Gerente e o mapa define o setor usado na importação e no desmembramento.', 8000)
  await tentar('Admin · mapa', async () => {
    const primeiraCategoria = await pagina
      .getByRole('table', { name: 'Mapeamentos de categoria' })
      .locator('tbody tr')
      .first()
      .locator('td')
      .first()
      .innerText()
      .catch(() => 'TELHA_TERMOACUSTICA')
    await pagina.getByLabel('Categoria').first().fill(primeiraCategoria.trim())
    await pagina.getByRole('button', { name: 'Buscar mapeamento' }).click()
    await pagina.waitForTimeout(1800)
    await narrar('Admin · consulta de mapa', 'A busca mostra o setor atual da categoria; salvar de novo atualiza o mapeamento. A lista abaixo mostra todos os mapeamentos cadastrados.', 7000)
  })

  // ============================================================ TÉCNICO / IMPORTAÇÃO
  await pagina.goto(`${BASE}/tecnico/integracao`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Integração' }).waitFor({ timeout: 30000 })
  await narrar('Técnico · integração', 'Jobs de importação com status, tentativas e erros. Ao selecionar um job, aparecem os eventos (solicitado, despachado, concluído/falhou).', 7000)
  await tentar('Técnico · eventos', async () => {
    await pagina.getByRole('button', { name: /Pedido / }).first().click()
    await pagina.waitForTimeout(1500)
    await narrar('Técnico · eventos', 'Eventos do job selecionado. Esta tela é somente leitura; o retry é feito na importação.', 5000)
  })

  await pagina.goto(`${BASE}/integracao`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Importar pedido' }).waitFor({ timeout: 30000 })
  await narrar('Importação', 'Importação por número: o app consulta o Top Gerente via conector, mostra o andamento e permite consultar o mesmo job sem duplicar despacho.', 7000)

  await narrar(
    'Encerramento',
    'Fluxo completo: login por perfil, Vendas, detalhe, prazos e histórico, Painel do Gerente, execução e ocorrências do Operador, Entregas, Administração, Integração e impressão. O banco é mostrado no capítulo seguinte.',
    9000,
  )
} finally {
  const caminhoVideo = await pagina.video()?.path()
  await contexto.close()
  await navegador.close()

  if (caminhoVideo) {
    const destino = join(process.cwd(), 'docs', 'video', 'demo-completa-2026-10-27.webm')
    copyFileSync(caminhoVideo, destino)
    console.log('Vídeo salvo em:', destino)
  } else {
    console.log('Vídeo não disponível.')
  }

  writeFileSync(
    join(process.cwd(), 'docs', 'video', 'demo-completa-2026-10-27-transcricao.json'),
    JSON.stringify(narracao, null, 2),
    'utf8',
  )
}
