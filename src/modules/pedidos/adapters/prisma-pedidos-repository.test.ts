import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const calls = {
    transactions: 0,
    orderUpsert: [] as unknown[],
    itemCreate: [] as unknown[],
    itemUpdate: [] as unknown[],
    itemUpdateMany: [] as unknown[],
    itemFindMany: [] as unknown[],
    auditCreate: [] as unknown[],
    auditForaTransacao: [] as unknown[],
  }
  let existing: unknown[] = []
  let updateManyCount = 1
  let itemAposUpdate: { unit: string } | null = null

  const tx = {
    order: {
      upsert: async (args: unknown) => {
        calls.orderUpsert.push(args)
        return { id: 'order_1' }
      },
    },
    orderItem: {
      findMany: async (args: unknown) => {
        calls.itemFindMany.push(args)
        return existing
      },
      create: async (args: unknown) => {
        calls.itemCreate.push(args)
        return {}
      },
      update: async (args: unknown) => {
        calls.itemUpdate.push(args)
        return {}
      },
      updateMany: async (args: unknown) => {
        calls.itemUpdateMany.push(args)
        return { count: updateManyCount }
      },
      findUnique: async () => itemAposUpdate,
    },
    auditLog: {
      create: async (args: unknown) => {
        calls.auditCreate.push(args)
        return {}
      },
    },
  }

  const prisma = {
    $transaction: async (arg: unknown) => {
      calls.transactions += 1
      return (arg as (client: typeof tx) => Promise<unknown>)(tx)
    },
    auditLog: {
      create: async (args: unknown) => {
        calls.auditForaTransacao.push(args)
        return {}
      },
    },
  }

  function reset() {
    calls.transactions = 0
    calls.orderUpsert.length = 0
    calls.itemCreate.length = 0
    calls.itemUpdate.length = 0
    calls.itemUpdateMany.length = 0
    calls.itemFindMany.length = 0
    calls.auditCreate.length = 0
    calls.auditForaTransacao.length = 0
    existing = []
    updateManyCount = 1
    itemAposUpdate = null
  }

  return {
    calls,
    prisma,
    reset,
    definirExistentes(valor: unknown[]) {
      existing = valor
    },
    definirUpdateManyCount(valor: number) {
      updateManyCount = valor
    },
    definirItemAposUpdate(valor: { unit: string } | null) {
      itemAposUpdate = valor
    },
  }
})

vi.mock('@/shared/db/prisma', () => ({ prisma: state.prisma }))

import { prismaPedidosRepository } from './prisma-pedidos-repository'

function input(unidade = 'UN', requestedQuantity = '5.000') {
  return {
    legacyOrderKey: '1:70435',
    legacyNumber: '70435',
    customerName: 'MARCO ANTONIO DE OLIVEIRA',
    sellerLegacyCode: '10',
    sourceUpdatedAt: new Date('2026-10-01T00:00:00.000Z'),
    items: [
      {
        legacyItemKey: '1',
        productCode: 'P001',
        description: 'TELHA',
        unit: unidade,
        requestedQuantity,
        legacyCategory: null,
      },
    ],
  }
}

function itemExistente(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item_1',
    legacyItemKey: '1',
    description: 'TELHA',
    unit: 'UN',
    requestedQuantity: '5.000',
    activities: [{ status: 'PENDING', _count: { executions: 0, occurrences: 0 } }],
    _count: { deliveries: 0, scheduledDeliveries: 0 },
    ...overrides,
  }
}

