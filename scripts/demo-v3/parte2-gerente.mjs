// Parte 2 — perfil Gerente de Produção: painel, drill-down, pedidos, prazos,
// correção de setor, remessas, entregas e impressão.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DIR_VIDEO, gerarSrt, iniciar, sleep } from './framework.mjs'

const d = await iniciar('parte2-gerente')
const p = d.pagina

async function login(email, senha, perfil) {
  await d.ir('/login', 600)
  await d.narrar(
    'Acesso do Gerente',
    `Entrando como ${perfil}. O sistema abre o painel inicial do perfil e libera as ações de gestão.`,
    4500,
  )
  await d.preencher(p.getByLabel('E-mail'), email)
  await d.preencher(p.getByLabel('Senha'), senha)
  await d.clicar(p.getByRole('button', { name: 'Entrar', exact: true }), { espera: 2200 })
  await p.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
}

try {
  await d.capitulo(
    '5',
    'Gerente — painel e alertas',
    'Indicadores da fábrica, alertas operacionais, drill-down por status e ocorrências recentes.',
  )
  await login('gerente@3e.local', 'gerente123', 'Gerente de Produção')
  await p.getByRole('heading', { name: 'Painel' }).waitFor({ timeout: 30000 })
  await p.waitForTimeout(2500)

  await d.narrar(
    'Painel do Gerente',
    'O painel reúne a situação da fábrica: atividades pendentes, em execução, concluídas e o cumprimento de prazo.',
    6500,
  )
  await d.narrar(
    'Indicadores',
    'Cada cartão é clicável e abre a lista correspondente em nova aba. O percentual de prazo só aparece quando há atividades concluídas com prazo.',
    6000,
  )

  const linkPendentes = p.getByRole('link', { name: 'Abrir atividades pendentes em nova aba' })
  const [popup] = await Promise.all([p.waitForEvent('popup'), linkPendentes.click()])
  await popup.waitForLoadState('domcontentloaded').catch(() => undefined)
  const urlPopup = popup.url()
  await d.narrar(
    'Drill-down por status',
    'O cartão abre uma aba com a lista de atividades pendentes, já filtrada. O botão Voltar retorna ao painel.',
    6000,
  )
  await popup.close()
  const caminho = new URL(urlPopup)
  await d.ir(`${caminho.pathname}${caminho.search}`, 1200)
  await d.narrar(
    'Lista de atividades',
    'A lista mostra pedido, item, setor, prazo e status. É a mesma visão usada para cobrar a produção por etapa.',
    6000,
  )
  const linkDivergente = p.getByRole('link', { name: /Atividades divergentes|DIVERGENT/ }).first()
  if ((await linkDivergente.count()) > 0) {
    await d.clicar(linkDivergente, {
      espera: 1800,
      titulo: 'Filtrando divergentes',
      texto: 'O filtro por status permite isolar as atividades que precisam de análise.',
    })
  } else {
    await d.ir('/gerente/atividades?status=DIVERGENT&origem=painel', 1500)
  }
  await d.narrar(
    'Atividades divergentes',
    'A atividade com produção acima do solicitado aparece destacada. O gerente consegue abrir o pedido e verificar o item e o setor.',
    6500,
  )

  await d.ir('/gerente/painel', 1800)
  await p.waitForTimeout(2000)
  const alertas = p.getByText('Alertas operacionais').first()
  await alertas.scrollIntoViewIfNeeded().catch(() => undefined)
  await d.narrar(
    'Alertas operacionais',
    'Três grupos: atividades atrasadas, paradas há vários dias e itens ainda não encaminhados para a produção. O contador fica no título.',
    7000,
  )

  const outros = p.getByRole('button', { name: /outros/ }).first()
  if ((await outros.count()) > 0) {
    await d.clicar(outros, {
      espera: 1200,
      titulo: 'Expandindo a lista',
      texto: 'O “+N outros” abre os demais itens do grupo, sem sair do painel.',
    })
  }

  await d.narrar(
    'Ocorrências recentes',
    'O painel também consolida as ocorrências registradas pelos Operadores: tipo, pedido, item, setor, motivo, data e o responsável com o perfil.',
    7500,
  )
  await d.clicar(p.getByRole('button', { name: 'Atualizar' }), {
    espera: 2200,
    titulo: 'Atualizando o painel',
    texto: 'O botão Atualizar recarrega os blocos de forma independente; uma falha em um bloco não derruba os outros.',
  })

  await d.capitulo(
    '6',
    'Gerente — pedidos, prazos, setor e remessas',
    'Consulta, detalhe do pedido, prazo comercial, correção de setor com justificativa e gestão de remessas.',
  )
  await d.ir('/gerente/pedidos', 1800)
  await p.getByRole('heading', { name: 'Pedidos', level: 1 }).waitFor({ timeout: 30000 })
  await d.narrar(
    'Pedidos do Gerente',
    'A mesma consulta do Vendedor, com filtros por número, cliente, setor, status e período. O Gerente pode abrir o detalhe e corrigir o setor.',
    6000,
  )
  await d.selecionar(p.getByLabel('Setor'), 'TELHAS', { espera: 500 })
  await d.clicar(p.getByRole('button', { name: 'Filtrar' }), {
    espera: 1600,
    titulo: 'Filtrando por setor',
    texto: 'Aplicando o filtro de Telhas para localizar os pedidos com esse setor.',
  })
  await d.clicar(p.getByRole('button', { name: 'Abrir pedido 70435' }), {
    espera: 2200,
    titulo: 'Abrindo o pedido 70435',
    texto: 'O detalhe mostra prazos, saldos, desmembramento e as ações permitidas ao Gerente.',
  })
  await p.getByRole('button', { name: /(Recolher|Expandir) item/ }).first().waitFor({ timeout: 30000 })
  const urlDetalhe = p.url()

  await d.narrar(
    'Detalhe do pedido',
    'O Gerente enxerga a mesma estrutura do pedido e pode agir sobre prazo, setor e remessas.',
    6000,
  )

  // Prazo vencido (demonstra o selo de atraso comercial)
  const prazo = p.getByLabel('Prazo de entrega (item 1)').first()
  const cartaoPrazo = prazo.locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]')
  await prazo.scrollIntoViewIfNeeded()
  await d.preencher(prazo, '2026-10-20', { espera: 500 })
  await d.clicar(cartaoPrazo.getByRole('button', { name: 'Salvar prazo de entrega (item 1)' }).first(), {
    espera: 1600,
    titulo: 'Definindo um prazo vencido',
    texto: 'Para demonstrar o alerta comercial, o prazo do item será definido no passado.',
  })
  await p.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 20000 })
  await p.goto(urlDetalhe, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1800)
  await d.reaplicar()
  await p.getByRole('button', { name: /(Recolher|Expandir) item/ }).first().waitFor({ timeout: 30000 })
  await d.narrar(
    'Atraso comercial',
    'O servidor calcula o status do prazo pela quantidade entregue. O selo “Entrega atrasada” aparece ao lado da data.',
    6000,
  )

  await d.capitulo(
    '7',
    'Gerente — correção de setor e remessas',
    'Correção com justificativa, numeração automática de remessa, confirmação e remoção.',
  )

  // Correção de setor em item sem execução
  const cardCorrecao = p
    .locator('div.rounded-card')
    .filter({ hasText: 'Metalom 30x20x1,20' })
    .first()
  await cardCorrecao.scrollIntoViewIfNeeded()
  const expandirCorrecao = cardCorrecao.getByRole('button', { name: /Expandir item/ }).first()
  if ((await expandirCorrecao.count()) > 0) await d.clicar(expandirCorrecao, { espera: 600 })
  const abrirCorrecao = cardCorrecao.getByRole('button', { name: /Corrigir setor do item/ }).first()
  await d.clicar(abrirCorrecao, {
    espera: 900,
    titulo: 'Corrigindo o setor',
    texto: 'O item estava em Revenda. A correção exige justificativa quando o item já tem histórico.',
  })
  const selectNovo = cardCorrecao.getByLabel(/Novo setor do item/).first()
  await selectNovo.scrollIntoViewIfNeeded()
  const opcoes = await selectNovo.locator('option').allTextContents()
  const alvo = opcoes.find((opcao) => opcao.includes('Corte e Dobra')) ?? opcoes[1] ?? opcoes[0]
  await d.selecionar(selectNovo, { label: alvo }, { espera: 500 })
  const motivo = cardCorrecao.getByLabel(/Motivo da correção/).first()
  await d.preencher(motivo, 'Cliente confirmou que a peça é dobrada; setor corrigido para Corte e Dobra.', {
    espera: 500,
  })
  await d.clicar(cardCorrecao.getByRole('button', { name: /Confirmar correção de setor/ }).first(), {
    espera: 2200,
    titulo: 'Confirmando a correção',
    texto: 'O motivo é gravado na auditoria, junto com o setor anterior e o novo.',
  })
  await p.getByText(/Setor corrigido com sucesso|corrigido com sucesso/i).first().waitFor({ timeout: 20000 }).catch(() => undefined)
  await d.narrar(
    'Auditoria da correção',
    'A alteração preserva o histórico: quem corrigiu, quando, o motivo e os setores anterior e novo.',
    5500,
  )

  // Remessas: criar, confirmar e remover
  const cardRemessa = p
    .locator('div.rounded-card')
    .filter({ hasText: 'Telha termoac' })
    .first()
  await cardRemessa.scrollIntoViewIfNeeded()
  const expandirRemessa = cardRemessa.getByRole('button', { name: /Expandir item/ }).first()
  if ((await expandirRemessa.count()) > 0) await d.clicar(expandirRemessa, { espera: 600 })
  await d.clicar(cardRemessa.getByRole('button', { name: /Adicionar remessa do item/ }).first(), {
    espera: 700,
    titulo: 'Programando uma remessa',
    texto: 'O número da remessa é automático; o usuário informa apenas a data prevista.',
  })
  const dataPrevista = cardRemessa.getByLabel(/Data prevista/).first()
  await d.preencher(dataPrevista, '2026-11-18', { espera: 400 })
  await d.clicar(cardRemessa.getByRole('button', { name: /Programar remessa do item/ }).first(), {
    espera: 1800,
    titulo: 'Gravando a remessa',
    texto: 'A remessa é criada com o próximo número disponível para o item.',
  })
  await p.getByText('Remessa criada com sucesso.').waitFor({ timeout: 20000 })
  await d.narrar('Remessa criada', 'A lista mostra a data prevista e o botão Confirmar. A remessa ainda não é uma entrega.', 4500)

  const confirmarRemessa = cardRemessa.getByRole('button', { name: /Confirmar .*remessa do item/ }).last()
  await d.clicar(confirmarRemessa, {
    espera: 1600,
    titulo: 'Confirmando a remessa',
    texto: 'Confirmar registra a data em que a remessa foi combinada/confirmada. Entregas e saldos não mudam.',
  })
  await d.narrar('Remessa confirmada', 'A tela mostra “Confirmada em” e mantém a data prevista.', 4500)

  const remover = cardRemessa.getByRole('button', { name: /Remover .*remessa do item/ }).last()
  await d.clicar(remover, {
    espera: 600,
    titulo: 'Removendo a remessa',
    texto: 'A remoção pede confirmação e avisa que entregas e saldos não serão alterados.',
  })
  const excluir = p.getByRole('button', { name: 'Excluir remessa' })
  if ((await excluir.count()) > 0) {
    await d.clicar(excluir, { espera: 1400, titulo: 'Confirmando a exclusão', texto: 'A remessa de teste é removida.' })
    await p.getByText('Remessa excluída.').waitFor({ timeout: 20000 }).catch(() => undefined)
  }
  await d.narrar('Remoção concluída', 'O item volta ao estado anterior, sem resíduo para a demonstração.', 4000)

  await d.capitulo(
    '8',
    'Gerente — entregas e exceções',
    'Situação do item, entregar tudo, confirmação, bloqueio acima do disponível e autorização com motivo.',
  )
  await d.ir('/expedicao/entregas', 1800)
  await p.getByRole('heading', { level: 1, name: 'Entregas' }).waitFor({ timeout: 30000 })
  await d.narrar(
    'Entregas',
    'A Expedição e o Gerente registram entregas. O Gerente também pode autorizar acima do disponível, com motivo.',
    6000,
  )
  const selectPedido = p.getByLabel('Pedido')
  await selectPedido.scrollIntoViewIfNeeded()
  const opcoesPedido = await selectPedido.locator('option').allTextContents()
  const indice82268 = opcoesPedido.findIndex((texto) => texto.includes('82268'))
  await d.selecionar(selectPedido, { index: indice82268 > 0 ? indice82268 : 1 }, { espera: 2500 })
  await p.getByText(/Disponível:|Totalmente entregue|Aguardando produção/).first().waitFor({ timeout: 30000 })
  await d.narrar(
    'Itens do pedido',
    'Cada cartão mostra descrição, código, cliente, disponível, previsão e a situação real do item.',
    6500,
  )

  const botaoEntregarTudo = p.getByRole('button', { name: /Entregar tudo .* do item/ }).first()
  if ((await botaoEntregarTudo.count()) > 0) {
    await d.clicar(botaoEntregarTudo, {
      espera: 700,
      titulo: 'Entregar tudo',
      texto: 'O botão preenche a quantidade com todo o saldo disponível do item.',
    })
    await p.getByRole('dialog').waitFor({ timeout: 5000 })
    await d.narrar(
      'Confirmação da entrega',
      'Antes de gravar, o sistema mostra a quantidade, o disponível e quanto sobra depois da entrega.',
      5500,
    )
    await d.clicar(p.getByRole('button', { name: 'Confirmar entrega' }), {
      espera: 2200,
      titulo: 'Confirmando',
      texto: 'A entrega é registrada e o saldo é atualizado na hora.',
    })
    await p.getByText(/Entrega registrada|saldo foi atualizado/i).first().waitFor({ timeout: 20000 }).catch(() => undefined)
    await d.narrar('Entrega registrada', 'O item passa a mostrar o novo saldo e a situação atualizada.', 4500)
  }

  // Exceção acima do disponível (sem confirmar)
  const campoQuantidade = p.getByLabel(/Quantidade do item 1/).first()
  if ((await campoQuantidade.count()) > 0) {
    await d.preencher(campoQuantidade, '999', { espera: 700 })
    await d.narrar(
      'Acima do disponível',
      'Ao digitar uma quantidade maior que o saldo, o sistema avisa que é necessária autorização do gerente e um motivo.',
      5500,
    )
    const checkbox = p.getByLabel('Autorizar acima do disponível').first()
    if ((await checkbox.count()) > 0) {
      await d.clicar(checkbox, { espera: 400 })
      const motivoExcecao = p.getByLabel(/Motivo da exceção/).first()
      await d.preencher(motivoExcecao, 'Cliente solicitou antecipação; autorizado pelo gerente.', { espera: 400 })
      await d.narrar(
        'Autorização com motivo',
        'Somente o Gerente vê esta opção. O motivo e a quantidade acima do saldo ficam registrados na auditoria.',
        5500,
      )
      await d.clicar(p.getByRole('button', { name: /Registrar entrega do item/ }).first(), { espera: 500 })
      if ((await p.getByRole('dialog').count()) > 0) {
        await d.narrar('Cancelando a exceção', 'A exceção é apenas demonstrada; o cancelamento evita alterar o saldo nesta gravação.', 4000)
        await d.clicar(p.getByRole('button', { name: 'Cancelar' }), { espera: 700 })
      }
    }
  }

  // Impressão da ordem de produção
  const atividades = await p.evaluate(async () => {
    const r = await fetch('/api/producao/atividades')
    return r.ok ? (await r.json()).atividades : []
  })
  const atividade = atividades.find((a) => a.orderNumber === '70435') ?? atividades[0]
  if (atividade) {
    await d.ir(`/producao/atividades/${atividade.id}/ordem`, 1600)
    await d.narrar(
      'Ordem de produção',
      'Documento de produção com pedido, item, setor, previsão, unidade, solicitado, executado e pendente.',
      6000,
    )
    await p.emulateMedia({ media: 'print' })
    await sleep(800)
    await d.narrar(
      'Impressão',
      'Na impressão, o menu e os botões são removidos e o documento cabe em uma página A4.',
      5500,
    )
    await p.emulateMedia({ media: 'screen' })
  }

  await d.capitulo(
    '8',
    'Fim da parte 2',
    'A seguir: Operador, Expedição, Administração e Técnico.',
    3000,
  )
} finally {
  const video = await d.finalizar('parte2-gerente')
  writeFileSync(join(DIR_VIDEO, 'parte2-gerente.srt'), gerarSrt(d.estado.narracao), 'utf8')
  console.log('Parte 2 salva em:', video)
}
