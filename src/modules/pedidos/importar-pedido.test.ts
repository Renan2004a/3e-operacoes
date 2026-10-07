import { describe, expect, it } from 'vitest'
import {
  importarPedido,
  type ClassificacaoAutomaticaPort,
  type DivergenciaItem,
  type PedidoImportado,
  type PedidoImportadoItem,
  type PedidosRepository,
} from './importar-pedido'
import {
  classificarPorMapeamento,
  type ActivityCriada,
  type ClassificacaoRepository,
  type ItemParaClassificar,
} from '../setores/classificar-item'
import type { CategorySectorMapping, MapeamentoAudit, MapeamentoRepository } from '../setores/mapeamento'

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
  const divergenciasRegistradas: Array<{ legacyOrderKey: string; divergencia: DivergenciaItem }> = []
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
    async registrarDivergencia(input) {
      divergenciasRegistradas.push(input)
    },
  }

  return { repo, orders, divergenciasRegistradas }
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
    const { repo, divergenciasRegistradas } = createFakeRepo([seedOrder('5.000', '0.000')])

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
    expect(divergenciasRegistradas).toEqual([
      {
        legacyOrderKey: '1:70435',
        divergencia: {
          legacyItemKey: '1',
          requestedQuantity: '3.000',
          executedQuantity: '5.000',
          deliveredQuantity: '0.000',
        },
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
    const { repo, divergenciasRegistradas } = createFakeRepo([seedOrder('5.000', '0.000')])

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '5.000' })] }),
      repo,
    )

    expect(result.divergente).toBe(false)
    expect(result.divergencias).toHaveLength(0)
    expect(divergenciasRegistradas).toHaveLength(0)
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

// --- T4: auto-classificação na importação ---

const NOW_T4 = new Date('2026-10-07T12:00:00.000Z')

interface HarnessItem {
  id: string
  legacyItemKey: string
  legacyCategory: string | null
  classificationStatus: ItemParaClassificar['classificationStatus']
}

function mapping(
  overrides: Partial<CategorySectorMapping> & Pick<CategorySectorMapping, 'legacyCategory'>,
): CategorySectorMapping {
  return {
    id: 'map_1',
    legacyCategory: overrides.legacyCategory,
    sectorId: 'setor_telhas',
    status: 'ACTIVE',
    createdAt: NOW_T4,
    updatedAt: NOW_T4,
    ...overrides,
  }
}

