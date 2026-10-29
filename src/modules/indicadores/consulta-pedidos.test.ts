import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { PedidoNaoEncontradoError, type ItemDoPedido } from '../expedicao/saldo-pedido'
import {
  detalharPedido,
  listarPedidos,
  statusDoPedido,
  type AtividadeDoPedido,
  type ConsultaPedidosCriterios,
  type ConsultaPedidosRepository,
  type EspecificacaoItem,
  type ItemDoPedidoConsultado,
  type PedidoConsultado,
  type ResultadoConsultaPedidos,
  type StatusClassificacaoItem,
} from './consulta-pedidos'

interface PedidoSeed {
  id: string
  numero: string
  cliente: string | null
  customerName?: string | null
  sellerLegacyCode?: string | null
  criadoEm: Date
  /** Itens usados na consulta/lista; `itens` abaixo é o saldo usado no detalhe. */
  itensConsulta?: ItemDoPedidoConsultado[]
  itens?: ItemDoPedido[]
  especificacoes?: EspecificacaoItem[]
}

function pedido(overrides: Partial<PedidoSeed> & Pick<PedidoSeed, 'id' | 'numero'>): PedidoSeed {
  return {
    id: overrides.id,
    numero: overrides.numero,
    cliente: overrides.cliente ?? null,
    customerName: overrides.customerName,
    sellerLegacyCode: overrides.sellerLegacyCode,
    criadoEm: overrides.criadoEm ?? new Date('2026-10-07T12:00:00.000Z'),
    itensConsulta: overrides.itensConsulta ?? [],
    itens: overrides.itens,
    especificacoes: overrides.especificacoes,
  }
}

function createRepo(pedidos: PedidoSeed[]): ConsultaPedidosRepository {
  return {
    async consultarPedidos(): Promise<ResultadoConsultaPedidos> {
      return {
        pedidos: pedidos.map((p) => ({
          id: p.id,
          numero: p.numero,
          cliente: p.cliente,
          criadoEm: p.criadoEm,
          itens: (p.itensConsulta ?? []).map((item) => ({
            ...item,
            atividades: item.atividades.map((atividade) => ({ ...atividade })),
          })),
        })),
        total: pedidos.length,
      }
    },
    async buscarCabecalhoPedido(orderId) {
      const encontrado = pedidos.find((p) => p.id === orderId)
      return encontrado
        ? {
            id: encontrado.id,
            numero: encontrado.numero,
            cliente: encontrado.cliente,
            customerName: encontrado.customerName ?? encontrado.cliente,
            sellerLegacyCode: encontrado.sellerLegacyCode ?? null,
          }
        : null
    },
    async buscarItensDoPedido(orderId) {
      const encontrado = pedidos.find((p) => p.id === orderId)
      if (!encontrado || encontrado.itens === undefined) return null
      return encontrado.itens.map((item) => ({ ...item }))
    },
    async buscarEspecificacoesDosItens(orderId) {
      const encontrado = pedidos.find((p) => p.id === orderId)
      return encontrado?.especificacoes?.map((especificacao) => ({ ...especificacao })) ?? []
    },
    async listarRegrasProdutoSetor() {
      return []
    },
  }
}

function item(overrides: Partial<ItemDoPedido> & Pick<ItemDoPedido, 'id'>): ItemDoPedido {
  return {
    id: overrides.id,
    solicitado: overrides.solicitado ?? new Prisma.Decimal(10),
    executado: overrides.executado ?? new Prisma.Decimal(0),
    entregue: overrides.entregue ?? new Prisma.Decimal(0),
  }
}

