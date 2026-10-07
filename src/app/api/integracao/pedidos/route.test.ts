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
    findRecentByIdempotencyKey: async (idempotencyKey: string, since: Date) =>
      jobs.find((job) => job.idempotencyKey === idempotencyKey && job.createdAt.getTime() >= since.getTime()) ??
      null,
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

vi.mock('../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: mocks.repo,
}))

vi.mock('../../../../modules/integracao/adapters/http-conector-legado', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../modules/integracao/adapters/http-conector-legado')>()
  return { ...actual, createHttpConectorLegado: () => mocks.conector }
})

import { POST } from './route'

function request(body: unknown, token: string | null = 'segredo-interno'): Request {
  return new Request('http://localhost/api/integracao/pedidos', {
    method: 'POST',
    headers:
      token === null
        ? { 'content-type': 'application/json' }
        : { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/integracao/pedidos', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 202 com o jobId e cria um job PENDING para número válido', async () => {
    const response = await POST(request({ orderNumber: '70435' }))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ jobId: 'job_1' })
    expect(mocks.jobs).toHaveLength(1)
    expect(mocks.jobs[0].legacyOrderNumber).toBe('70435')
    expect(mocks.jobs[0].status).toBe('PENDING')
  })

  it('responde 401 e não cria job quando o token está ausente', async () => {
    const response = await POST(request({ orderNumber: '70435' }, null))

    expect(response.status).toBe(401)
    expect(mocks.jobs).toHaveLength(0)
  })

  it('responde 401 e não cria job quando o token diverge', async () => {
    const response = await POST(request({ orderNumber: '70435' }, 'outro-token'))

    expect(response.status).toBe(401)
    expect(mocks.jobs).toHaveLength(0)
  })

  it('responde 400 e não cria job para número não inteiro', async () => {
    const response = await POST(request({ orderNumber: '1.5' }))

    expect(response.status).toBe(400)
    expect(mocks.jobs).toHaveLength(0)
  })

  it('responde 400 quando orderNumber está ausente', async () => {
    const response = await POST(request({}))

    expect(response.status).toBe(400)
    expect(mocks.jobs).toHaveLength(0)
  })

  it('agenda o despacho e move o job para RUNNING ao executar a tarefa de background', async () => {
    await POST(request({ orderNumber: '70435' }))

    expect(mocks.scheduled).toHaveLength(1)
    await mocks.scheduled[0]()

    expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_1', orderNumber: '70435' }])
    expect(mocks.jobs[0].status).toBe('RUNNING')
    expect(mocks.events.map((event) => event.type)).toEqual(['DISPATCHED'])
  })

  it('reutiliza o job dentro da janela e não agenda novo despacho', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ jobId: 'job_1' })
    expect(mocks.jobs).toHaveLength(1)
    expect(mocks.scheduled).toHaveLength(0)
  })
})
