import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  interface Job {
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
  }

  const jobs: Job[] = []
  const events: Array<{ id: string; jobId: string; type: string; detail: string | null; createdAt: Date }> = []
  const dispatchCalls: Array<{ jobId: string; orderNumber: string }> = []
  const scheduled: Array<() => unknown> = []
  let seq = 0

  const repo = {
    findRecentByIdempotencyKey: async () => null,
    findById: async (jobId: string) => jobs.find((job) => job.id === jobId) ?? null,
    create: async ({
      legacyOrderNumber,
      idempotencyKey,
      now,
    }: {
      legacyOrderNumber: string
      idempotencyKey: string
      now: Date
    }) => {
      const existing = jobs.find((job) => job.idempotencyKey === idempotencyKey)
      if (existing) return existing
      seq += 1
      const job: Job = {
        id: `job_${seq}`,
        legacyOrderNumber,
        idempotencyKey,
        status: 'PENDING',
        attemptCount: 0,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }
      jobs.push(job)
      return job
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

  const conector = {
    despachar: async (input: { jobId: string; orderNumber: string }) => {
      dispatchCalls.push(input)
    },
  }

  function reset() {
    jobs.length = 0
    events.length = 0
    dispatchCalls.length = 0
    scheduled.length = 0
    seq = 0
  }

  return { jobs, events, dispatchCalls, scheduled, repo, conector, reset }
})

vi.mock('next/server', () => ({
  after: (task: () => unknown) => {
    mocks.scheduled.push(task)
  },
}))

vi.mock('../../../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: mocks.repo,
}))

vi.mock('../../../../../../modules/integracao/adapters/http-conector-legado', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../../../../modules/integracao/adapters/http-conector-legado')
    >()
  return { ...actual, createHttpConectorLegado: () => mocks.conector }
})

import { POST } from './route'

const NOW = new Date('2026-10-06T12:00:00.000Z')

function makeJob(id: string, status: string) {
  return {
    id,
    legacyOrderNumber: '70435',
    idempotencyKey: `pedido:70435:${id}`,
    status,
    attemptCount: 1,
    errorCode: status === 'FAILED' ? 'CONNECTOR_TIMEOUT' : null,
    errorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  }
}

function request(token: string | null = 'segredo-interno'): Request {
  return new Request('http://localhost/api/integracao/pedidos/job_failed/reprocessar', {
    method: 'POST',
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  })
}

function context(jobId: string) {
  return { params: Promise.resolve({ jobId }) }
}

describe('POST /api/integracao/pedidos/[jobId]/reprocessar', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 401 quando o token está ausente', async () => {
    mocks.jobs.push(makeJob('job_failed', 'FAILED'))

    const response = await POST(request(null), context('job_failed'))

    expect(response.status).toBe(401)
    expect(mocks.jobs).toHaveLength(1)
    expect(mocks.scheduled).toHaveLength(0)
  })

  it('responde 401 quando o token diverge', async () => {
    mocks.jobs.push(makeJob('job_failed', 'FAILED'))

    const response = await POST(request('outro-token'), context('job_failed'))

    expect(response.status).toBe(401)
    expect(mocks.jobs).toHaveLength(1)
  })

  it('responde 404 quando o job não existe', async () => {
    const response = await POST(request(), context('job_x'))

    expect(response.status).toBe(404)
    expect(mocks.jobs).toHaveLength(0)
    expect(mocks.scheduled).toHaveLength(0)
  })

  it('responde 409 sem criar job quando o job não está FAILED', async () => {
    mocks.jobs.push(makeJob('job_running', 'RUNNING'))

    const response = await POST(request(), context('job_running'))

    expect(response.status).toBe(409)
    expect(mocks.jobs).toHaveLength(1)
    expect(mocks.scheduled).toHaveLength(0)
  })

  it('responde 202, cria novo job e agenda o despacho para um job FAILED', async () => {
    mocks.jobs.push(makeJob('job_failed', 'FAILED'))

    const response = await POST(request(), context('job_failed'))

    expect(response.status).toBe(202)
    const body = await response.json()
    expect(body.jobId).not.toBe('job_failed')
    expect(mocks.jobs).toHaveLength(2)
    const created = mocks.jobs.find((job) => job.id === body.jobId)
    expect(created?.status).toBe('PENDING')
    expect(created?.legacyOrderNumber).toBe('70435')
    expect(mocks.scheduled).toHaveLength(1)

    await mocks.scheduled[0]()

    expect(mocks.dispatchCalls).toEqual([{ jobId: body.jobId, orderNumber: '70435' }])
    expect(created?.status).toBe('RUNNING')
    expect(mocks.events.map((event) => event.type)).toEqual(['DISPATCHED'])
  })
})
