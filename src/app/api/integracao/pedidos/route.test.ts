import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  interface Job {
    id: string
    orderId: string | null
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
    findLatestByOrderNumberSince: async (legacyOrderNumber: string, since: Date) =>
      jobs
        .filter(
          (job) =>
            job.legacyOrderNumber === legacyOrderNumber &&
            job.createdAt.getTime() >= since.getTime(),
        )
        .sort(
          (a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
        )[0] ?? null,
    findById: async (jobId: string) => jobs.find((job) => job.id === jobId) ?? null,
    iniciarDespacho: async (jobId: string, now: Date, atualizadoEmEsperado?: Date) => {
      const job = jobs.find((candidate) => candidate.id === jobId)
      if (!job) return false
      if (
        atualizadoEmEsperado &&
        job.updatedAt.getTime() !== atualizadoEmEsperado.getTime()
      ) {
        return false
      }
      if (!atualizadoEmEsperado && job.status !== 'PENDING') return false
      job.status = 'DISPATCHED'
      job.updatedAt = now
      job.errorCode = null
      job.errorMessage = null
      job.completedAt = null
      return true
    },
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
        orderId: null,
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
      orderId,
      errorCode,
      errorMessage,
      completedAt,
    }: {
      jobId: string
      status: string
      now: Date
      orderId?: string | null
      errorCode?: string | null
      errorMessage?: string | null
      completedAt?: Date | null
    }) => {
      const job = jobs.find((candidate) => candidate.id === jobId)
      if (!job) throw new Error('job não encontrado')
      job.status = status
      job.updatedAt = now
      if (orderId !== undefined) job.orderId = orderId
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
    expect(await response.json()).toMatchObject({
      jobId: 'job_1',
      orderId: null,
      status: 'PENDING',
      origem: 'NOVA',
    })
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
    mocks.perfis.user_vendedor = ['OPERATOR']

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

  it('classifica resultado final recente como anterior e devolve o pedido vinculado', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.jobs[0].status = 'SUCCEEDED'
    mocks.jobs[0].orderId = 'order_1'
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(await response.json()).toMatchObject({
      jobId: 'job_1',
      orderId: 'order_1',
      status: 'SUCCEEDED',
      origem: 'RESULTADO_ANTERIOR',
    })
    expect(mocks.scheduled).toHaveLength(0)
  })

  it('não duplica despacho de tentativa ativa antiga e a classifica em andamento', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.jobs[0].status = 'RUNNING'
    mocks.jobs[0].createdAt = new Date(Date.now() - 120_000)
    mocks.jobs[0].updatedAt = mocks.jobs[0].createdAt
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(await response.json()).toMatchObject({
      jobId: 'job_1',
      status: 'RUNNING',
      origem: 'EM_ANDAMENTO',
    })
    expect(mocks.scheduled).toHaveLength(0)
  })

  it('não devolve estado final antigo como resultado de uma consulta nova', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.jobs[0].status = 'SUCCEEDED'
    mocks.jobs[0].orderId = 'order_1'
    mocks.jobs[0].createdAt = new Date(Date.now() - 120_000)
    mocks.jobs[0].updatedAt = mocks.jobs[0].createdAt
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(await response.json()).toMatchObject({
      jobId: 'job_1',
      orderId: 'order_1',
      status: 'PENDING',
      origem: 'NOVA',
    })
    expect(mocks.scheduled).toHaveLength(1)
  })

  it('reutiliza o job dentro da janela e não agenda novo despacho', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({
      jobId: 'job_1',
      status: 'PENDING',
      origem: 'EM_ANDAMENTO',
    })
    expect(mocks.jobs).toHaveLength(1)
    expect(mocks.scheduled).toHaveLength(0)
  })

  it('cria novo job e agenda novo despacho após FAILED dentro da janela', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.jobs[0].status = 'FAILED'
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ jobId: 'job_2' })
    expect(mocks.jobs).toHaveLength(2)
    expect(mocks.jobs[1].status).toBe('PENDING')
    expect(mocks.scheduled).toHaveLength(1)

    await mocks.scheduled[0]()
    // Uma segunda execução agendada do mesmo job não repete o conector.
    await mocks.scheduled[0]()

    expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_2', orderNumber: '70435' }])
    expect(mocks.jobs[1].status).toBe('RUNNING')
  })

  it('não agenda processamento duplicado em cliques repetidos após a falha', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.jobs[0].status = 'FAILED'
    mocks.scheduled.length = 0

    const first = await POST(request({ orderNumber: '70435' }))
    const second = await POST(request({ orderNumber: '70435' }))

    expect(await first.json()).toMatchObject({ jobId: 'job_2' })
    expect(await second.json()).toMatchObject({ jobId: 'job_2' })
    expect(mocks.jobs).toHaveLength(2)
    expect(mocks.scheduled).toHaveLength(1)

    await mocks.scheduled[0]()

    expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_2', orderNumber: '70435' }])
  })

  it('duas solicitações concorrentes após a falha despacham o mesmo job uma única vez', async () => {
    await POST(request({ orderNumber: '70435' }))
    mocks.jobs[0].status = 'FAILED'
    mocks.scheduled.length = 0

    const [a, b] = await Promise.all([
      POST(request({ orderNumber: '70435' })),
      POST(request({ orderNumber: '70435' })),
    ])

    expect(await a.json()).toMatchObject({ jobId: 'job_2' })
    expect(await b.json()).toMatchObject({ jobId: 'job_2' })
    expect(mocks.jobs).toHaveLength(2)

    for (const tarefa of mocks.scheduled) await tarefa()

    expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_2', orderNumber: '70435' }])
  })

  it.each(['SUCCEEDED'] as const)(
    'reimporta ou recupera um job %s antigo, fora da janela, sem perder o despacho',
    async (status) => {
      await POST(request({ orderNumber: '70435' }))
      const antigo = mocks.jobs[0]
      antigo.status = status
      antigo.createdAt = new Date(Date.now() - 120_000)
      antigo.updatedAt = antigo.createdAt
      mocks.scheduled.length = 0

      const response = await POST(request({ orderNumber: '70435' }))

      expect(response.status).toBe(202)
      expect(await response.json()).toMatchObject({ jobId: 'job_1' })
      expect(mocks.jobs).toHaveLength(1)
      expect(mocks.scheduled).toHaveLength(1)

      await mocks.scheduled[0]()

      expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_1', orderNumber: '70435' }])
      expect(mocks.jobs[0].status).toBe('RUNNING')
    },
  )

  it('cria novo job ao tentar um FAILED antigo, fora da janela, e o despacha', async () => {
    await POST(request({ orderNumber: '70435' }))
    const antigo = mocks.jobs[0]
    antigo.status = 'FAILED'
    antigo.createdAt = new Date(Date.now() - 120_000)
    antigo.updatedAt = antigo.createdAt
    mocks.scheduled.length = 0

    const response = await POST(request({ orderNumber: '70435' }))

    expect(response.status).toBe(202)
    expect(await response.json()).toMatchObject({ jobId: 'job_2' })
    expect(mocks.jobs).toHaveLength(2)
    expect(mocks.scheduled).toHaveLength(1)

    await mocks.scheduled[0]()

    expect(mocks.dispatchCalls).toEqual([{ jobId: 'job_2', orderNumber: '70435' }])
    expect(mocks.jobs[1].status).toBe('RUNNING')
  })
})
