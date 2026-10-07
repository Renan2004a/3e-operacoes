import { describe, expect, it } from 'vitest'
import {
  InvalidCallbackPayloadError,
  JobNotFoundError,
  type CallbackPayload,
  type IntegracaoRepository,
  type IntegrationJob,
  type IntegrationJobEventRecord,
  type JobStatus,
} from './contratos'
import { processarCallback } from './processar-callback'
import type { ClassificacaoAutomaticaPort, PedidosRepository } from '../pedidos/importar-pedido'
import {
  classificarPorMapeamento,
  type ActivityCriada,
  type ClassificacaoRepository,
} from '../setores/classificar-item'
import type { CategorySectorMapping, MapeamentoRepository } from '../setores/mapeamento'

const NOW = new Date('2026-10-06T12:00:00.000Z')

function makeJob(id: string, status: JobStatus): IntegrationJob {
  return {
    id,
    legacyOrderNumber: '70435',
    idempotencyKey: 'pedido:70435',
    status,
    attemptCount: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  }
}

function createIntegracaoFake(seedJobs: IntegrationJob[] = [], seedEvents: IntegrationJobEventRecord[] = []) {
  const jobs = [...seedJobs]
  const events = [...seedEvents]
  let seq = seedJobs.length + seedEvents.length

  const repo: IntegracaoRepository = {
    async findRecentByIdempotencyKey() {
      return null
    },
    async findById(jobId) {
      return jobs.find((job) => job.id === jobId) ?? null
    },
    async create() {
      throw new Error('não usado')
    },
    async updateStatus({ jobId, status, now, errorCode, errorMessage, completedAt }) {
      const job = jobs.find((candidate) => candidate.id === jobId)
      if (!job) throw new Error('job não encontrado')
      job.status = status
      job.updatedAt = now
      if (errorCode !== undefined) job.errorCode = errorCode
      if (errorMessage !== undefined) job.errorMessage = errorMessage
      if (completedAt !== undefined) job.completedAt = completedAt
      return job
    },
    async appendEvent({ jobId, type, detail, now }) {
      seq += 1
      const event: IntegrationJobEventRecord = {
        id: `evt_${seq}`,
        jobId,
        type,
        detail: detail ?? null,
        createdAt: now,
      }
      events.push(event)
      return event
    },
    async listEvents(jobId) {
      return events.filter((event) => event.jobId === jobId)
    },
  }

  return { repo, jobs, events }
}

interface FakeOrderItem {
  id?: string
  legacyItemKey: string
  legacyCategory?: string | null
  classificationStatus?: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  requestedQuantity: string
  executedQuantity: string
  deliveredQuantity: string
}

interface FakeOrder {
  id: string
  legacyOrderKey: string
  customerName: string | null
  items: FakeOrderItem[]
}

function createPedidosFake(options: { failUpsert?: boolean; seed?: FakeOrder[] } = {}) {
  const orders = [...(options.seed ?? [])]
  let seq = orders.length

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
      if (options.failUpsert) throw new Error('falha simulada no upsert')
      let order = orders.find((candidate) => candidate.legacyOrderKey === input.legacyOrderKey)
      if (!order) {
        seq += 1
        order = {
          id: `order_${seq}`,
          legacyOrderKey: input.legacyOrderKey,
          customerName: input.customerName,
          items: [],
        }
        orders.push(order)
      } else {
        order.customerName = input.customerName
      }

      for (const item of input.items) {
        const existing = order.items.find((candidate) => candidate.legacyItemKey === item.legacyItemKey)
        if (existing) {
          existing.requestedQuantity = item.requestedQuantity
          existing.legacyCategory = item.legacyCategory
        } else {
          seq += 1
          order.items.push({
            id: `item_${seq}`,
            legacyItemKey: item.legacyItemKey,
            legacyCategory: item.legacyCategory,
            classificationStatus: 'PENDING_CLASSIFICATION',
            requestedQuantity: item.requestedQuantity,
            executedQuantity: '0.000',
            deliveredQuantity: '0.000',
          })
        }
      }

      return { orderId: order.id }
    },
    async registrarDivergencia() {
      // A escrita do AuditLog é verificada no adapter Prisma; aqui basta satisfazer a porta.
    },
  }

  return { repo, orders }
}

function mapping(
  overrides: Partial<CategorySectorMapping> & Pick<CategorySectorMapping, 'legacyCategory'>,
): CategorySectorMapping {
  const base: CategorySectorMapping = {
    id: 'map_1',
    legacyCategory: overrides.legacyCategory,
    sectorId: 'setor_telhas',
    status: 'ACTIVE',
    createdAt: NOW,
    updatedAt: NOW,
  }
  return { ...base, ...overrides }
}

