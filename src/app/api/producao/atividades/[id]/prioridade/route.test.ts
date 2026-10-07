import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  interface Atividade {
    id: string
    orderItemId: string
    sectorId: string
    status: string
    priority: number
    createdAt: Date
  }

  const store: Atividade[] = []
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    definirPrioridade: async ({ atividadeId, prioridade }: { atividadeId: string; prioridade: number }) => {
      const found = store.find((candidate) => candidate.id === atividadeId)
      if (!found) return null
      found.priority = prioridade
      return { ...found }
    },
  }

  function atividade(overrides: Partial<Atividade> & Pick<Atividade, 'id' | 'sectorId'>): Atividade {
    const base: Atividade = {
      id: overrides.id,
      orderItemId: `item_${overrides.id}`,
      sectorId: overrides.sectorId,
      status: 'PENDING',
      priority: 0,
      createdAt: new Date('2026-10-07T12:00:00.000Z'),
    }
    return { ...base, ...overrides }
  }

  function reset() {
    store.length = 0
  }

  return { store, atividade, repo, perfis, reset }
})

vi.mock('../../../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { PATCH } from './route'

function request(
  body: unknown,
  opts: { usuarioId?: string | null; xUserId?: string | null } = {},
): Request {
  const { usuarioId = 'user_mgr', xUserId = null } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request('http://localhost/api/producao/atividades/act_1/prioridade', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/producao/atividades/[id]/prioridade', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 e persiste a prioridade da atividade', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({ prioridade: 7 }), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividade.priority).toBe(7)
    expect(mocks.store[0].priority).toBe(7)
  })

  it('responde 404 quando a atividade não existe', async () => {
    const response = await PATCH(request({ prioridade: 7 }), context('act_x'))

    expect(response.status).toBe(404)
  })

  it('responde 400 quando a prioridade está ausente', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({}), context('act_1'))

    expect(response.status).toBe(400)
    expect(mocks.store[0].priority).toBe(0)
  })

  it('responde 400 quando a prioridade não é um número', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({ prioridade: 'alta' }), context('act_1'))

    expect(response.status).toBe(400)
    expect(mocks.store[0].priority).toBe(0)
  })

  it('responde 401 sem sessão e não persiste (AUTH-14)', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({ prioridade: 7 }, { usuarioId: null }), context('act_1'))

    expect(response.status).toBe(401)
    expect(mocks.store[0].priority).toBe(0)
  })

  it('ignora o cabeçalho x-user-id quando não há sessão (AUTH-14)', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(
      request({ prioridade: 7 }, { usuarioId: null, xUserId: 'user_mgr' }),
      context('act_1'),
    )

    expect(response.status).toBe(401)
    expect(mocks.store[0].priority).toBe(0)
  })

  it('responde 403 quando o perfil não pode definir prioridade (AUTH-14)', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(
      request({ prioridade: 7 }, { usuarioId: 'user_operador' }),
      context('act_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(mocks.store[0].priority).toBe(0)
  })
})
