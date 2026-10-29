// Parte 1 — apresentação, acesso e perfil Vendedor (consulta, prazos,
// desmembramento e importação).
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DIR_VIDEO, gerarSrt, iniciar, sleep } from './framework.mjs'

const d = await iniciar('parte1-vendedor')
const p = d.pagina

async function tentar(nome, fn) {
  try {
    await fn()
  } catch (erro) {
    console.log(`[aviso] ${nome}: ${String(erro).slice(0, 200)}`)
    await d.narrar(nome, 'Este passo será retomado adiante; seguindo o roteiro.', 2200)
  }
}

try {
  // ---------------------------------------------------------------- capítulo 1
  await d.capitulo(
    '1',
    'Apresentação do sistema',
    '3E Operações: pedidos, produção, expedição e banco de dados. Ambiente de demonstração com dados de teste.',
  )
  await d.ir('/login')
  await d.narrar(
    '3E Operações',
    'Sistema de gestão operacional da 3E Ferro e Aço: recebe os pedidos do Top Gerente, organiza a produção por setor, registra execuções, ocorrências e entregas, e mantém a auditoria das alterações.',
    7000,
  )
  await d.narrar(
    'Ambiente da demonstração',
    'Esta gravação usa um banco isolado de demonstração. Todos os clientes e operações são identificados como dados de teste; nenhum dado real de cliente é alterado.',
    6000,
  )
  await d.narrar(
    'Tela de acesso',
    'O acesso é único para todos os perfis. O sistema identifica o perfil do usuário e abre a tela inicial correspondente.',
    5000,
  )
  await d.narrar(
    'Perfis disponíveis',
    'Vendedor, Gerente de Produção, Operador, Expedição, Responsável pelo Sistema e Responsável Técnico. Cada perfil enxerga apenas as ações permitidas.',
    6000,
  )

  // ---------------------------------------------------------------- capítulo 2
  await d.capitulo('2', 'Acesso e autenticação', 'Validação de campos, credenciais inválidas e entrada por perfil.')
  await d.clicar(
    p.getByRole('button', { name: 'Entrar', exact: true }),
    { espera: 700, titulo: 'Validação de campos obrigatórios', texto: 'Com os campos vazios, o sistema orienta o preenchimento antes de enviar a requisição.' },
  )
  await p.getByText('Dados incompletos').waitFor({ timeout: 5000 }).catch(() => undefined)
  await d.narrar('Mensagem de validação', 'A mensagem “Dados incompletos” aparece no próprio formulário, sem chamar o servidor.', 3500)

  await d.preencher(p.getByLabel('E-mail'), 'vendedor@3e.local')
  await d.preencher(p.getByLabel('Senha'), 'senha-incorreta')
  await d.clicar(p.getByRole('button', { name: 'Entrar', exact: true }), {
    espera: 1400,
    titulo: 'Credenciais inválidas',
    texto: 'Com a senha errada, o sistema responde de forma genérica, sem revelar se o e-mail existe.',
  })
  await p.getByText('Não foi possível entrar').waitFor({ timeout: 8000 }).catch(() => undefined)
  await d.narrar('Segurança do login', 'A mesma mensagem é usada para senha incorreta, e-mail inexistente e usuário inativo. O limite de tentativas protege contra força bruta.', 4500)

  await d.preencher(p.getByLabel('Senha'), 'vendedor123')
  await d.clicar(p.getByRole('button', { name: 'Entrar', exact: true }), {
    espera: 2200,
    titulo: 'Entrando como Vendedor',
    texto: 'Login válido: o sistema cria a sessão e direciona para a tela inicial do perfil.',
  })
  await p.getByRole('heading', { name: 'Vendas' }).waitFor({ timeout: 30000 })

  // ---------------------------------------------------------------- capítulo 3
  await d.capitulo('3', 'Vendedor — consulta, prazos e desmembramento', 'Lista de pedidos, filtros, detalhe, histórico de prazos e separação por setor.')
  await d.narrar(
    'Vendas',
    'A tela de Vendas concentra a importação do Top Gerente, as instruções de uso e a consulta dos pedidos. O Vendedor acompanha todos os pedidos.',
    5500,
  )
  await d.narrar(
    'Indicadores da lista',
    'Cada linha mostra número do pedido, cliente, previsão de entrega e status. A previsão é o maior prazo entre os itens do pedido.',
    5000,
  )

  await d.selecionar(p.getByLabel('Setor'), 'TELHAS', { espera: 500 })
  await d.clicar(p.getByRole('button', { name: 'Filtrar' }), {
    espera: 1600,
    titulo: 'Filtro por setor',
    texto: 'Selecionando o setor Telhas e clicando em Filtrar. A URL, o total e a lista acompanham o filtro.',
  })
  await d.narrar('Resultado do filtro', 'Somente pedidos com itens do setor escolhido permanecem na lista. O botão “Limpar filtros” fica disponível.', 4500)
  await d.clicar(p.getByRole('button', { name: 'Limpar filtros' }), {
    espera: 1500,
    titulo: 'Limpando filtros',
    texto: 'O botão Limpar filtros devolve a lista completa.',
  })

  await d.preencher(p.getByLabel('Pesquisar por número'), '822')
  await d.clicar(p.getByRole('button', { name: 'Filtrar' }), {
    espera: 1500,
    titulo: 'Pesquisa por número',
    texto: 'A busca aceita um trecho do número comercial do pedido.',
  })
  await d.narrar('Pesquisa parcial', 'O resultado mostra os pedidos cujo número contém “822”. A pesquisa não diferencia maiúsculas de minúsculas nos campos de texto.', 4000)
  await d.clicar(p.getByRole('button', { name: 'Limpar filtros' }), { espera: 1200 })

  await d.clicar(p.getByRole('button', { name: 'Abrir pedido 82268' }), {
    espera: 2200,
    titulo: 'Abrindo o pedido 82268',
    texto: 'O botão Abrir pedido leva ao detalhe completo, preservando filtros e página para o retorno.',
  })
  await p.getByRole('button', { name: /(Recolher|Expandir) item/ }).first().waitFor({ timeout: 30000 })
  await d.narrar(
    'Detalhe do pedido',
    'Cabeçalho com número, cliente e status. Abaixo, o resumo por unidade e por setor, as pendências de desmembramento e de produção e a lista de itens.',
    6500,
  )

  await d.clicar(p.getByRole('button', { name: 'Abrir todos' }).first(), {
    espera: 900,
    titulo: 'Abrir todos os itens',
    texto: 'O primeiro item já abre por padrão. “Abrir todos” expande os 20 itens do pedido.',
  })
  await d.clicar(p.getByRole('button', { name: 'Recolher todos' }).first(), {
    espera: 900,
    titulo: 'Recolher todos os itens',
    texto: '“Recolher todos” compacta a página; o percentual de cada item continua visível no cabeçalho.',
  })
  await d.clicar(p.getByRole('button', { name: 'Abrir todos' }).first(), { espera: 800 })

  await d.narrar(
    'Resumo por unidade',
    'Unidades diferentes nunca são somadas: cada linha mostra solicitado, executado, disponível, entregue e pendente na sua unidade.',
    5500,
  )
  await d.narrar(
    'Pendências',
    'O sistema separa itens ainda não desmembrados dos itens já encaminhados à produção. Isso mostra o que falta para o pedido entrar na fábrica.',
    5000,
  )

  // Prazo e histórico (item 3, ainda sem prazo definido)
  const prazo = p.getByLabel('Prazo de entrega (item 3)').first()
  const cartaoPrazo = prazo.locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]')
  await prazo.scrollIntoViewIfNeeded()
  await d.preencher(prazo, '2026-11-20', { espera: 500 })
  await d.clicar(cartaoPrazo.getByRole('button', { name: 'Salvar prazo de entrega (item 3)' }).first(), {
    espera: 1600,
    titulo: 'Definindo o prazo de entrega',
    texto: 'O prazo do item é editável pelo Vendedor e pelo Gerente. O prazo operacional do setor aparece apenas para leitura.',
  })
  await p.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 20000 })
  await d.narrar('Confirmação', 'O sistema confirma a gravação do prazo e mantém a data no campo.', 3500)

  await d.clicar(cartaoPrazo.getByRole('button', { name: /Histórico de prazos/ }).first(), {
    espera: 2200,
    titulo: 'Histórico de prazos',
    texto: 'O histórico é alimentado pela auditoria: mostra quem alterou, quando e os valores anterior e novo.',
  })
  await d.narrar('Auditoria do prazo', 'A primeira alteração registra “Definido para 20/11/2026”, com usuário e data/hora.', 4500)

  await d.preencher(prazo, '2026-11-27', { espera: 400 })
  await d.clicar(cartaoPrazo.getByRole('button', { name: 'Salvar prazo de entrega (item 3)' }).first(), { espera: 1500 })
  await p.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 20000 })
  const historico = cartaoPrazo.getByRole('button', { name: /Histórico de prazos/ }).first()
  if ((await historico.getAttribute('aria-expanded')) === 'true') await historico.click()
  await d.clicar(historico, {
    espera: 2200,
    titulo: 'Segunda alteração',
    texto: 'Alterando o prazo para 27/11. Ao reabrir o histórico, as duas alterações aparecem em ordem, com antes e depois.',
  })
  await d.narrar('Rastreabilidade', 'O histórico preserva as duas linhas; o valor atual do item é o último “depois”.', 4500)

  // Desmembramento
  const cardPendente = p
    .locator('div.rounded-card')
    .filter({ hasText: 'Pendente de desmembramento' })
    .first()
  await cardPendente.scrollIntoViewIfNeeded()
  const expandir = cardPendente.getByRole('button', { name: /Expandir item/ }).first()
  if ((await expandir.count()) > 0) await d.clicar(expandir, { espera: 700 })
  const selectSetor = cardPendente.getByLabel(/Setor do item/).first()
  await selectSetor.scrollIntoViewIfNeeded()
  const opcoes = await selectSetor.locator('option').allTextContents()
  const alvo = opcoes.find((opcao) => opcao.includes('Corte e Dobra')) ?? opcoes[1] ?? opcoes[0]
  await d.selecionar(selectSetor, { label: alvo }, { espera: 500 })
  await d.clicar(cardPendente.getByRole('button', { name: /Classificar item/ }).first(), {
    espera: 2000,
    titulo: 'Desmembrando um item',
    texto: 'O Vendedor associa o item ao setor responsável. A escolha fica registrada e o item passa a aparecer na fila da produção.',
  })
  await p.getByText('Item desmembrado com sucesso.').waitFor({ timeout: 20000 })
  await d.narrar('Item desmembrado', 'O item agora está classificado; a tela mostra o setor definido e libera o acompanhamento das remessas.', 4000)

  // Remessas (somente leitura para o Vendedor)
  const remessas = p.getByText('Entregas programadas (remessas)').first()
  await remessas.scrollIntoViewIfNeeded().catch(() => undefined)
  await d.narrar(
    'Remessas — somente leitura',
    'As remessas são programadas pela Gerência e pela Expedição. O Vendedor acompanha as datas e as confirmações, sem criar, confirmar ou remover.',
    6000,
  )
  if ((await p.getByRole('button', { name: /Adicionar remessa/ }).count()) === 0) {
    await d.narrar('Permissão respeitada', 'Nenhum botão de gestão de remessa é oferecido ao Vendedor — a permissão é aplicada também no servidor.', 3500)
  }

  // Voltar preservando filtros
  await d.clicar(p.getByRole('link', { name: /Voltar para os pedidos/ }), {
    espera: 1800,
    titulo: 'Voltando para a lista',
    texto: 'O link de retorno preserva filtros, página e ordenação aplicados antes de abrir o pedido.',
  })
  await p.getByRole('heading', { name: 'Vendas' }).waitFor({ timeout: 20000 })

  // ---------------------------------------------------------------- capítulo 4
  await d.capitulo('4', 'Vendedor — importação do Top Gerente', 'Importação por número, andamento, sucesso, reimportação e erros.')
  await d.ir('/integracao')
  await p.getByRole('heading', { name: 'Importar pedido' }).waitFor({ timeout: 30000 })
  await d.narrar(
    'Importação de pedido',
    'A importação consulta o Top Gerente pelo conector local, cria ou atualiza o pedido no 3E e mantém o histórico operacional.',
    6000,
  )

  await d.preencher(p.getByLabel('Número do pedido'), 'abc')
  await d.clicar(p.getByRole('button', { name: 'Importar pedido', exact: true }), {
    espera: 1200,
    titulo: 'Validação do número',
    texto: 'O campo aceita apenas dígitos. Números inválidos são recusados antes de consultar o legado.',
  })
  await d.narrar('Erro de validação', 'A mensagem orienta a corrigir o número; nenhum job é criado.', 3500)

  async function importar(numero, { primeira = false } = {}) {
    await d.preencher(p.getByLabel('Número do pedido'), numero)
    await d.clicar(p.getByRole('button', { name: 'Importar pedido', exact: true }), {
      espera: 1800,
      titulo: primeira ? `Importando o pedido ${numero}` : 'Reimportação',
      texto: primeira
        ? 'O sistema cria um job idempotente e acompanha o processamento no conector.'
        : 'Repetir o mesmo número não duplica o pedido: o sistema atualiza os dados comerciais e preserva o histórico operacional.',
    })
    const sucesso = p.getByText(/Importação concluída|Pedido atualizado/).first()
    const falha = p.getByText(/Não foi possível|não encontrado|Indisponível|Falha|demorou demais/i).first()
    const resultado = await Promise.race([
      sucesso.waitFor({ timeout: 90000 }).then(() => 'ok'),
      falha.waitFor({ timeout: 90000 }).then(() => 'falha'),
    ]).catch(() => 'timeout')
    return resultado
  }

  const r1 = await importar('82262', { primeira: true })
  if (r1 === 'ok') {
    await d.narrar(
      'Resultado da importação',
      'O pedido foi localizado no Top Gerente, gravado no 3E e já aparece na lista. O job registra cada etapa: solicitado, despachado e concluído.',
      6500,
    )
  } else {
    await d.narrar(
      'Falha real na importação',
      'A importação apresentou falha. O sistema mostra a causa e orienta o próximo passo; o job fica registrado para diagnóstico e nova tentativa.',
      6500,
    )
    await importar('82269', { primeira: true })
    await d.narrar('Nova tentativa', 'Com outro pedido válido, a importação conclui e o fluxo segue normalmente.', 4500)
  }

  const r2 = await importar('82262')
  if (r2 === 'ok') {
    await d.narrar(
      'Idempotência',
      'A chave por número de pedido garante uma única linha de pedido. A reimportação atualiza os dados comerciais e preserva o histórico operacional.',
      5500,
    )
  } else {
    await d.narrar('Reimportação', 'Mesmo quando a consulta é repetida, o sistema reaproveita o job e não cria pedidos duplicados.', 4500)
  }

  await d.capitulo(
    '4',
    'Fim da parte 1',
    'A seguir: painel do Gerente, pedidos, prazos, remessas e entregas.',
    3000,
  )
} finally {
  const video = await d.finalizar('parte1-vendedor')
  writeFileSync(join(DIR_VIDEO, 'parte1-vendedor.srt'), gerarSrt(d.estado.narracao), 'utf8')
  console.log('Parte 1 salva em:', video)
}