describe('prismaPedidosRepository', () => {
  beforeEach(() => state.reset())

  it('cria item novo na mesma transação do pedido', async () => {
    const result = await prismaPedidosRepository.upsertOrder(input())

    expect(result).toEqual({ orderId: 'order_1', divergenciasUnidade: [] })
    expect(state.calls.transactions).toBe(1)
    expect(state.calls.orderUpsert).toHaveLength(1)
    expect(state.calls.itemFindMany).toHaveLength(1)
    expect(state.calls.itemCreate).toHaveLength(1)
    expect(state.calls.itemCreate[0]).toMatchObject({
      data: {
        orderId: 'order_1',
        legacyItemKey: '1',
        unit: 'UN',
        requestedQuantity: '5.000',
        classificationStatus: 'PENDING_CLASSIFICATION',
      },
    })
    expect(
      (state.calls.orderUpsert[0] as { update: Record<string, unknown> }).update,
    ).not.toHaveProperty('createdAt')
  })

  it('atualiza item existente sem mudança real de unidade', async () => {
    state.definirExistentes([itemExistente()])

    const result = await prismaPedidosRepository.upsertOrder(input('UN'))

    expect(result.divergenciasUnidade).toEqual([])
    expect(state.calls.itemUpdate).toHaveLength(1)
    expect(state.calls.itemUpdateMany).toHaveLength(0)
  })

  it('reconhece diferença apenas de escrita como a mesma unidade', async () => {
    state.definirExistentes([itemExistente({ unit: 'm' })])

    const result = await prismaPedidosRepository.upsertOrder(input(' M '))

    expect(result.divergenciasUnidade).toEqual([])
    expect(state.calls.itemUpdate).toHaveLength(1)
    expect(state.calls.itemUpdate[0]).toMatchObject({ data: { description: 'TELHA' } })
    expect(
      (state.calls.itemUpdate[0] as { data: Record<string, unknown> }).data,
    ).not.toHaveProperty('unit')
    expect(state.calls.auditCreate).toHaveLength(0)
  })

  it('atualiza unidade real quando não há registros operacionais', async () => {
    state.definirExistentes([itemExistente()])

    const result = await prismaPedidosRepository.upsertOrder(input('M', '7.000'))

    expect(result.divergenciasUnidade).toEqual([])
    expect(state.calls.itemUpdateMany).toHaveLength(1)
    expect(state.calls.itemUpdateMany[0]).toMatchObject({
      where: {
        id: 'item_1',
        unit: 'UN',
        deliveries: { none: {} },
        scheduledDeliveries: { none: {} },
        activities: { none: { OR: expect.any(Array) } },
      },
      data: { unit: 'M', requestedQuantity: '7.000' },
    })
    expect(state.calls.auditCreate).toHaveLength(0)
  })

  it('bloqueia mudança de unidade com execução e preserva o item', async () => {
    state.definirExistentes([
      itemExistente({
        activities: [{ status: 'IN_PROGRESS', _count: { executions: 1, occurrences: 0 } }],
      }),
    ])

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toEqual([
      {
        legacyItemKey: '1',
        description: 'TELHA',
        unidadeAnterior: 'UN',
        unidadeNova: 'M',
        motivo: 'REGISTROS_OPERACIONAIS',
      },
    ])
    expect(state.calls.itemUpdate).toHaveLength(0)
    expect(state.calls.itemUpdateMany).toHaveLength(0)
    expect(state.calls.auditForaTransacao).toHaveLength(0)
    expect(state.calls.auditCreate[0]).toMatchObject({
      data: {
        action: 'UNIT_DIVERGENCE',
        entityType: 'OrderItem',
        entityId: '1:70435:1',
        beforeJson: { unit: 'UN' },
        afterJson: { unit: 'M', motivo: 'REGISTROS_OPERACIONAIS' },
      },
    })
  })

  it('bloqueia mudança de unidade com entrega', async () => {
    state.definirExistentes([
      itemExistente({ _count: { deliveries: 1, scheduledDeliveries: 0 } }),
    ])

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toHaveLength(1)
    expect(state.calls.itemUpdateMany).toHaveLength(0)
    expect(state.calls.auditCreate).toHaveLength(1)
  })

  it('bloqueia mudança de unidade com ocorrência', async () => {
    state.definirExistentes([
      itemExistente({
        activities: [{ status: 'PENDING', _count: { executions: 0, occurrences: 1 } }],
      }),
    ])

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toHaveLength(1)
    expect(state.calls.itemUpdateMany).toHaveLength(0)
    expect(state.calls.auditCreate).toHaveLength(1)
  })

  it('bloqueia mudança de unidade com atividade já iniciada', async () => {
    state.definirExistentes([
      itemExistente({
        activities: [{ status: 'IN_PROGRESS', _count: { executions: 0, occurrences: 0 } }],
      }),
    ])

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toHaveLength(1)
    expect(state.calls.itemUpdateMany).toHaveLength(0)
    expect(state.calls.auditCreate).toHaveLength(1)
  })

  it('bloqueia mudança de unidade com remessa programada', async () => {
    state.definirExistentes([
      itemExistente({ _count: { deliveries: 0, scheduledDeliveries: 1 } }),
    ])

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toHaveLength(1)
    expect(state.calls.itemUpdateMany).toHaveLength(0)
    expect(state.calls.auditCreate).toHaveLength(1)
  })

  it('bloqueia quando a condição atômica detecta registro criado na corrida', async () => {
    state.definirExistentes([itemExistente()])
    state.definirUpdateManyCount(0)
    state.definirItemAposUpdate({ unit: 'UN' })

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toHaveLength(1)
    expect(state.calls.itemUpdateMany).toHaveLength(1)
    expect(state.calls.auditCreate).toHaveLength(1)
  })

  it('não cria divergência falsa quando outra execução já aplicou a unidade', async () => {
    state.definirExistentes([itemExistente()])
    state.definirUpdateManyCount(0)
    state.definirItemAposUpdate({ unit: 'M' })

    const result = await prismaPedidosRepository.upsertOrder(input('M'))

    expect(result.divergenciasUnidade).toEqual([])
    expect(state.calls.auditCreate).toHaveLength(0)
  })

  it('registra a divergência de quantidade no AuditLog', async () => {
    await prismaPedidosRepository.registrarDivergencia({
      legacyOrderKey: '1:70435',
      divergencia: {
        legacyItemKey: '1',
        requestedQuantity: '3.000',
        executedQuantity: '5.000',
        deliveredQuantity: '0.000',
      },
    })

    expect(state.calls.auditForaTransacao).toHaveLength(1)
    expect(state.calls.auditForaTransacao[0]).toMatchObject({
      data: {
        action: 'QUANTITY_DIVERGENCE',
        entityType: 'OrderItem',
        entityId: '1:70435:1',
        beforeJson: { executedQuantity: '5.000', deliveredQuantity: '0.000' },
        afterJson: { requestedQuantity: '3.000' },
      },
    })
  })
})
