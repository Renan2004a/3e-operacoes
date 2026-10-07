import { describe, expect, it } from 'vitest'
import {
  importarPedido,
  type PedidoImportado,
  type PedidoImportadoItem,
  type PedidosRepository,
} from './importar-pedido'

const NOW = new Date('2026-10-06T12:00:00.000Z')

interface FakeItem {
  id: string
  legacyItemKey: string
  productCode: string | null
  description: string | null
  unit: string
  requestedQuantity: string
  legacyCategory: string | null
  executedQuantity: string
  deliveredQuantity: string
}

interface FakeOrder {
  id: string
  legacyOrderKey: string
  legacyNumber: string
  customerName: string | null
  sellerLegacyCode: string | null
  sourceUpdatedAt: Date | null
  items: FakeItem[]
}

function createFakeRepo(seed: FakeOrder[] = []) {
  const orders = [...seed]
  let seq = seed.length

  const repo: PedidosRepository = {
    async findOrderByLegacyKey(legacyOrderKey) {
      const order = orders.find((candidate) => candidate.legacyOrderKey === legacyOrderKey)
      if (!order) return null
      return {
        orderId: order.id,
        items: order.items.map((item) => ({
          legacyItemKey: item.legacyItemKey,
          requestedQuantity: item.requestedQuantity,
          executedQuantity: item.executedQuantity,
          deliveredQuantity: item.deliveredQuantity,
        })),
      }
    },
    async upsertOrder(input) {
      let order = orders.find((candidate) => candidate.legacyOrderKey === input.legacyOrderKey)
      if (!order) {
        seq += 1
        order = {
          id: `order_${seq}`,
          legacyOrderKey: input.legacyOrderKey,
          legacyNumber: input.legacyNumber,
          customerName: input.customerName,
          sellerLegacyCode: input.sellerLegacyCode,
          sourceUpdatedAt: input.sourceUpdatedAt,
          items: [],
        }
        orders.push(order)
      } else {
        order.legacyNumber = input.legacyNumber
        order.customerName = input.customerName
        order.sellerLegacyCode = input.sellerLegacyCode
        order.sourceUpdatedAt = input.sourceUpdatedAt
      }

      for (const item of input.items) {
        const existing = order.items.find((candidate) => candidate.legacyItemKey === item.legacyItemKey)
        if (existing) {
          existing.productCode = item.productCode
          existing.description = item.description
          existing.unit = item.unit
          existing.requestedQuantity = item.requestedQuantity
          existing.legacyCategory = item.legacyCategory
        } else {
          seq += 1
          order.items.push({
            id: `item_${seq}`,
            legacyItemKey: item.legacyItemKey,
            productCode: item.productCode,
            description: item.description,
            unit: item.unit,
            requestedQuantity: item.requestedQuantity,
            legacyCategory: item.legacyCategory,
            executedQuantity: '0.000',
            deliveredQuantity: '0.000',
          })
        }
      }

      return { orderId: order.id }
    },
  }

  return { repo, orders }
}

function item(
  overrides: Partial<PedidoImportadoItem> & Pick<PedidoImportadoItem, 'legacyItemKey'>,
): PedidoImportadoItem {
  return {
    productCode: 'P001',
    description: 'TELHA',
    unit: 'UN',
    requestedQuantity: '5.000',
    legacyCategory: null,
    ...overrides,
  }
}

function pedido(overrides: Partial<PedidoImportado> = {}): PedidoImportado {
  return {
    legacyOrderKey: '1:70435',
    legacyNumber: '70435',
    customerName: 'MARCO ANTONIO DE OLIVEIRA',
    sellerLegacyCode: '10',
    sourceUpdatedAt: NOW,
    items: [item({ legacyItemKey: '1' })],
    ...overrides,
  }
}

function seedOrder(executedQuantity: string, deliveredQuantity: string): FakeOrder {
  return {
    id: 'order_1',
    legacyOrderKey: '1:70435',
    legacyNumber: '70435',
    customerName: 'ANTIGO',
    sellerLegacyCode: '10',
    sourceUpdatedAt: NOW,
    items: [
      {
        id: 'item_1',
        legacyItemKey: '1',
        productCode: 'P001',
        description: 'TELHA',
        unit: 'UN',
        requestedQuantity: '5.000',
        legacyCategory: null,
        executedQuantity,
        deliveredQuantity,
      },
    ],
  }
}

