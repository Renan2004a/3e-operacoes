// Parte 5 — capítulo de banco de dados: DBeaver (captura real), estrutura,
// dados e conferência dos registros da demonstração.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DIR_VIDEO, gerarSrt, iniciar, sleep } from './framework.mjs'

const d = await iniciar('parte5-banco')
const p = d.pagina
const html = join(DIR_VIDEO, 'banco', 'capitulo-banco.html')

async function secao(id, titulo, texto, ms = 6500) {
  if (id) {
    await p.locator(`#${id}`).scrollIntoViewIfNeeded().catch(() => undefined)
    await sleep(600)
  }
  await d.narrar(titulo, texto, ms)
}

try {
  await p.goto(pathToFileURL(html).href, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1200)
  await d.reaplicar()

  await d.capitulo(
    '15',
    'Banco de dados — estrutura e persistência',
    'DBeaver, tabelas, relacionamentos, consultas reais e a conferência dos registros criados na interface.',
  )
  await secao(
    'capa',
    'Capítulo de banco',
    'Agora o banco por dentro: o MySQL do aplicativo, as 18 tabelas, os relacionamentos e os registros que a demonstração produziu. As consultas são reais e somente leitura.',
    8000,
  )

  await secao(
    'dbeaver',
    'DBeaver e as duas conexões',
    'O DBeaver tem a conexão topgerente, somente leitura, e a conexão do banco do aplicativo. Nesta sessão, a árvore e o editor do DBeaver não renderizaram texto; por isso as consultas foram executadas diretamente no MySQL e a captura real da janela é mostrada aqui.',
    10000,
  )

  await secao(
    'inventario',
    'Inventário',
    'O banco de demonstração tem 7 pedidos, 27 itens, 14 atividades e registros de execução, ocorrência, entrega, remessa e auditoria. O caminho do dado é pedido → item → atividade → execução.',
    8000,
  )

  await secao(
    'pedidos',
    'Pedidos e previsão',
    'A consulta agrega pedidos e itens. A previsão do pedido é o maior prazo entre os itens; pendentes mostram o que ainda não foi desmembrado.',
    7500,
  )

  await secao(
    'saldos',
    'Itens, execução e entrega',
    'O saldo nasce do item (solicitado), passa pelas execuções (produzido) e pelas entregas (entregue). Unidades diferentes não são somadas na interface.',
    8500,
  )

  await secao(
    'atividades',
    'Atividades e fila',
    'Cada item desmembrado gera uma atividade no setor. A fila do Operador filtra por setor, ignora concluídas e ordena por prioridade.',
    7500,
  )

  await secao(
    'execucoes',
    'Execuções',
    'Cada apontamento grava usuário, quantidade e data/hora. O status da atividade e o saldo são recalculados na mesma transação.',
    7500,
  )

  await secao(
    'ocorrencias',
    'Ocorrências',
    'Perdas, refugos, indisponibilidades, pausas e paradas ficam ligados à atividade, ao motivo e ao responsável. O painel do Gerente lê esta tabela.',
    8000,
  )

  await secao(
    'entregas',
    'Entregas e remessas',
    'A entrega baixa o disponível e registra quem entregou, a quantidade e a exceção. A remessa é apenas a previsão combinada e não altera saldo.',
    8000,
  )

  await secao(
    'auditoria',
    'Auditoria de prazos',
    'As alterações de prazo da demonstração estão aqui: 20/11 e 27/11 no item 3 do pedido 82268, com antes, depois, usuário e horário. É a fonte do histórico exibido na tela.',
    9000,
  )

  await secao(
    'usuarios',
    'Usuários, perfis e setores',
    'A autenticação lê usuarios; a autorização combina usuarios_perfis e usuarios_setores. As senhas são hash scrypt, nunca texto.',
    7500,
  )

  await secao(
    'integracao',
    'Integração e mapeamentos',
    'Os jobs registram cada tentativa de importação e os erros. O mapeamento categoria→setor é o que faz o item cair no setor certo.',
    8000,
  )

  await secao(
    'estrutura',
    'Estrutura das tabelas',
    'Cada tabela traz colunas, tipos, nulos, chave primária, chaves estrangeiras e índices, lidos do information_schema. As chaves estrangeiras mostram o relacionamento entre pedidos, itens, atividades, execuções, ocorrências e entregas.',
    10000,
  )
  await p.locator('#estrutura h3', { hasText: 'pedidos_itens' }).first().scrollIntoViewIfNeeded().catch(() => undefined)
  await sleep(700)
  await d.narrar(
    'Chaves e relações',
    'pedidos_itens aponta para pedidos; atividades aponta para itens e setores; execuções, ocorrências e entregas apontam para as atividades ou itens.',
    7500,
  )

  await secao(
    'amostras',
    'Amostras de registros',
    'As primeiras linhas de cada tabela. Os nomes de clientes foram anonimizados para a gravação; nenhum dado pessoal real é exibido.',
    7000,
  )
  await p.locator('#amostras h3', { hasText: 'logs_auditoria' }).first().scrollIntoViewIfNeeded().catch(() => undefined)
  await sleep(600)
  await d.narrar(
    'Rastro da operação',
    'A auditoria mostra o antes e o depois de cada alteração. É o elo entre a ação na tela e o registro persistido.',
    7000,
  )

  await secao(
    'mapa-telas',
    'Da tela para a tabela',
    'Este mapa liga cada área da interface às tabelas que ela lê e grava: pedidos, prazos, fila, ocorrências, entregas, administração e integração.',
    9000,
  )

  await secao(
    'fim',
    'Conclusão',
    'O banco guarda o ciclo completo e a auditoria. As consultas foram executadas no banco de demonstração e conferem com o que foi criado na interface. Encerramos a demonstração.',
    9000,
  )
} finally {
  const video = await d.finalizar('parte5-banco')
  writeFileSync(join(DIR_VIDEO, 'parte5-banco.srt'), gerarSrt(d.estado.narracao), 'utf8')
  console.log('Parte 5 salva em:', video)
}