describe('listarPedidos', () => {
  function itemConsultado(
    status: AtividadeDoPedido['status'] = 'PENDING',
    classificationStatus: StatusClassificacaoItem = 'CLASSIFIED',
  ): ItemDoPedidoConsultado {
    return {
      classificationStatus,
      atividades: [{ sectorCode: 'TELHAS', status }],
    }
  }

  function consultado(
    id: string,
    numero = id,
    cliente: string | null = null,
    status: AtividadeDoPedido['status'] = 'PENDING',
  ): PedidoConsultado {
    return {
      id,
      numero,
      cliente,
      criadoEm: new Date('2026-10-07T12:00:00.000Z'),
      itens: [itemConsultado(status)],
    }
  }

  function pagina(quantidade: number, inicio = 0): PedidoConsultado[] {
    return Array.from({ length: quantidade }, (_, indice) =>
      consultado(`ped_${String(inicio + indice).padStart(2, '0')}`),
    )
  }

  function createConsultaRepo(resultado: ResultadoConsultaPedidos) {
    const chamadas: ConsultaPedidosCriterios[] = []
    const repo: ConsultaPedidosRepository = {
      ...createRepo([]),
      async consultarPedidos(criterios) {
        chamadas.push(criterios)
        return resultado
      },
    }
    return { repo, chamadas }
  }

  it('devolve a primeira página e os metadados de paginação (A1)', async () => {
    const { repo, chamadas } = createConsultaRepo({ pedidos: pagina(20), total: 25 })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.pedidos).toHaveLength(20)
    expect(resultado.paginacao).toEqual({
      limite: 20,
      offset: 0,
      pagina: 1,
      total: 25,
      totalPaginas: 2,
    })
    expect(chamadas[0]).toMatchObject({ limite: 20, offset: 0 })
  })

  it('devolve página intermediária com a página calculada pelo offset (A1)', async () => {
    const { repo } = createConsultaRepo({ pedidos: pagina(10, 20), total: 45 })

    const resultado = await listarPedidos({ limite: 10, offset: 20 }, repo)

    expect(resultado.pedidos.map((linha) => linha.id)).toEqual(
      pagina(10, 20).map((linha) => linha.id),
    )
    expect(resultado.paginacao).toEqual({
      limite: 10,
      offset: 20,
      pagina: 3,
      total: 45,
      totalPaginas: 5,
    })
  })

  it('devolve a última página parcial com o total correto (A1)', async () => {
    const { repo } = createConsultaRepo({ pedidos: pagina(5, 20), total: 25 })

    const resultado = await listarPedidos({ offset: 20 }, repo)

    expect(resultado.pedidos).toHaveLength(5)
    expect(resultado.paginacao.pagina).toBe(2)
    expect(resultado.paginacao.totalPaginas).toBe(2)
  })

  it('devolve lista vazia e total correto para página inexistente (A1, D2)', async () => {
    const { repo } = createConsultaRepo({ pedidos: [], total: 25 })

    const resultado = await listarPedidos({ offset: 60 }, repo)

    expect(resultado.pedidos).toEqual([])
    expect(resultado.paginacao).toEqual({
      limite: 20,
      offset: 60,
      pagina: 4,
      total: 25,
      totalPaginas: 2,
    })
  })

  it('com menos de 20 resultados, há uma única página (A1)', async () => {
    const { repo } = createConsultaRepo({ pedidos: pagina(3), total: 3 })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.paginacao.totalPaginas).toBe(1)
  })

  it('com exatamente 20 resultados, há uma única página (A1)', async () => {
    const { repo } = createConsultaRepo({ pedidos: pagina(20), total: 20 })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.paginacao.totalPaginas).toBe(1)
  })

  it('com mais de 20 resultados, há mais de uma página (A1)', async () => {
    const { repo } = createConsultaRepo({ pedidos: pagina(20), total: 21 })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.paginacao.totalPaginas).toBe(2)
  })

  it('com total zero, não há páginas (A1)', async () => {
    const { repo } = createConsultaRepo({ pedidos: [], total: 0 })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.paginacao).toEqual({
      limite: 20,
      offset: 0,
      pagina: 1,
      total: 0,
      totalPaginas: 0,
    })
  })

  it('limita o limite ao teto de 100 (QF-07)', async () => {
    const { repo, chamadas } = createConsultaRepo({ pedidos: [], total: 0 })

    await listarPedidos({ limite: 500 }, repo)

    expect(chamadas[0].limite).toBe(100)
  })

  it('normaliza limite não positivo e offset negativo (QF-07)', async () => {
    const { repo, chamadas } = createConsultaRepo({ pedidos: [], total: 0 })

    await listarPedidos({ limite: 0, offset: -5 }, repo)

    expect(chamadas[0]).toMatchObject({ limite: 1, offset: 0 })
  })

  it('remove espaços das bordas e omite filtros vazios antes de consultar (AD-019)', async () => {
    const { repo, chamadas } = createConsultaRepo({ pedidos: [], total: 0 })

    await listarPedidos({ numero: '  70435  ', cliente: '   ' }, repo)

    expect(chamadas[0]).toMatchObject({ numero: '70435', cliente: undefined })
  })

  it('repassa todos os filtros combinados com a paginação (IND-02, AD-014, AD-018, AD-019)', async () => {
    const { repo, chamadas } = createConsultaRepo({ pedidos: [], total: 0 })
    const de = new Date('2026-10-22T03:00:00.000Z')
    const ate = new Date('2026-10-23T03:00:00.000Z')

    await listarPedidos(
      {
        numero: '7043',
        cliente: 'Construtora',
        setor: 'TELHAS',
        status: 'IN_PROGRESS',
        de,
        ate,
        limite: 10,
        offset: 10,
      },
      repo,
    )

    expect(chamadas[0]).toEqual({
      numero: '7043',
      cliente: 'Construtora',
      setor: 'TELHAS',
      status: 'IN_PROGRESS',
      de,
      ate,
      limite: 10,
      offset: 10,
    })
  })

  it('mantém a ordem determinística devolvida pelo banco, sem reordenar (QF-07)', async () => {
    const { repo } = createConsultaRepo({
      pedidos: [consultado('ped_c'), consultado('ped_a'), consultado('ped_b')],
      total: 3,
    })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.pedidos.map((linha) => linha.id)).toEqual(['ped_c', 'ped_a', 'ped_b'])
  })

  it('deriva o status de cada pedido a partir de todos os itens ativos (IND-01, AD-013)', async () => {
    const { repo } = createConsultaRepo({
      pedidos: [
        {
          ...consultado('ped_1', '1001', 'Construtora X'),
          itens: [itemConsultado('COMPLETED')],
        },
        {
          ...consultado('ped_2', '1002', 'Mercado Y'),
          itens: [itemConsultado('PENDING')],
        },
        {
          ...consultado('ped_3', '1003', 'Loja Z'),
          itens: [itemConsultado('COMPLETED'), itemConsultado('IN_PROGRESS')],
        },
        { ...consultado('ped_4', '1004', 'Sem produção'), itens: [] },
        {
          ...consultado('ped_5', '1005', 'Não desmembrado'),
          itens: [itemConsultado('PENDING', 'PENDING_CLASSIFICATION')],
        },
        {
          ...consultado('ped_6', '1006', 'Concluído com pendência'),
          itens: [itemConsultado('COMPLETED'), itemConsultado('PENDING', 'PENDING_CLASSIFICATION')],
        },
      ],
      total: 6,
    })

    const resultado = await listarPedidos({}, repo)

    expect(resultado.pedidos.map((linha) => [linha.numero, linha.cliente, linha.status])).toEqual([
      ['1001', 'Construtora X', 'COMPLETED'],
      ['1002', 'Mercado Y', 'PENDING'],
      ['1003', 'Loja Z', 'IN_PROGRESS'],
      ['1004', 'Sem produção', 'PENDING'],
      ['1005', 'Não desmembrado', 'PENDING'],
      ['1006', 'Concluído com pendência', 'IN_PROGRESS'],
    ])
  })
})

