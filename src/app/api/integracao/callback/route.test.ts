import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const jobs: Array<{
    id: string
    legacyOrderNumber: string
    idempotencyKey: string
    status: string
    attemptCount: number
    errorCode: string | null
    errorMessage: string | null
    createdAt: Date
    updatedAt: Date
    completedAt: Date | null
  }> = []
  const events: Array<{ id: string; jobId: string; type: string; detail: string | null; createdAt: Date }> = []
  const upsertCalls: unknown[] = []
  const orderItems: Array<{
    id: string
    orderId: string
    legacyItemKey: string
    legacyCategory: string | null
    classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  }> = []
  const mappings: Array<{
    id: string
    legacyCategory: string
    sectorId: string
    status: 'ACTIVE' | 'INACTIVE'
    createdAt: Date
    updatedAt: Date
  }> = []
  const activities: Array<{ id: string; orderItemId: string; sectorId: string }> = []
  let seq = 0
  let actSeq = 0

  const integracao = {
    findRecentByIdempotencyKey: async () => null,
    findById: async (jobId: string) => jobs.find((job) => job.id === jobId) ?? null,
    create: async () => {
      throw new Error('não usado')
    },
    updateStatus: async ({
      jobId,
      status,
      now,
      errorCode,
      errorMessage,
      completedAt,
    }: {
      jobId: string
      status: string
      now: Date
      errorCode?: string | null
      errorMessage?: string | null
      completedAt?: Date | null
    }) => {
      const job = jobs.find((candidate) => candidate.id === jobId)
      if (!job) throw new Error('job não encontrado')
      job.status = status
      job.updatedAt = now
      if (errorCode !== undefined) job.errorCode = errorCode
      if (errorMessage !== undefined) job.errorMessage = errorMessage
      if (completedAt !== undefined) job.completedAt = completedAt
      return job
    },
    appendEvent: async ({
      jobId,
      type,
      detail,
      now,
    }: {
      jobId: string
      type: string
      detail?: string | null
      now: Date
    }) => {
      seq += 1
      const event = { id: `evt_${seq}`, jobId, type, detail: detail ?? null, createdAt: now }
      events.push(event)
      return event
    },
    listEvents: async (jobId: string) => events.filter((event) => event.jobId === jobId),
  }

  const pedidos = {
    findOrderByLegacyKey: async () => null,
    upsertOrder: async (input: { items: Array<{ legacyItemKey: string; legacyCategory: string | null }> }) => {
      upsertCalls.push(input)
      for (const item of input.items) {
        const existing = orderItems.find((candidate) => candidate.legacyItemKey === item.legacyItemKey)
        if (existing) {
          existing.legacyCategory = item.legacyCategory
        } else {
          seq += 1
          orderItems.push({
            id: `item_${seq}`,
            orderId: 'order_1',
            legacyItemKey: item.legacyItemKey,
            legacyCategory: item.legacyCategory,
            classificationStatus: 'PENDING_CLASSIFICATION',
          })
        }
      }
      return { orderId: 'order_1' }
    },
    registrarDivergencia: async () => {},
  }

  // Exercita o adaptador real de auto-classificação com a infraestrutura mockada.
  const prisma = {
    orderItem: {
      findMany: async ({ where }: { where: { orderId: string } }) =>
        orderItems
          .filter((item) => item.orderId === where.orderId)
          .map((item) => ({
            id: item.id,
            legacyItemKey: item.legacyItemKey,
            classificationStatus: item.classificationStatus,
          })),
    },
  }

  const classificacao = {
    findItemById: async (id: string) => {
      const found = orderItems.find((item) => item.id === id)
      return found
        ? {
            id: found.id,
            legacyCategory: found.legacyCategory,
            classificationStatus: found.classificationStatus,
          }
        : null
    },
    findSectorById: async () => null,
    markClassified: async ({ itemId, sectorId }: { itemId: string; sectorId: string }) => {
      const found = orderItems.find((item) => item.id === itemId)
      if (!found) throw new Error('item não encontrado')
      found.classificationStatus = 'CLASSIFIED'
      actSeq += 1
      const activity = { id: `act_${actSeq}`, orderItemId: itemId, sectorId }
      activities.push(activity)
      return activity
    },
  }

  const mapeamento = {
    findByCategory: async (legacyCategory: string) => {
      const found = mappings.find((mapping) => mapping.legacyCategory === legacyCategory)
      return found ? { ...found } : null
    },
    findById: async (id: string) => {
      const found = mappings.find((mapping) => mapping.id === id)
      return found ? { ...found } : null
    },
    create: async () => {
      throw new Error('não usado')
    },
    update: async () => {
      throw new Error('não usado')
    },
    deactivate: async () => {
      throw new Error('não usado')
    },
    recordAudit: async () => {},
  }

  function reset() {
    jobs.length = 0
    events.length = 0
    upsertCalls.length = 0
    orderItems.length = 0
    mappings.length = 0
    activities.length = 0
    seq = 0
    actSeq = 0
  }

  return { jobs, events, upsertCalls, orderItems, mappings, activities, integracao, pedidos, prisma, classificacao, mapeamento, reset }
})

