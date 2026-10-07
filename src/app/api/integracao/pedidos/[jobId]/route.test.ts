import type { RoleCode } from '@/generated/prisma/client'
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
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    findRecentByIdempotencyKey: async () => null,
    findById: async (jobId: string) => jobs.find((job) => job.id === jobId) ?? null,
    create: async () => {
      throw new Error('não usado')
    },
    updateStatus: async () => {
      throw new Error('não usado')
    },
    appendEvent: async () => {
      throw new Error('não usado')
    },
    listEvents: async (jobId: string) => events.filter((event) => event.jobId === jobId),
  }

  function reset() {
    jobs.length = 0
    events.length = 0
  }

  return { jobs, events, repo, reset, perfis }
})

vi.mock('../../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'
import { assinarSessao } from '../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../shared/http/auth-context'

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

function request(opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_view' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/integracao/pedidos/job_1', { headers })
}

function context(jobId: string) {
  return { params: Promise.resolve({ jobId }) }
}

describe('GET /api/integracao/pedidos/[jobId]', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_view = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 404 quando o job não existe', async () => {
    const response = await GET(request(), context('job_x'))

    expect(response.status).toBe(404)
  })

  it('responde 202 com estado não final', async () => {
    for (const status of ['PENDING', 'DISPATCHED', 'RUNNING']) {
      mocks.reset()
      mocks.jobs.push(makeJob('job_1', status))

      const response = await GET(request(), context('job_1'))

      expect(response.status).toBe(202)
      expect(await response.json()).toMatchObject({ jobId: 'job_1', status })
    }
  })

  it('responde 200 com estado final', async () => {
    for (const status of ['SUCCEEDED', 'FAILED']) {
      mocks.reset()
      mocks.jobs.push(makeJob('job_1', status))

      const response = await GET(request(), context('job_1'))

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ jobId: 'job_1', status })
    }
  })

  it('responde 401 quando não há sessão', async () => {
    const response = await GET(request({ usuarioId: null }), context('job_1'))

    expect(response.status).toBe(401)
  })

  it('devolve a lista de eventos do job', async () => {
    mocks.jobs.push(makeJob('job_1', 'RUNNING'))
    mocks.events.push(
      { id: 'evt_1', jobId: 'job_1', type: 'DISPATCHED', detail: null, createdAt: NOW },
      { id: 'evt_2', jobId: 'job_1', type: 'RUNNING', detail: null, createdAt: NOW },
    )

    const response = await GET(request(), context('job_1'))
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body.events.map((event: { type: string }) => event.type)).toEqual(['DISPATCHED', 'RUNNING'])
  })
})
