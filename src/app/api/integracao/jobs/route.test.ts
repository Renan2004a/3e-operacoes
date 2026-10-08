import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const perfis: Record<string, RoleCode[]> = {}
  const jobs: Array<{
    id: string
    legacyOrderNumber: string
    status: string
    attemptCount: number
    errorCode: string | null
    errorMessage: string | null
    createdAt: Date
    updatedAt: Date
    completedAt: Date | null
  }> = []

  function reset() {
    jobs.length = 0
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return { perfis, jobs, reset }
})

vi.mock('../../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: {
    listJobs: async () => mocks.jobs.map((job) => ({ ...job })),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function seedJob(
  id: string,
  overrides: Partial<{ status: string; errorCode: string | null; errorMessage: string | null }> = {},
): void {
  mocks.jobs.push({
    id,
    legacyOrderNumber: '70435',
    status: overrides.status ?? 'FAILED',
    attemptCount: 3,
    errorCode: overrides.errorCode ?? 'CONNECTOR_TIMEOUT',
    errorMessage: overrides.errorMessage ?? 'Conector não respondeu',
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: NOW,
  })
}

function request(opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_tecnico' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/integracao/jobs', { method: 'GET', headers })
}

describe('GET /api/integracao/jobs', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_tecnico = ['TECHNICAL_RESPONSIBLE']
    mocks.perfis.user_sistema = ['SYSTEM_RESPONSIBLE']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 com os jobs e seus erros para o responsável técnico (LAC-09)', async () => {
    seedJob('job_1', { status: 'FAILED', errorCode: 'ORDER_NOT_FOUND' })

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.jobs).toHaveLength(1)
    expect(body.jobs[0]).toMatchObject({
      id: 'job_1',
      status: 'FAILED',
      errorCode: 'ORDER_NOT_FOUND',
    })
  })

  it('responde 200 com lista vazia quando não há jobs (LAC-09)', async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect((await response.json()).jobs).toEqual([])
  })

  it('responde 200 também para o responsável pelo sistema (LAC-09)', async () => {
    seedJob('job_1')

    const response = await GET(request({ usuarioId: 'user_sistema' }))

    expect(response.status).toBe(200)
    expect((await response.json()).jobs).toHaveLength(1)
  })

  it('responde 401 sem sessão (LAC-09)', async () => {
    const response = await GET(request({ usuarioId: null }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('responde 403 quando o perfil não monitora integração (LAC-09)', async () => {
    const response = await GET(request({ usuarioId: 'user_operador' }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })
})