describe('statusDoPedido (AD-013)', () => {
  function itemConsultado(
    classificationStatus: StatusClassificacaoItem,
    ...status: AtividadeDoPedido['status'][]
  ): ItemDoPedidoConsultado {
    return {
      classificationStatus,
      atividades: status.map((statusAtividade) => ({
        sectorCode: 'TELHAS',
        status: statusAtividade,
      })),
    }
  }

  it('pedido sem itens permanece pendente', () => {
    expect(statusDoPedido([])).toBe('PENDING')
  })

  it('item ativo sem desmembramento não conclui a produção', () => {
    expect(statusDoPedido([itemConsultado('PENDING_CLASSIFICATION')])).toBe('PENDING')
  })

  it('item não desmembrado com atividade concluída não conclui a produção', () => {
    expect(statusDoPedido([itemConsultado('PENDING_CLASSIFICATION', 'COMPLETED')])).toBe(
      'IN_PROGRESS',
    )
  })

  it('atividade concluída com outro item ativo não desmembrado fica em andamento', () => {
    expect(
      statusDoPedido([
        itemConsultado('CLASSIFIED', 'COMPLETED'),
        itemConsultado('PENDING_CLASSIFICATION', 'COMPLETED'),
      ]),
    ).toBe('IN_PROGRESS')
  })

  it('todos os itens ativos desmembrados e concluídos resultam em produção concluída', () => {
    expect(
      statusDoPedido([
        itemConsultado('CLASSIFIED', 'COMPLETED'),
        itemConsultado('CLASSIFIED', 'COMPLETED'),
      ]),
    ).toBe('COMPLETED')
  })

  it('atividades pendentes mantêm o pedido pendente', () => {
    expect(
      statusDoPedido([
        itemConsultado('CLASSIFIED', 'PENDING'),
        itemConsultado('CLASSIFIED', 'PENDING'),
      ]),
    ).toBe('PENDING')
  })

  it('atividade em andamento, pausada ou divergente resulta em em andamento', () => {
    for (const status of ['IN_PROGRESS', 'PAUSED', 'DIVERGENT'] as const) {
      expect(statusDoPedido([itemConsultado('CLASSIFIED', status)])).toBe('IN_PROGRESS')
    }
  })

  it('item classificado sem atividade não é considerado concluído', () => {
    expect(
      statusDoPedido([itemConsultado('CLASSIFIED'), itemConsultado('CLASSIFIED', 'COMPLETED')]),
    ).toBe('IN_PROGRESS')
  })

  it('atividade de Revenda concluída conta como produção concluída no status, sem decidir atendimento (AD-012/T00.4)', () => {
    const revenda: ItemDoPedidoConsultado = {
      classificationStatus: 'CLASSIFIED',
      atividades: [{ sectorCode: 'REVENDA', status: 'COMPLETED' }],
    }
    expect(statusDoPedido([revenda])).toBe('COMPLETED')
  })
})