/** Repositórios falsos compartilhados para compor importação + classificação reais. */
function createHarness(seedMappings: CategorySectorMapping[] = []) {
  const orders: Array<{ id: string; legacyOrderKey: string; items: HarnessItem[] }> = []
  const mappingStore = [...seedMappings]
  const activities: ActivityCriada[] = []
  const audits: MapeamentoAudit[] = []
  let seq = 0

  const repo: PedidosRepository = {
    async findOrderByLegacyKey() {
      return null
    },
    async upsertOrder(input) {
      let order = orders.find((candidate) => candidate.legacyOrderKey === input.legacyOrderKey)
      if (!order) {
        seq += 1
        order = { id: `order_${seq}`, legacyOrderKey: input.legacyOrderKey, items: [] }
        orders.push(order)
      }
      for (const item of input.items) {
        const existing = order.items.find((candidate) => candidate.legacyItemKey === item.legacyItemKey)
        if (existing) {
          existing.legacyCategory = item.legacyCategory
        } else {
          seq += 1
          order.items.push({
            id: `item_${seq}`,
            legacyItemKey: item.legacyItemKey,
            legacyCategory: item.legacyCategory,
            classificationStatus: 'PENDING_CLASSIFICATION',
          })
        }
      }
      return { orderId: order.id }
    },
    async registrarDivergencia() {},
  }

  const classificacao: ClassificacaoRepository = {
    async findItemById(itemId) {
      for (const order of orders) {
        const found = order.items.find((candidate) => candidate.id === itemId)
        if (found) {
          return {
            id: found.id,
            legacyCategory: found.legacyCategory,
            classificationStatus: found.classificationStatus,
          }
        }
      }
      return null
    },
    async findSectorById() {
      return null
    },
    async markClassified({ itemId, sectorId }) {
      for (const order of orders) {
        const found = order.items.find((candidate) => candidate.id === itemId)
        if (found) {
          found.classificationStatus = 'CLASSIFIED'
          seq += 1
          const activity: ActivityCriada = { id: `act_${seq}`, orderItemId: itemId, sectorId }
          activities.push(activity)
          return activity
        }
      }
      throw new Error('item não encontrado')
    },
  }

  const mapeamento: MapeamentoRepository = {
    async findByCategory(legacyCategory) {
      const found = mappingStore.find((candidate) => candidate.legacyCategory === legacyCategory)
      return found ? { ...found } : null
    },
    async findById(id) {
      const found = mappingStore.find((candidate) => candidate.id === id)
      return found ? { ...found } : null
    },
    async create({ legacyCategory, sectorId }) {
      seq += 1
      const created: CategorySectorMapping = {
        id: `map_${seq}`,
        legacyCategory,
        sectorId,
        status: 'ACTIVE',
        createdAt: NOW_T4,
        updatedAt: NOW_T4,
      }
      mappingStore.push(created)
      return { ...created }
    },
    async update(id, { sectorId, status }) {
      const found = mappingStore.find((candidate) => candidate.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.sectorId = sectorId
      found.status = status
      return { ...found }
    },
    async deactivate(id) {
      const found = mappingStore.find((candidate) => candidate.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.status = 'INACTIVE'
      return { ...found }
    },
    async recordAudit(entry) {
      audits.push(entry)
    },
  }

  const port: ClassificacaoAutomaticaPort = {
    async classificarItens({ orderId, items }) {
      const order = orders.find((candidate) => candidate.id === orderId)
      if (!order) throw new Error('pedido não encontrado')
      for (const item of items) {
        const found = order.items.find((candidate) => candidate.legacyItemKey === item.legacyItemKey)
        if (!found) continue
        if (found.classificationStatus === 'CLASSIFIED') continue
        await classificarPorMapeamento(found.id, { classificacao, mapeamento })
      }
    },
  }

  return { repo, port, orders, mappingStore, activities, audits }
}

function createRecordingPort() {
  const calls: Array<{
    orderId: string
    items: Array<{ legacyItemKey: string; legacyCategory: string | null }>
  }> = []
  const port: ClassificacaoAutomaticaPort = {
    async classificarItens(input) {
      calls.push(input)
    },
  }
  return { port, calls }
}

describe('importarPedido com auto-classificação', () => {
  it('mantém o comportamento da feature 1 quando a porta não é injetada', async () => {
    const { repo, orders } = createFakeRepo()

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', legacyCategory: 'Telhas' })] }),
      repo,
    )

    expect(result.divergente).toBe(false)
    expect(orders).toHaveLength(1)
    expect(orders[0].items[0].legacyCategory).toBe('Telhas')
  })

  it('envia os itens importados para a porta de classificação', async () => {
    const { repo } = createFakeRepo()
    const { port, calls } = createRecordingPort()

    await importarPedido(
      pedido({
        items: [
          item({ legacyItemKey: '1', legacyCategory: 'Telhas' }),
          item({ legacyItemKey: '2', legacyCategory: null }),
        ],
      }),
      repo,
      port,
    )

    expect(calls).toEqual([
      {
        orderId: 'order_1',
        items: [
          { legacyItemKey: '1', legacyCategory: 'Telhas' },
          { legacyItemKey: '2', legacyCategory: null },
        ],
      },
    ])
  })

  it('não envia itens cancelados para a classificação', async () => {
    const { repo } = createFakeRepo()
    const { port, calls } = createRecordingPort()

    await importarPedido(
      pedido({
        items: [item({ legacyItemKey: '1' }), item({ legacyItemKey: '2', cancelled: true })],
      }),
      repo,
      port,
    )

    expect(calls[0].items.map((entry) => entry.legacyItemKey)).toEqual(['1'])
  })

  it('classifica na importação o item cuja categoria tem mapeamento ativo', async () => {
    const { repo, port, orders, activities } = createHarness([
      mapping({ legacyCategory: 'Telhas', sectorId: 'setor_telhas' }),
    ])

    await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', legacyCategory: 'Telhas' })] }),
      repo,
      port,
    )

    const savedItem = orders[0].items[0]
    expect(savedItem.classificationStatus).toBe('CLASSIFIED')
    expect(activities).toHaveLength(1)
    expect(activities[0]).toMatchObject({ orderItemId: savedItem.id, sectorId: 'setor_telhas' })
  })

  it('mantém pendente na importação o item sem mapeamento', async () => {
    const { repo, port, orders, activities } = createHarness()

    await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', legacyCategory: 'Telhas' })] }),
      repo,
      port,
    )

    expect(orders[0].items[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
    expect(activities).toHaveLength(0)
  })

  it('preserva a detecção de divergência com a porta injetada', async () => {
    const { repo, divergenciasRegistradas } = createFakeRepo([seedOrder('5.000', '0.000')])
    const { port } = createRecordingPort()

    const result = await importarPedido(
      pedido({ items: [item({ legacyItemKey: '1', requestedQuantity: '3.000' })] }),
      repo,
      port,
    )

    expect(result.divergente).toBe(true)
    expect(result.divergencias[0].requestedQuantity).toBe('3.000')
    expect(divergenciasRegistradas).toHaveLength(1)
  })
})
