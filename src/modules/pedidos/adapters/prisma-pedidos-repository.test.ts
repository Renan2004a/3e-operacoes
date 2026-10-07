import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const calls = {
    transactions: 0,
    orderUpsert: [] as unknown[],
    itemUpsert: [] as unknown[],
    auditCreate: [] as unknown[],
  }

  const tx = {
    order: {
      upsert: async (args: unknown) => {
        calls.orderUpsert.push(args)
        return { id: 'order_1' }
      },
    },
    orderItem: {
      upsert: async (args: unknown) => {
        calls.itemUpsert.push(args)
        return {}
      },
    },
    auditLog: {
      create: async (args: unknown) => {
        calls.auditCreate.push(args)
        return {}
      },
    },
  }

  const prisma = {
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => {
      calls.transactions += 1
      return fn(tx)
    },
    auditLog: {
      create: async (args: unknown) => {
        calls.auditCreate.push(args)
        return {}
      },
    },
  }

  function reset() {
    calls.transactions = 0
    calls.orderUpsert.length = 0
    calls.itemUpsert.length = 0
    calls.auditCreate.length = 0
  }

  return { calls, prisma, reset }
})

vi.mock('@/shared/db/prisma', () => ({ prisma: state.prisma }))

import { prismaPedidosRepository } from './prisma-pedidos-repository'

const input = {
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
      unit: 'UN',
      requestedQuantity: '5.000',
      legacyCategory: null,
    },
  ],
}

describe('prismaPedidosRepository', () => {
  beforeEach(() => state.reset())

  it('faz o upsert de pedido e itens em uma única transação', async () => {
    const result = await prismaPedidosRepository.upsertOrder(input)

    expect(result).toEqual({ orderId: 'order_1' })
    expect(state.calls.transactions).toBe(1)
    expect(state.calls.orderUpsert).toHaveLength(1)
    expect(state.calls.itemUpsert).toHaveLength(1)
    expect(state.calls.itemUpsert[0]).toMatchObject({
      where: { orderId_legacyItemKey: { orderId: 'order_1', legacyItemKey: '1' } },
      create: { requestedQuantity: '5.000', classificationStatus: 'PENDING_CLASSIFICATION' },
    })
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

    expect(state.calls.auditCreate).toHaveLength(1)
    expect(state.calls.auditCreate[0]).toMatchObject({
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