describe('detalharPedido', () => {
  it('retorna os cinco valores por item (IND-04)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        itens: [
          item({
            id: 'item_1',
            solicitado: new Prisma.Decimal(10),
            executado: new Prisma.Decimal(8),
            entregue: new Prisma.Decimal(3),
          }),
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.numero).toBe('1001')
    expect(detalhe.cliente).toBe('Construtora X')
    expect(detalhe.itens).toHaveLength(1)
    expect(detalhe.itens[0].itemId).toBe('item_1')
    expect(detalhe.itens[0].solicitado.toString()).toBe('10')
    expect(detalhe.itens[0].executado.toString()).toBe('8')
    expect(detalhe.itens[0].disponivel.toString()).toBe('5')
    expect(detalhe.itens[0].entregue.toString()).toBe('3')
    expect(detalhe.itens[0].pendente.toString()).toBe('2')
  })

  it('inclui descrição, código e unidade por item (IND-04)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        itens: [item({ id: 'item_1' })],
        especificacoes: [
          {
            itemId: 'item_1',
            description: 'Chapa dobrada',
            productCode: 'PRD-77',
            unit: 'peca',
            classificationStatus: 'PENDING_CLASSIFICATION',
          },
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.itens[0].description).toBe('Chapa dobrada')
    expect(detalhe.itens[0].productCode).toBe('PRD-77')
    expect(detalhe.itens[0].unit).toBe('peca')
    expect(detalhe.itens[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('inclui o prazo de entrega do item e o prazo operacional da atividade (AD-009)', async () => {
    const prazoEntrega = new Date('2026-02-02T02:59:59.999Z')
    const prazoSetor = new Date('2026-03-11T02:59:59.999Z')
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        itens: [item({ id: 'item_1' }), item({ id: 'item_2' })],
        especificacoes: [
          {
            itemId: 'item_1',
            description: 'Chapa',
            productCode: 'PRD-1',
            unit: 'peca',
            classificationStatus: 'CLASSIFIED',
            deadlineAt: prazoEntrega,
            activityDeadlineAt: prazoSetor,
          },
          {
            itemId: 'item_2',
            description: 'Telha',
            productCode: 'PRD-2',
            unit: 'm',
            classificationStatus: 'PENDING_CLASSIFICATION',
            deadlineAt: null,
            activityDeadlineAt: null,
          },
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.itens[0].deadlineAt).toEqual(prazoEntrega)
    expect(detalhe.itens[0].activityDeadlineAt).toEqual(prazoSetor)
    expect(detalhe.itens[1].deadlineAt).toBeNull()
    expect(detalhe.itens[1].activityDeadlineAt).toBeNull()
  })

  it('devolve prazo nulo quando o item não tem especificação (AD-009)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        itens: [item({ id: 'item_1' })],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.itens[0].deadlineAt).toBeNull()
    expect(detalhe.itens[0].activityDeadlineAt).toBeNull()
  })

  it('inclui customerName e sellerLegacyCode no pedido (IND-04)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        sellerLegacyCode: 'V-77',
        itens: [item({ id: 'item_1' })],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.customerName).toBe('Construtora X')
    expect(detalhe.sellerLegacyCode).toBe('V-77')
  })

  it('usa null/vazio quando o item não tem especificação (IND-04)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        itens: [item({ id: 'item_1' })],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.itens[0].description).toBeNull()
    expect(detalhe.itens[0].productCode).toBeNull()
    expect(detalhe.itens[0].unit).toBe('')
  })

  it('informa o bloqueio da correção de setor quando há registro operacional (AD-007)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        itens: [item({ id: 'item_1' }), item({ id: 'item_2' }), item({ id: 'item_3' })],
        especificacoes: [
          {
            itemId: 'item_1',
            description: 'Chapa',
            productCode: 'PRD-1',
            unit: 'peca',
            classificationStatus: 'CLASSIFIED',
            sectorId: 'setor_corte',
            sectorCode: 'CORTE',
            sectorName: 'Corte e Dobra',
            activityStatus: 'IN_PROGRESS',
            registrosAtividade: {
              status: 'IN_PROGRESS',
              execucoes: 1,
              ocorrencias: 0,
              entregas: 0,
            },
          },
          {
            itemId: 'item_2',
            description: 'Telha',
            productCode: 'PRD-2',
            unit: 'peca',
            classificationStatus: 'CLASSIFIED',
            sectorId: 'setor_telhas',
            sectorCode: 'TELHAS',
            sectorName: 'Telhas',
            activityStatus: 'PENDING',
            registrosAtividade: { status: 'PENDING', execucoes: 0, ocorrencias: 0, entregas: 0 },
          },
          {
            itemId: 'item_3',
            description: 'Peça',
            productCode: 'PRD-3',
            unit: 'peca',
            classificationStatus: 'PENDING_CLASSIFICATION',
          },
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.itens[0].bloqueioCorrecaoSetor).toBe('O item já possui execução registrada.')
    expect(detalhe.itens[0].sectorId).toBe('setor_corte')
    expect(detalhe.itens[1].bloqueioCorrecaoSetor).toBeNull()
    expect(detalhe.itens[1].sectorId).toBe('setor_telhas')
    expect(detalhe.itens[2].bloqueioCorrecaoSetor).toBeNull()
  })

  it('rejeita pedido inexistente (IND-10)', async () => {
    const repo = createRepo([])

    await expect(detalharPedido('ped_x', repo)).rejects.toBeInstanceOf(PedidoNaoEncontradoError)
  })
})

