// Parte 3 — Operador e Expedição: fila, execução, ocorrências, impressão,
// entregas, "entregar tudo", confirmação e bloqueios.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DIR_VIDEO, gerarSrt, iniciar, sleep } from './framework.mjs'

const d = await iniciar('parte3-operador-expedicao')
const p = d.pagina

async function login(email, senha, perfil, titulo) {
  await d.ir('/login', 500)
  await d.narrar(titulo, `Entrando como ${perfil}.`, 3500)
  await d.preencher(p.getByLabel('E-mail'), email)
  await d.preencher(p.getByLabel('Senha'), senha)
  await d.clicar(p.getByRole('button', { name: 'Entrar', exact: true }), { espera: 2000 })
  await p.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
}

try {
  await d.capitulo(
    '9',
    'Operador — fila, execução e ocorrências',
    'Fila por setor, registro de produção, perdas e paradas, histórico e ordem de produção.',
  )
  await login('operador@3e.local', 'operador123', 'Operador', 'Acesso do Operador')
  await p.getByRole('heading', { name: 'Fila de produção' }).waitFor({ timeout: 30000 })
  await p.waitForTimeout(2000)

  await d.narrar(
    'Fila de produção',
    'O Operador vê apenas as atividades dos setores aos quais pertence. A fila é ordenada por prioridade e, depois, pela data de criação.',
    7000,
  )
  await d.narrar(
    'Cartões da fila',
    'Cada cartão mostra pedido, item, setor, status e prioridade quando definida. O status “Divergente” indica produção acima do solicitado.',
    6500,
  )

  // Abre a atividade divergente para explicar o alerta
  const cardDivergente = p.locator('li').filter({ hasText: 'Divergente' }).first()
  if ((await cardDivergente.count()) > 0) {
    await d.clicar(cardDivergente.getByRole('link', { name: /Abrir atividade/ }).first(), {
      espera: 1800,
      titulo: 'Atividade divergente',
      texto: 'A primeira atividade está divergente. Vamos abrir para entender o que aconteceu.',
    })
    await d.narrar(
      'Divergência',
      'O sistema mostra o excedente e explica que a atividade ficou marcada como divergente. O registro fica preservado para análise.',
      7000,
    )
  }

  // Volta e abre uma atividade normal
  await d.clicar(p.getByRole('link', { name: /Voltar para a fila|Voltar/ }).first(), { espera: 1600 }).catch(async () => {
    await d.ir('/operador/fila', 1600)
  })
  await p.getByRole('heading', { name: 'Fila de produção' }).waitFor({ timeout: 30000 })
  const cardExecucao = p
    .locator('li')
    .filter({ hasText: /Em andamento|Em execução|A iniciar|Pendente/ })
    .first()
  await d.clicar(cardExecucao.getByRole('link', { name: /Abrir atividade/ }).first(), {
    espera: 1800,
    titulo: 'Abrindo uma atividade',
    texto: 'Esta atividade está em andamento e será usada para registrar uma execução real.',
  })
  await p.getByLabel('Quantidade produzida').waitFor({ timeout: 30000 })
  await d.narrar(
    'Execução da atividade',
    'A tela mostra o progresso, os valores solicitado/executado/pendente, o setor e a previsão de entrega.',
    6500,
  )

  await d.preencher(p.getByLabel('Quantidade produzida'), '1', { espera: 500 })
  await d.clicar(p.getByRole('button', { name: 'Registrar execução' }), {
    espera: 2000,
    titulo: 'Registrando produção',
    texto: 'O Operador informa a quantidade na unidade da atividade. O registro atualiza o saldo e o status.',
  })
  await p.getByText(/registrada|Execução registrada|saldo foi atualizado/i).first().waitFor({ timeout: 20000 }).catch(() => undefined)
  await d.narrar(
    'Execução confirmada',
    'A confirmação aparece na tela e o progresso é recalculado. Cada execução guarda usuário, data/hora e quantidade.',
    5500,
  )

  // Ocorrência
  await d.clicar(p.getByRole('link', { name: 'Registrar ocorrência' }), {
    espera: 1800,
    titulo: 'Registrar ocorrência',
    texto: 'A tela de ocorrências é separada da execução e já vem com a atividade pré-selecionada.',
  })
  await p.getByLabel('Tipo de ocorrência').waitFor({ timeout: 30000 })
  await d.narrar(
    'Ocorrências do Operador',
    'Aqui ficam perdas, refugos, indisponibilidades, pausas e paradas. À direita, o histórico das ocorrências já registradas.',
    6500,
  )

  await d.selecionar(p.getByLabel('Tipo de ocorrência'), 'PERDA', { espera: 900 })
  const motivo = p.getByLabel('Motivo')
  await motivo.waitFor({ timeout: 10000 })
  const opcoesMotivo = await motivo.locator('option').allTextContents()
  await d.selecionar(motivo, { index: 1 }, { espera: 500 })
  await d.narrar(
    'Motivo obrigatório',
    `Perda exige um motivo da lista fechada. Motivos disponíveis nesta demonstração: ${opcoesMotivo.slice(1, 4).join(', ')}.`,
    6000,
  )
  await d.preencher(p.getByLabel('Quantidade'), '2', { espera: 400 })
  await d.preencher(p.getByLabel('Observação'), 'Peça trincada durante o manuseio na bancada.', { espera: 400 })
  await d.clicar(p.getByRole('button', { name: 'Registrar ocorrência' }), {
    espera: 1800,
    titulo: 'Gravando a ocorrência',
    texto: 'A quantidade é opcional, mas quando informada precisa respeitar a unidade do item.',
  })
  await p.getByText('Ocorrência registrada').waitFor({ timeout: 20000 })
  await d.narrar(
    'Ocorrência registrada',
    'O registro aparece no histórico com tipo, quantidade, motivo, responsável e data/hora. O Gerente vê a mesma ocorrência no painel.',
    7000,
  )

  // Ordem de produção e impressão
  const idAtividade = new URL(p.url()).searchParams.get('atividade')
  if (idAtividade) {
    await d.ir(`/producao/atividades/${idAtividade}/ordem`, 1800)
  } else {
    await d.narrar('Ordem de produção', 'A ordem é aberta a partir da atividade do Operador.', 3000)
  }
  await d.narrar(
    'Ordem de produção',
    'O documento mostra pedido, item, setor, previsão, unidade, quantidades e o responsável pela emissão.',
    6500,
  )
  await p.emulateMedia({ media: 'print' })
  await sleep(700)
  await d.narrar(
    'Impressão',
    'No modo de impressão, o menu e os botões são removidos e o conteúdo cabe em uma página A4.',
    5000,
  )
  await p.emulateMedia({ media: 'screen' })

  await d.capitulo(
    '10',
    'Expedição — entregas e exceções',
    'Situação do item, entregar tudo, confirmação, saldo insuficiente e bloqueio de exceção.',
  )
  await login('expedicao@3e.local', 'expedicao123', 'Expedição', 'Acesso da Expedição')
  await p.getByRole('heading', { level: 1, name: 'Entregas' }).waitFor({ timeout: 30000 })
  await p.getByRole('button', { name: /Abrir pedido/ }).first().waitFor({ timeout: 30000 })
  await d.narrar(
    'Entregas',
    'A Expedição usa a mesma lista de pedidos da Venda e da Gerência: busca por número e cliente, filtros e páginas. Selecione o pedido para abrir o detalhe.',
    6500,
  )

  await d.preencher(p.getByLabel('Pesquisar por número'), '82268', { espera: 400 })
  await d.clicar(p.getByRole('button', { name: 'Filtrar' }), {
    espera: 1600,
    titulo: 'Buscando o pedido',
    texto: 'A busca por número localiza o pedido e preserva o filtro para o retorno.',
  })
  await d.clicar(p.getByRole('button', { name: 'Abrir pedido 82268' }), {
    espera: 2200,
    titulo: 'Abrindo o pedido',
    texto: 'O detalhe tem rota própria e o botão Voltar devolve a lista com a busca preservada.',
  })
  await p.getByText(/Disponível:|Aguardando produção|Totalmente entregue/).first().waitFor({ timeout: 30000 })
  await d.narrar(
    'Itens e situação',
    'Cada item mostra descrição, código, cliente, previsão, remessas programadas e a situação real: disponível, aguardando produção ou totalmente entregue.',
    7500,
  )

  await p.getByText('Histórico de entregas').first().scrollIntoViewIfNeeded().catch(() => undefined)
  await d.narrar(
    'Histórico de entregas',
    'O histórico mostra as entregas já registradas no item, com quantidade, responsável e data/hora. É somente leitura.',
    6500,
  )
  await p.getByText('Remessas programadas').first().scrollIntoViewIfNeeded().catch(() => undefined)
  await d.narrar(
    'Remessas',
    'As remessas programadas aparecem no item, com número, data prevista e confirmação. A Expedição acompanha o que foi combinado.',
    6000,
  )

  // Entregar tudo no primeiro item com saldo
  const botaoTudo = p.getByRole('button', { name: /Entregar tudo .* do item/ }).first()
  if ((await botaoTudo.count()) > 0) {
    await d.clicar(botaoTudo, {
      espera: 700,
      titulo: 'Entregar tudo',
      texto: 'O botão preenche a quantidade com o saldo total disponível, evitando digitação.',
    })
    await p.getByRole('dialog').waitFor({ timeout: 5000 })
    await d.narrar(
      'Confirmação',
      'O diálogo mostra a quantidade, o saldo atual e quanto sobra depois da entrega. Nada é gravado antes de confirmar.',
      6000,
    )
    await d.clicar(p.getByRole('button', { name: 'Confirmar entrega' }), {
      espera: 2200,
      titulo: 'Confirmando a entrega',
      texto: 'A entrega é gravada e o saldo do item é atualizado.',
    })
    await p.getByText(/Entrega registrada|saldo foi atualizado/i).first().waitFor({ timeout: 20000 }).catch(() => undefined)
    await d.narrar('Entrega concluída', 'O item passa a “Totalmente entregue” ou reduz o saldo disponível.', 5000)
  }

  // Acima do disponível: bloqueio para a Expedição
  const quantidade = p.getByLabel(/Quantidade do item \d+/).first()
  if ((await quantidade.count()) > 0) {
    await quantidade.scrollIntoViewIfNeeded()
    await d.preencher(quantidade, '999', { espera: 600 })
    await d.narrar(
      'Acima do disponível',
      'A Expedição não pode autorizar sozinha. O sistema avisa e orienta procurar o gerente; o botão de registrar fica bloqueado.',
      6500,
    )
    await d.preencher(quantidade, '0', { espera: 400 })
    await d.clicar(p.getByRole('button', { name: /Registrar entrega do item/ }).first(), { espera: 500 })
    await d.narrar(
      'Validação de quantidade',
      'Quantidade zero ou vazia é recusada antes de qualquer gravação.',
      4500,
    )
  }

  await d.narrar(
    'Itens sem saldo',
    'Itens sem produção aparecem como “Aguardando produção”. O formulário de entrega não é oferecido enquanto não houver saldo.',
    5500,
  )

  await d.clicar(p.getByRole('link', { name: /Voltar para os pedidos/ }), {
    espera: 1600,
    titulo: 'Voltando para a lista',
    texto: 'A busca e a página são preservadas no retorno.',
  })

  await d.capitulo(
    '10',
    'Fim da parte 3',
    'A seguir: Administração, Técnico, validações e responsividade.',
    3000,
  )
} finally {
  const video = await d.finalizar('parte3-operador-expedicao')
  writeFileSync(join(DIR_VIDEO, 'parte3-operador-expedicao.srt'), gerarSrt(d.estado.narracao), 'utf8')
  console.log('Parte 3 salva em:', video)
}
