import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { PedidoNaoEncontradoError, type ItemDoPedido } from '../expedicao/saldo-pedido'
import {
  detalharPedido,
  listarPedidos,
  type AtividadeDoPedido,
  type ConsultaPedidosRepository,
  type EspecificacaoItem,
  type PedidoConsultado,
} from './consulta-pedidos'

interface PedidoSeed {
  id: string
  numero: string
  cliente: string | null
  customerName?: string | null
  sellerLegacyCode?: string | null
  criadoEm: Date
  atividades: AtividadeDoPedido[]
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
    atividades: overrides.atividades ?? [],
    itens: overrides.itens,
    especificacoes: overrides.especificacoes,
  }
}

function createRepo(pedidos: PedidoSeed[]): ConsultaPedidosRepository {
  return {
    async listarPedidosParaConsulta(): Promise<PedidoConsultado[]> {
      return pedidos.map((p) => ({
        id: p.id,
        numero: p.numero,
        cliente: p.cliente,
        criadoEm: p.criadoEm,
        atividades: p.atividades.map((a) => ({ ...a })),
      }))
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
  it('retorna número, cliente e status derivado das atividades (IND-01)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        cliente: 'Construtora X',
        atividades: [{ sectorId: 'setor_telhas', status: 'COMPLETED' }],
      }),
      pedido({
        id: 'ped_2',
        numero: '1002',
        cliente: 'Mercado Y',
        atividades: [{ sectorId: 'setor_corte', status: 'PENDING' }],
      }),
      pedido({
        id: 'ped_3',
        numero: '1003',
        cliente: 'Loja Z',
        atividades: [
          { sectorId: 'setor_telhas', status: 'COMPLETED' },
          { sectorId: 'setor_corte', status: 'IN_PROGRESS' },
        ],
      }),
      pedido({ id: 'ped_4', numero: '1004', cliente: 'Sem produção' }),
    ])

    const lista = await listarPedidos({}, repo)

    expect(lista.map((linha) => [linha.numero, linha.cliente, linha.status])).toEqual([
      ['1001', 'Construtora X', 'COMPLETED'],
      ['1002', 'Mercado Y', 'PENDING'],
      ['1003', 'Loja Z', 'IN_PROGRESS'],
      ['1004', 'Sem produção', 'PENDING'],
    ])
  })

  it('filtra por cliente sem diferenciar maiúsculas (IND-02)', async () => {
    const repo = createRepo([
      pedido({ id: 'ped_1', numero: '1001', cliente: 'Construtora X' }),
      pedido({ id: 'ped_2', numero: '1002', cliente: 'Mercado Y' }),
    ])

    const lista = await listarPedidos({ cliente: 'construtora' }, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_1'])
  })

  it('filtra por setor das atividades (IND-02)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        atividades: [{ sectorId: 'setor_telhas', status: 'PENDING' }],
      }),
      pedido({
        id: 'ped_2',
        numero: '1002',
        atividades: [{ sectorId: 'setor_corte', status: 'PENDING' }],
      }),
    ])

    const lista = await listarPedidos({ setor: 'setor_telhas' }, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_1'])
  })

  it('filtra por status derivado (IND-02)', async () => {
    const repo = createRepo([
      pedido({
        id: 'ped_1',
        numero: '1001',
        atividades: [{ sectorId: 'setor_telhas', status: 'COMPLETED' }],
      }),
      pedido({
        id: 'ped_2',
        numero: '1002',
        atividades: [{ sectorId: 'setor_corte', status: 'PENDING' }],
      }),
    ])

    const lista = await listarPedidos({ status: 'COMPLETED' }, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_1'])
  })

  it('filtra por período de criação, inclusive nas bordas (IND-02)', async () => {
    const repo = createRepo([
      pedido({ id: 'ped_1', numero: '1001', criadoEm: new Date('2026-01-01T00:00:00.000Z') }),
      pedido({ id: 'ped_2', numero: '1002', criadoEm: new Date('2026-06-01T00:00:00.000Z') }),
      pedido({ id: 'ped_3', numero: '1003', criadoEm: new Date('2026-12-01T00:00:00.000Z') }),
    ])

    const lista = await listarPedidos(
      { de: new Date('2026-06-01T00:00:00.000Z'), ate: new Date('2026-06-01T00:00:00.000Z') },
      repo,
    )

    expect(lista.map((linha) => linha.id)).toEqual(['ped_2'])
  })

  it('aplica limite e offset (IND-02)', async () => {
    const repo = createRepo([
      pedido({ id: 'ped_1', numero: '1001' }),
      pedido({ id: 'ped_2', numero: '1002' }),
      pedido({ id: 'ped_3', numero: '1003' }),
    ])

    const lista = await listarPedidos({ limite: 1, offset: 1 }, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_2'])
  })

  it('ordena por criação decrescente (QF-07)', async () => {
    const repo = createRepo([
      pedido({ id: 'ped_1', numero: '1001', criadoEm: new Date('2026-01-01T00:00:00.000Z') }),
      pedido({ id: 'ped_2', numero: '1002', criadoEm: new Date('2026-03-01T00:00:00.000Z') }),
      pedido({ id: 'ped_3', numero: '1003', criadoEm: new Date('2026-02-01T00:00:00.000Z') }),
    ])

    const lista = await listarPedidos({}, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_2', 'ped_3', 'ped_1'])
  })

  it('desempata pela chave do pedido, mantendo a ordem determinística (QF-07)', async () => {
    const mesmaData = new Date('2026-10-07T12:00:00.000Z')
    const repo = createRepo([
      pedido({ id: 'ped_c', numero: '1003', criadoEm: mesmaData }),
      pedido({ id: 'ped_a', numero: '1001', criadoEm: mesmaData }),
      pedido({ id: 'ped_b', numero: '1002', criadoEm: mesmaData }),
    ])

    const lista = await listarPedidos({}, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_a', 'ped_b', 'ped_c'])
  })

  it('aplica o limite padrão de 20 quando ausente (QF-07)', async () => {
    const repo = createRepo(
      Array.from({ length: 25 }, (_, indice) =>
        pedido({
          id: `ped_${String(indice).padStart(2, '0')}`,
          numero: String(1000 + indice),
          criadoEm: new Date(2026, 0, 1, 0, indice),
        }),
      ),
    )

    const lista = await listarPedidos({}, repo)

    expect(lista).toHaveLength(20)
    expect(lista[0].id).toBe('ped_24')
  })

  it('limita o limite ao teto de 100 (QF-07)', async () => {
    const repo = createRepo(
      Array.from({ length: 120 }, (_, indice) =>
        pedido({
          id: `ped_${String(indice).padStart(3, '0')}`,
          numero: String(1000 + indice),
          criadoEm: new Date(2026, 0, 1, 0, indice),
        }),
      ),
    )

    const lista = await listarPedidos({ limite: 500 }, repo)

    expect(lista).toHaveLength(100)
  })

  it('normaliza limite não positivo e offset negativo (QF-07)', async () => {
    const repo = createRepo([
      pedido({ id: 'ped_1', numero: '1001', criadoEm: new Date('2026-01-01T00:00:00.000Z') }),
      pedido({ id: 'ped_2', numero: '1002', criadoEm: new Date('2026-03-01T00:00:00.000Z') }),
      pedido({ id: 'ped_3', numero: '1003', criadoEm: new Date('2026-02-01T00:00:00.000Z') }),
    ])

    const lista = await listarPedidos({ limite: 0, offset: -5 }, repo)

    expect(lista.map((linha) => linha.id)).toEqual(['ped_2'])
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

  it('rejeita pedido inexistente (IND-10)', async () => {
    const repo = createRepo([])

    await expect(detalharPedido('ped_x', repo)).rejects.toBeInstanceOf(PedidoNaoEncontradoError)
  })
})