function especificacao(
  itemId: string,
  unit: string,
  sectorName: string | null = null,
  overrides: Partial<EspecificacaoItem> = {},
): EspecificacaoItem {
  return {
    itemId,
    description: null,
    productCode: null,
    unit,
    classificationStatus: 'PENDING_CLASSIFICATION',
    sectorName,
    ...overrides,
  }
}

function dec(valor: number | string): Prisma.Decimal {
  return new Prisma.Decimal(valor)
}

describe('detalharPedido — totais por unidade de medida (RN01–RN05)', () => {
  it('soma os itens quando todos têm a mesma unidade (RN02)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(20), executado: dec(5), entregue: dec(2) }),
          item({ id: 'item_2', solicitado: dec(10), executado: dec(10), entregue: dec(4) }),
        ],
        especificacoes: [especificacao('item_1', 'UN'), especificacao('item_2', 'UN')],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.totaisPorUnidade).toHaveLength(1)
    const [total] = detalhe.totaisPorUnidade
    expect(total.unidade).toBe('UN')
    expect(total.itens).toBe(2)
    expect(total.solicitado.toString()).toBe('30')
    expect(total.executado.toString()).toBe('15')
    expect(total.disponivel.toString()).toBe('9')
    expect(total.entregue.toString()).toBe('6')
    expect(total.pendente.toString()).toBe('15')
  })

  it('separa os totais de unidades diferentes sem somá-las (RN01, RN02)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(20) }),
          item({ id: 'item_2', solicitado: dec(15) }),
          item({ id: 'item_3', solicitado: dec(10) }),
        ],
        especificacoes: [
          especificacao('item_1', 'peca'),
          especificacao('item_2', 'metro'),
          especificacao('item_3', 'peca'),
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(
      detalhe.totaisPorUnidade.map((total) => [
        total.unidade,
        total.itens,
        total.solicitado.toString(),
      ]),
    ).toEqual([
      ['metro', 1, '15'],
      ['peca', 2, '30'],
    ])
  })

  it('agrupa itens de setores diferentes pela mesma unidade (multi-setor)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(4), executado: dec(4) }),
          item({ id: 'item_2', solicitado: dec(6), executado: dec(1) }),
        ],
        especificacoes: [
          especificacao('item_1', 'M', 'Telhas'),
          especificacao('item_2', 'M', 'Corte e Dobra'),
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.totaisPorUnidade).toHaveLength(1)
    expect(detalhe.totaisPorUnidade[0].solicitado.toString()).toBe('10')
    expect(detalhe.totaisPorUnidade[0].executado.toString()).toBe('5')
    expect(detalhe.totaisPorUnidade[0].pendente.toString()).toBe('5')
  })

  it('preserva a precisão das quantidades decimais em metro (RN04)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec('2.5'), executado: dec('0.1') }),
          item({ id: 'item_2', solicitado: dec('0.25'), executado: dec('0.2') }),
        ],
        especificacoes: [especificacao('item_1', 'M'), especificacao('item_2', 'M')],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.totaisPorUnidade[0].solicitado.toString()).toBe('2.75')
    expect(detalhe.totaisPorUnidade[0].executado.toString()).toBe('0.3')
    expect(detalhe.totaisPorUnidade[0].pendente.toString()).toBe('2.45')
  })

  it('mantém zeros nos totais e na contagem de itens (quantidades zeradas)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [item({ id: 'item_1' }), item({ id: 'item_2' })],
        especificacoes: [especificacao('item_1', 'UN'), especificacao('item_2', 'UN')],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.totaisPorUnidade).toEqual([
      {
        unidade: 'UN',
        itens: 2,
        solicitado: dec(20),
        executado: dec(0),
        disponivel: dec(0),
        entregue: dec(0),
        pendente: dec(20),
      },
    ])
  })

  it('reflete a produção parcialmente concluída por unidade (RN03)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(10), executado: dec(7) }),
          item({ id: 'item_2', solicitado: dec(8), executado: dec(0) }),
          item({ id: 'item_3', solicitado: dec(12), executado: dec(12) }),
        ],
        especificacoes: [
          especificacao('item_1', 'UN'),
          especificacao('item_2', 'UN'),
          especificacao('item_3', 'M'),
        ],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    const un = detalhe.totaisPorUnidade.find((total) => total.unidade === 'UN')
    expect(un?.executado.toString()).toBe('7')
    expect(un?.pendente.toString()).toBe('11')
    expect(un?.disponivel.toString()).toBe('7')
    const metro = detalhe.totaisPorUnidade.find((total) => total.unidade === 'M')
    expect(metro?.pendente.toString()).toBe('0')
  })

  it('reflete entregas parciais e o disponível por unidade (RN03)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(10), executado: dec(8), entregue: dec(3) }),
          item({ id: 'item_2', solicitado: dec(5), executado: dec(5), entregue: dec(5) }),
        ],
        especificacoes: [especificacao('item_1', 'UN'), especificacao('item_2', 'UN')],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.totaisPorUnidade[0].entregue.toString()).toBe('8')
    expect(detalhe.totaisPorUnidade[0].disponivel.toString()).toBe('5')
    expect(detalhe.totaisPorUnidade[0].pendente.toString()).toBe('2')
  })

  it('preserva o saldo por item: os totais são a soma dos valores individuais (RN03)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(10), executado: dec(8), entregue: dec(3) }),
          item({ id: 'item_2', solicitado: dec(6), executado: dec(2), entregue: dec(0) }),
        ],
        especificacoes: [especificacao('item_1', 'UN'), especificacao('item_2', 'UN')],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    const somaDisponivel = detalhe.itens.reduce((total, i) => total.plus(i.disponivel), dec(0))
    expect(detalhe.totaisPorUnidade[0].disponivel.toString()).toBe(somaDisponivel.toString())
    expect(detalhe.itens[0].disponivel.toString()).toBe('5')
    expect(detalhe.itens[0].pendente.toString()).toBe('2')
    expect(detalhe.itens[1].pendente.toString()).toBe('4')
  })

  it('agrupa itens sem unidade válida em grupo próprio, sem inventar unidade (RN05)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        itens: [
          item({ id: 'item_1', solicitado: dec(4) }),
          item({ id: 'item_2', solicitado: dec(9) }),
          item({ id: 'item_3', solicitado: dec(3) }),
        ],
        especificacoes: [especificacao('item_1', 'UN'), especificacao('item_2', '   ')],
      }),
    ])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(
      detalhe.totaisPorUnidade.map((total) => [
        total.unidade,
        total.itens,
        total.solicitado.toString(),
      ]),
    ).toEqual([
      ['UN', 1, '4'],
      [null, 2, '12'],
    ])
  })

  it('pedido sem itens não tem totais por unidade', async () => {
    const repo = createRepo([pedido({ id: 'ped_1', numero: '1001', itens: [] })])

    const detalhe = await detalharPedido('ped_1', repo)

    expect(detalhe.totaisPorUnidade).toEqual([])
  })
})