vi.mock('../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: mocks.integracao,
}))

vi.mock('../../../../modules/pedidos/adapters/prisma-pedidos-repository', () => ({
  prismaPedidosRepository: mocks.pedidos,
}))

vi.mock('../../../../modules/setores/adapters/prisma-classificacao-repository', () => ({
  prismaClassificacaoRepository: mocks.classificacao,
}))

vi.mock('../../../../modules/setores/adapters/prisma-setores-repository', () => ({
  prismaMapeamentoRepository: mocks.mapeamento,
}))

vi.mock('@/shared/db/prisma', () => ({ prisma: mocks.prisma }))

import { POST } from './route'

const NOW = new Date('2026-10-06T12:00:00.000Z')

function makeJob(id: string, status: string) {
  return {
    id,
    legacyOrderNumber: '70435',
    idempotencyKey: `pedido:70435:${id}`,
    status,
    attemptCount: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  }
}

function validPayload(overrides: Record<string, unknown> = {}) {
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

function request(body: unknown, token: string | null = 'segredo-interno'): Request {
  return new Request('http://localhost/api/integracao/callback', {
    method: 'POST',
    headers:
      token === null
        ? { 'content-type': 'application/json' }
        : { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/integracao/callback', () => {
  const original = process.env.CONNECTOR_CALLBACK_TOKEN

  beforeEach(() => {
    process.env.CONNECTOR_CALLBACK_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.CONNECTOR_CALLBACK_TOKEN
    else process.env.CONNECTOR_CALLBACK_TOKEN = original
  })

  it('responde 200 e conclui o job para payload válido', async () => {
    mocks.jobs.push(makeJob('job_1', 'RUNNING'))

    const response = await POST(request(validPayload()))

    expect(response.status).toBe(200)
    expect(mocks.jobs[0].status).toBe('SUCCEEDED')
    expect(mocks.upsertCalls).toHaveLength(1)
  })

  it('responde 401 sem persistir quando o token é inválido', async () => {
    mocks.jobs.push(makeJob('job_1', 'RUNNING'))

    const response = await POST(request(validPayload(), 'outro-token'))

    expect(response.status).toBe(401)
    expect(mocks.jobs[0].status).toBe('RUNNING')
    expect(mocks.upsertCalls).toHaveLength(0)
  })

  it('responde 200 sem repetir o upsert quando o job já está concluído', async () => {
    mocks.jobs.push(makeJob('job_1', 'SUCCEEDED'))

    const response = await POST(request(validPayload()))

    expect(response.status).toBe(200)
    expect(mocks.upsertCalls).toHaveLength(0)
  })

  it('responde 400 sem persistir quando o payload é inválido', async () => {
    mocks.jobs.push(makeJob('job_1', 'RUNNING'))
    const invalid = validPayload({
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

    const response = await POST(request(invalid))

    expect(response.status).toBe(400)
    expect(mocks.upsertCalls).toHaveLength(0)
    expect(mocks.jobs[0].status).toBe('RUNNING')
  })

  it('responde 404 quando o job não existe', async () => {
    const response = await POST(request(validPayload()))

    expect(response.status).toBe(404)
    expect(mocks.upsertCalls).toHaveLength(0)
  })

  it('classifica automaticamente o item com categoria mapeada no callback', async () => {
    mocks.jobs.push(makeJob('job_1', 'RUNNING'))
    mocks.mappings.push({
      id: 'map_1',
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
    })

    const response = await POST(
      request(
        validPayload({
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
      ),
    )

    expect(response.status).toBe(200)
    expect(mocks.orderItems[0].classificationStatus).toBe('CLASSIFIED')
    expect(mocks.activities).toEqual([
      { id: 'act_1', orderItemId: mocks.orderItems[0].id, sectorId: 'setor_telhas' },
    ])
  })

  it('não reclassifica nem duplica atividade para item já classificado na reimportação', async () => {
    mocks.jobs.push(makeJob('job_1', 'RUNNING'))
    mocks.mappings.push({
      id: 'map_1',
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
    })
    mocks.orderItems.push({
      id: 'item_existente',
      orderId: 'order_1',
      legacyItemKey: '1',
      legacyCategory: 'Telhas',
      classificationStatus: 'CLASSIFIED',
    })

    const response = await POST(
      request(
        validPayload({
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
      ),
    )

    expect(response.status).toBe(200)
    expect(mocks.orderItems).toHaveLength(1)
    expect(mocks.orderItems[0].classificationStatus).toBe('CLASSIFIED')
    expect(mocks.activities).toHaveLength(0)
  })
})