describe('importarPedido', () => {
  it('cria pedido novo com todos os itens', async () => {
    const { repo, orders } = createFakeRepo()

    const result = await importarPedido(
      pedido({
        items: [item({ legacyItemKey: '1' }), item({ legacyItemKey: '2', requestedQuantity: '2.500' })],
      }),
      repo,
    )

    expect(result.divergente).toBe(false)
    expect(orders).toHaveLength(1)
    expect(result.orderId).toBe(orders[0].id)
    expect(orders[0].items.map((saved) => saved.legacyItemKey)).toEqual(['1', '2'])
    expect(orders[0].items[1].requestedQuantity).toBe('2.500')
  })

  it('não cria um segundo pedido para a mesma chave de negócio', async () => {
    const { repo, orders } = createFakeRepo()

    const first = await importarPedido(pedido(), repo)
    const second = await importarPedido(pedido(), repo)

    expect(orders).toHaveLength(1)
    expect(second.orderId).toBe(first.orderId)
  })

  it('atualiza campos comerciais e quantidade na reimportação', async () => {
    const { repo, orders } = createFakeRepo()
    await importarPedido(pedido(), repo)
    const updatedAt = new Date('2026-10-07T08:00:00.000Z')

    await importarPedido(
      pedido({
        customerName: 'NOVO CLIENTE',
        sellerLegacyCode: '22',
        sourceUpdatedAt: updatedAt,
        items: [item({ legacyItemKey: '1', requestedQuantity: '9.000' })],
      }),
      repo,
    )

    expect(orders[0].customerName).toBe('NOVO CLIENTE')
    expect(orders[0].sellerLegacyCode).toBe('22')
    expect(orders[0].sourceUpdatedAt).toEqual(updatedAt)
    expect(orders[0].items[0].requestedQuantity).toBe('9.000')
  })

  it('exclui itens cancelados do upsert', async () => {
    const { repo, orders } = createFakeRepo()

    await importarPedido(
      pedido({
        items: [item({ legacyItemKey: '1' }), item({ legacyItemKey: '2', cancelled: true })],
      }),
      repo,
    )

    expect(orders[0].items.map((saved) => saved.legacyItemKey)).toEqual(['1'])
  })

  it('sinaliza divergência quando a nova quantidade é menor que a executada', async () => {
    const { repo } = createFakeRepo([seedOrder('5.000', '0.000')])

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '3.000' })] }),
      repo,
    )

    expect(result.divergente).toBe(true)
    expect(result.divergencias).toEqual([
      {
        legacyItemKey: '1',
        requestedQuantity: '3.000',
        executedQuantity: '5.000',
        deliveredQuantity: '0.000',
      },
    ])
  })

  it('sinaliza divergência quando a nova quantidade é menor que a entregue', async () => {
    const { repo } = createFakeRepo([seedOrder('0.000', '4.000')])

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '2.000' })] }),
      repo,
    )

    expect(result.divergente).toBe(true)
    expect(result.divergencias[0].deliveredQuantity).toBe('4.000')
  })

  it('não sinaliza divergência quando a quantidade é igual à executada', async () => {
    const { repo } = createFakeRepo([seedOrder('5.000', '0.000')])

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '5.000' })] }),
      repo,
    )

    expect(result.divergente).toBe(false)
    expect(result.divergencias).toHaveLength(0)
  })

  it('não sinaliza divergência quando a quantidade é maior que a executada', async () => {
    const { repo } = createFakeRepo([seedOrder('5.000', '0.000')])

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '7.000' })] }),
      repo,
    )

    expect(result.divergente).toBe(false)
  })

  it('preserva os registros operacionais do item na reimportação', async () => {
    const { repo, orders } = createFakeRepo([seedOrder('5.000', '1.000')])

    await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '9.000' })] }),
      repo,
    )

    expect(orders[0].items).toHaveLength(1)
    expect(orders[0].items[0].id).toBe('item_1')
    expect(orders[0].items[0].executedQuantity).toBe('5.000')
    expect(orders[0].items[0].deliveredQuantity).toBe('1.000')
  })
})