describe('detalharPedido — atraso comercial do item (AD-025)', () => {
  /** Fim do dia 01/02/2026 em America/Sao_Paulo. */
  const PRAZO_VENCIDO = new Date('2026-02-02T02:59:59.999Z')
  /** 23:00 de 01/02/2026 em America/Sao_Paulo: o prazo ainda vale. */
  const DENTRO_DO_DIA = new Date('2026-02-02T02:00:00.000Z')
  /** 00:00 de 02/02/2026 em America/Sao_Paulo: o prazo terminou. */
  const DEPOIS_DO_DIA = new Date('2026-02-02T03:00:00.000Z')

  function pedidoComPrazo(itens: ItemDoPedido[], especificacoes: EspecificacaoItem[]): PedidoSeed {
    return pedido({
      id: 'ped_1',
      numero: '1001',
      cliente: 'Construtora X',
      itens,
      especificacoes,
    })
  }

  it('deriva o status por item usando o mesmo instante da consulta', async () => {
    const repo = createRepo([
      pedidoComPrazo(
        [
          item({
            id: 'item_1',
            solicitado: dec(10),
            executado: dec(10),
            entregue: dec(0),
          }),
          item({
            id: 'item_2',
            solicitado: dec(10),
            executado: dec(10),
            entregue: dec(10),
          }),
        ],
        [
          especificacao('item_1', 'peca', null, {
            classificationStatus: 'CLASSIFIED',
            deadlineAt: PRAZO_VENCIDO,
          }),
          especificacao('item_2', 'peca', null, {
            classificationStatus: 'CLASSIFIED',
            deadlineAt: PRAZO_VENCIDO,
          }),
        ],
      ),
    ])

    const detalhe = await detalharPedido('ped_1', repo, DEPOIS_DO_DIA)

    expect(detalhe.itens.map((item) => item.statusPrazoEntrega)).toEqual(['ATRASADO', 'EM_DIA'])
  })

  it('retorna SEM_PRAZO quando o item não tem prazo de entrega', async () => {
    const repo = createRepo([
      pedidoComPrazo(
        [item({ id: 'item_1', solicitado: dec(10), entregue: dec(0) })],
        [especificacao('item_1', 'peca')],
      ),
    ])

    const detalhe = await detalharPedido('ped_1', repo, DEPOIS_DO_DIA)

    expect(detalhe.itens[0].statusPrazoEntrega).toBe('SEM_PRAZO')
  })

  it('mantém a Revenda atrasada quando a indisponibilidade não gerou entrega (AD-012)', async () => {
    const repo = createRepo([
      pedidoComPrazo(
        [
          item({
            id: 'item_1',
            solicitado: dec(10),
            // Revenda sem separação: a indisponibilidade não entra como
            // executado nem como entregue e, por isso, não encerra o atraso.
            executado: dec(0),
            entregue: dec(0),
          }),
        ],
        [
          especificacao('item_1', 'un', 'Revenda', {
            classificationStatus: 'CLASSIFIED',
            sectorCode: 'REVENDA',
            deadlineAt: PRAZO_VENCIDO,
            activityStatus: 'COMPLETED',
          }),
        ],
      ),
    ])

    const detalhe = await detalharPedido('ped_1', repo, DEPOIS_DO_DIA)

    expect(detalhe.itens[0].statusPrazoEntrega).toBe('ATRASADO')
  })

  it('não usa o status operacional como substituto da entrega', async () => {
    const repo = createRepo([
      pedidoComPrazo(
        [
          item({
            id: 'item_1',
            solicitado: dec(10),
            executado: dec(8),
            entregue: dec(8),
          }),
          item({
            id: 'item_2',
            solicitado: dec(10),
            executado: dec(8),
            entregue: dec(10),
          }),
        ],
        [
          especificacao('item_1', 'peca', null, {
            classificationStatus: 'CLASSIFIED',
            deadlineAt: PRAZO_VENCIDO,
            activityStatus: 'COMPLETED',
          }),
          especificacao('item_2', 'peca', null, {
            classificationStatus: 'CLASSIFIED',
            deadlineAt: PRAZO_VENCIDO,
            activityStatus: 'PENDING',
          }),
        ],
      ),
    ])

    const detalhe = await detalharPedido('ped_1', repo, DEPOIS_DO_DIA)

    expect(detalhe.itens.map((item) => item.statusPrazoEntrega)).toEqual(['ATRASADO', 'EM_DIA'])
  })

  it('recalcula o status em uma nova consulta, sem prometer atualização automática', async () => {
    const repo = createRepo([
      pedidoComPrazo(
        [item({ id: 'item_1', solicitado: dec(10), entregue: dec(0) })],
        [
          especificacao('item_1', 'peca', null, {
            classificationStatus: 'CLASSIFIED',
            deadlineAt: PRAZO_VENCIDO,
          }),
        ],
      ),
    ])

    const dentroDoPrazo = await detalharPedido('ped_1', repo, DENTRO_DO_DIA)
    const depoisDoPrazo = await detalharPedido('ped_1', repo, DEPOIS_DO_DIA)

    expect(dentroDoPrazo.itens[0].statusPrazoEntrega).toBe('EM_DIA')
    expect(depoisDoPrazo.itens[0].statusPrazoEntrega).toBe('ATRASADO')
  })

  it('acompanha a alteração do solicitado em uma nova leitura, sem tocar na integração', async () => {
    const especificacoes = [
      especificacao('item_1', 'peca', null, {
        classificationStatus: 'CLASSIFIED',
        deadlineAt: PRAZO_VENCIDO,
      }),
    ]
    const comSolicitadoAnterior = createRepo([
      pedidoComPrazo(
        [item({ id: 'item_1', solicitado: dec(10), entregue: dec(10) })],
        especificacoes,
      ),
    ])
    const comSolicitadoAtualizado = createRepo([
      pedidoComPrazo(
        [item({ id: 'item_1', solicitado: dec(12), entregue: dec(10) })],
        especificacoes,
      ),
    ])

    const anterior = await detalharPedido('ped_1', comSolicitadoAnterior, DEPOIS_DO_DIA)
    const atualizado = await detalharPedido('ped_1', comSolicitadoAtualizado, DEPOIS_DO_DIA)

    expect(anterior.itens[0].statusPrazoEntrega).toBe('EM_DIA')
    expect(atualizado.itens[0].statusPrazoEntrega).toBe('ATRASADO')
  })
})