/** Porta de auto-classificação apoiada nos repositórios falsos em memória. */
function createClassificacaoPort(
  orders: FakeOrder[],
  seedMappings: CategorySectorMapping[] = [],
) {
  const mappings = [...seedMappings]
  const activities: ActivityCriada[] = []
  let seq = 0

  const classificacao: ClassificacaoRepository = {
    async findItemById(itemId) {
      for (const order of orders) {
        const found = order.items.find((item) => item.id === itemId)
        if (found) {
          return {
            id: found.id ?? itemId,
            legacyCategory: found.legacyCategory ?? null,
            classificationStatus: found.classificationStatus ?? 'PENDING_CLASSIFICATION',
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
        const found = order.items.find((item) => item.id === itemId)
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
      const found = mappings.find((candidate) => candidate.legacyCategory === legacyCategory)
      return found ? { ...found } : null
    },
    async findById(id) {
      const found = mappings.find((candidate) => candidate.id === id)
      return found ? { ...found } : null
    },
    async create() {
      throw new Error('não usado')
    },
    async update() {
      throw new Error('não usado')
    },
    async deactivate() {
      throw new Error('não usado')
    },
    async recordAudit() {},
  }

  const port: ClassificacaoAutomaticaPort = {
    async classificarItens({ orderId, items }) {
      const order = orders.find((candidate) => candidate.id === orderId)
      if (!order) throw new Error('pedido não encontrado')
      for (const item of items) {
        const found = order.items.find((candidate) => candidate.legacyItemKey === item.legacyItemKey)
        if (!found || !found.id) continue
        if (found.classificationStatus === 'CLASSIFIED') continue
        await classificarPorMapeamento(found.id, { classificacao, mapeamento })
      }
    },
  }

  return { port, activities }
}

function validCallback(overrides: Partial<CallbackPayload> = {}): CallbackPayload {
  return {
    jobId: 'job_1',
    order: {
      emp: 1,
      orc: 70435,
      legacyOrderKey: '1:70435',
      legacyNumber: '70435',
      customerName: 'MARCO ANTONIO DE OLIVEIRA',
      sellerCode: '10',
      sourceUpdatedAt: '2026-10-01T12:00:00.000Z',
    },
    items: [
      {
        seq: 1,
        productCode: 'P001',
        description: 'TELHA',
        unit: 'UN',
        requestedQuantity: '5.000',
        legacyCategory: null,
      },
    ],
    ...overrides,
  }
}

describe('processarCallback', () => {
  it('não persiste dados quando o payload é inválido', async () => {
    const integracao = createIntegracaoFake([makeJob('job_1', 'RUNNING')])
    const pedidos = createPedidosFake()
    const invalid = validCallback({
      items: [
        {
          seq: 1,
          productCode: 'P001',
          description: 'TELHA',
          unit: 'UN',
          requestedQuantity: 'abc',
          legacyCategory: null,
        },
      ],
    })

    await expect(
      processarCallback(invalid, { integracao: integracao.repo, pedidos: pedidos.repo, now: () => NOW }),
    ).rejects.toBeInstanceOf(InvalidCallbackPayloadError)

    expect(pedidos.orders).toHaveLength(0)
    expect(integracao.events).toHaveLength(0)
    expect(integracao.jobs[0].status).toBe('RUNNING')
  })

  it('lança JobNotFoundError quando o job não existe', async () => {
    const integracao = createIntegracaoFake()
    const pedidos = createPedidosFake()

    await expect(
      processarCallback(validCallback(), { integracao: integracao.repo, pedidos: pedidos.repo, now: () => NOW }),
    ).rejects.toBeInstanceOf(JobNotFoundError)

    expect(pedidos.orders).toHaveLength(0)
  })

  it('marca o job como SUCCEEDED e registra o evento', async () => {
    const integracao = createIntegracaoFake([makeJob('job_1', 'DISPATCHED')])
    const pedidos = createPedidosFake()

    await processarCallback(validCallback(), {
      integracao: integracao.repo,
      pedidos: pedidos.repo,
      now: () => NOW,
    })

    expect(integracao.jobs[0].status).toBe('SUCCEEDED')
    expect(integracao.jobs[0].completedAt).toEqual(NOW)
    expect(integracao.events.map((event) => event.type)).toEqual(['SUCCEEDED'])
  })

  it('faz o upsert do pedido com os itens normalizados', async () => {
    const integracao = createIntegracaoFake([makeJob('job_1', 'RUNNING')])
    const pedidos = createPedidosFake()

    await processarCallback(
      validCallback({
        items: [
          {
            seq: 7,
            productCode: 'P007',
            description: 'PERFIL',
            unit: 'M',
            requestedQuantity: '12.500',
            legacyCategory: null,
          },
        ],
      }),
      { integracao: integracao.repo, pedidos: pedidos.repo, now: () => NOW },
    )

    expect(pedidos.orders).toHaveLength(1)
    expect(pedidos.orders[0].legacyOrderKey).toBe('1:70435')
    expect(pedidos.orders[0].customerName).toBe('MARCO ANTONIO DE OLIVEIRA')
    expect(pedidos.orders[0].items[0].legacyItemKey).toBe('7')
    expect(pedidos.orders[0].items[0].requestedQuantity).toBe('12.500')
  })

  it('não repete o upsert quando o job já está concluído', async () => {
    for (const status of ['SUCCEEDED', 'FAILED'] as const) {
      const integracao = createIntegracaoFake([makeJob('job_1', status)])
      const pedidos = createPedidosFake({
        seed: [
          {
            id: 'order_1',
            legacyOrderKey: '1:70435',
            customerName: 'MARCO ANTONIO DE OLIVEIRA',
            items: [
              {
                legacyItemKey: '1',
                requestedQuantity: '5.000',
                executedQuantity: '0.000',
                deliveredQuantity: '0.000',
              },
            ],
          },
        ],
      })

      await processarCallback(
        validCallback({
          items: [
            {
              seq: 1,
              productCode: 'P001',
              description: 'TELHA',
              unit: 'UN',
              requestedQuantity: '9.000',
              legacyCategory: null,
            },
          ],
        }),
        { integracao: integracao.repo, pedidos: pedidos.repo, now: () => NOW },
      )

      expect(pedidos.orders[0].items[0].requestedQuantity).toBe('5.000')
      expect(integracao.events).toHaveLength(0)
    }
  })

  it('registra evento DIVERGENCE quando a quantidade é menor que a executada', async () => {
    const integracao = createIntegracaoFake([makeJob('job_1', 'RUNNING')])
    const pedidos = createPedidosFake({
      seed: [
        {
          id: 'order_1',
          legacyOrderKey: '1:70435',
          customerName: 'MARCO ANTONIO DE OLIVEIRA',
          items: [
            {
              legacyItemKey: '1',
              requestedQuantity: '5.000',
              executedQuantity: '5.000',
              deliveredQuantity: '0.000',
            },
          ],
        },
      ],
    })

    await processarCallback(
      validCallback({
        items: [
          {
            seq: 1,
            productCode: 'P001',
            description: 'TELHA',
            unit: 'UN',
            requestedQuantity: '3.000',
            legacyCategory: null,
          },
        ],
      }),
      { integracao: integracao.repo, pedidos: pedidos.repo, now: () => NOW },
    )

    expect(integracao.jobs[0].status).toBe('SUCCEEDED')
    expect(integracao.events.map((event) => event.type)).toEqual(['SUCCEEDED', 'DIVERGENCE'])
    expect(integracao.events[1].detail).toContain('"legacyItemKey":"1"')
  })

  it('marca o job como FAILED quando o upsert falha', async () => {
    const integracao = createIntegracaoFake([makeJob('job_1', 'RUNNING')])
    const pedidos = createPedidosFake({ failUpsert: true })

    await expect(
      processarCallback(validCallback(), { integracao: integracao.repo, pedidos: pedidos.repo, now: () => NOW }),
    ).rejects.toThrow('falha simulada no upsert')

    expect(integracao.jobs[0].status).toBe('FAILED')
    expect(integracao.jobs[0].errorCode).toBe('UPSERT_FAILED')
    expect(integracao.events.map((event) => event.type)).toEqual(['FAILED'])
  })

  it('classifica automaticamente o item com categoria mapeada e cria a atividade', async () => {
    const integracao = createIntegracaoFake([makeJob('job_1', 'RUNNING')])
    const pedidos = createPedidosFake()
    const { port, activities } = createClassificacaoPort(pedidos.orders, [
      mapping({ legacyCategory: 'Telhas', sectorId: 'setor_telhas' }),
    ])

    await processarCallback(
      validCallback({
        items: [
          {
            seq: 1,
            productCode: 'P001',
            description: 'TELHA',
            unit: 'UN',
            requestedQuantity: '5.000',
            legacyCategory: 'Telhas',
          },
        ],
      }),
      { integracao: integracao.repo, pedidos: pedidos.repo, classificacao: port, now: () => NOW },
    )

    expect(integracao.jobs[0].status).toBe('SUCCEEDED')
    expect(pedidos.orders[0].items[0].classificationStatus).toBe('CLASSIFIED')
    expect(activities).toEqual([
      { id: 'act_1', orderItemId: pedidos.orders[0].items[0].id, sectorId: 'setor_telhas' },
    ])
  })
})
