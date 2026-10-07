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
  let seq = 0

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
    upsertOrder: async (input: unknown) => {
      upsertCalls.push(input)
      return { orderId: 'order_1' }
    },
  }

  function reset() {
    jobs.length = 0
    events.length = 0
    upsertCalls.length = 0
    seq = 0
  }

  return { jobs, events, upsertCalls, integracao, pedidos, reset }
})

vi.mock('../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: mocks.integracao,
}))

vi.mock('../../../../modules/pedidos/adapters/prisma-pedidos-repository', () => ({
  prismaPedidosRepository: mocks.pedidos,
}))

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
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
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
})
