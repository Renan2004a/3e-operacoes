import type { RoleCode } from '@/generated/prisma/client'
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
  const perfis: Record<string, RoleCode[]> = {}

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

  let dispatchError: unknown = null

  const conector = {
    despachar: async (input: { jobId: string; orderNumber: string }) => {
      dispatchCalls.push(input)
      if (dispatchError) throw dispatchError
    },
  }

  function setDispatchError(error: unknown) {
    dispatchError = error
  }

  function reset() {
    jobs.length = 0
    events.length = 0
    dispatchCalls.length = 0
    scheduled.length = 0
    dispatchError = null
    seq = 0
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return { jobs, events, dispatchCalls, scheduled, repo, conector, setDispatchError, reset, perfis }
})

vi.mock('next/server', () => ({
  after: (task: () => unknown) => {
    mocks.scheduled.push(task)
  },
}))

vi.mock('../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

vi.mock('../../../../modules/integracao/adapters/http-conector-legado', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../modules/integracao/adapters/http-conector-legado')>()
  return { ...actual, createHttpConectorLegado: () => mocks.conector }
})

import { POST } from './route'
import { ConectorLegadoError } from '../../../../modules/integracao/adapters/http-conector-legado'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'

function request(body: unknown, opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_import' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/integracao/pedidos', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/integracao/pedidos', () => {
  const original = process.env.SESSION_SECRET
  const originalBackoff = process.env.CONNECTOR_RETRY_BACKOFF_MS

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    // O despacho agora repete falhas transitórias; sem espera o teste fica rápido.
    process.env.CONNECTOR_RETRY_BACKOFF_MS = '0'
    mocks.reset()
    mocks.perfis.user_import = ['PRODUCTION_MANAGER']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
    if (originalBackoff === undefined) delete process.env.CONNECTOR_RETRY_BACKOFF_MS
    else process.env.CONNECTOR_RETRY_BACKOFF_MS = originalBackoff
  })

  it('responde 202 com o jobId e cria um job PENDING para número válido', async () => {
    const response = await POST(request({ orderNumber: '70435' }))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ jobId: 'job_1' })
    expect(mocks.jobs).toHaveLength(1)
    expect(mocks.jobs[0].legacyOrderNumber).toBe('70435')
    expect(mocks.jobs[0].status).toBe('PENDING')
  })

  it('responde 401 e não cria job quando não há sessão', async () => {
    const response = await POST(request({ orderNumber: '70435' }, { usuarioId: null }))

    expect(response.status).toBe(401)
    expect(mocks.jobs).toHaveLength(0)
  })

  it('responde 403 e não cria job quando o perfil não é autorizado', async () => {
    mocks.perfis.user_vendedor = ['SELLER']

    const response = await POST(
      request({ orderNumber: '70435' }, { usuarioId: 'user_vendedor' }),
    )

    expect(response.status).toBe(403)
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

  it('marca o job como FAILED com ORDER_NOT_FOUND quando o pedido não existe no legado', async () => {
    mocks.setDispatchError(
      new ConectorLegadoError('ORDER_NOT_FOUND', 'Pedido não encontrado no Top Gerente'),
    )

    await POST(request({ orderNumber: '70435' }))
    await mocks.scheduled[0]()

    expect(mocks.jobs[0].status).toBe('FAILED')
    expect(mocks.jobs[0].errorCode).toBe('ORDER_NOT_FOUND')
    expect(mocks.events.map((event) => event.type)).toEqual(['DISPATCHED', 'FAILED'])
    expect(mocks.events[1].detail).toBe('ORDER_NOT_FOUND')
  })

  it('repete a falha transitória antes de marcar FAILED com CONNECTOR_TIMEOUT (LAC-11)', async () => {
    mocks.setDispatchError(
      new ConectorLegadoError('CONNECTOR_TIMEOUT', 'Conector não respondeu no tempo limite'),
    )

    await POST(request({ orderNumber: '70435' }))
    await mocks.scheduled[0]()

    expect(mocks.dispatchCalls).toHaveLength(3)
    expect(mocks.jobs[0].status).toBe('FAILED')
    expect(mocks.jobs[0].errorCode).toBe('CONNECTOR_TIMEOUT')
    expect(mocks.events.map((event) => event.type)).toEqual([
      'DISPATCHED',
      'RETRY',
      'RETRY',
      'FAILED',
    ])
    expect(mocks.events[3].detail).toBe('CONNECTOR_TIMEOUT')
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
