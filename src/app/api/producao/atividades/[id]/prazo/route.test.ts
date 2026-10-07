import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const atividades = new Map<string, Date | null>()
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    definirPrazoAtividade: async ({ atividadeId, prazo }: { atividadeId: string; prazo: Date }) => {
      if (!atividades.has(atividadeId)) return null
      atividades.set(atividadeId, prazo)
      return { id: atividadeId, deadlineAt: prazo }
    },
  }

  function reset() {
    atividades.clear()
  }

  return { atividades, perfis, repo, reset }
})

vi.mock('../../../../../../modules/prazos/adapters/prisma-prazos-repository', () => ({
  prismaPrazosRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { PATCH } from './route'

function request(body: unknown, opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_mgr' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/producao/atividades/act_1/prazo', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/producao/atividades/[id]/prazo', () => {
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

  it('responde 200 e persiste o prazo da atividade (PRAZO-02)', async () => {
    mocks.atividades.set('act_1', null)
    const prazo = '2026-10-20T09:30:00.000Z'

    const response = await PATCH(request({ prazo }), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividade.id).toBe('act_1')
    expect(body.atividade.deadlineAt).toBe(prazo)
    expect(mocks.atividades.get('act_1')).toEqual(new Date(prazo))
  })

  it('responde 403 quando o perfil não pode definir prazo (PRAZO-03)', async () => {
    mocks.atividades.set('act_1', null)

    const response = await PATCH(
      request({ prazo: '2026-10-20T09:30:00.000Z' }, { usuarioId: 'user_operador' }),
      context('act_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(mocks.atividades.get('act_1')).toBeNull()
  })

  it('responde 400 para data inválida e não persiste (PRAZO-04)', async () => {
    mocks.atividades.set('act_1', null)

    const response = await PATCH(request({ prazo: 'data-invalida' }), context('act_1'))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_deadline')
    expect(mocks.atividades.get('act_1')).toBeNull()
  })

  it('responde 400 quando o prazo está ausente e não persiste (PRAZO-04)', async () => {
    mocks.atividades.set('act_1', null)

    const response = await PATCH(request({}), context('act_1'))

    expect(response.status).toBe(400)
    expect(mocks.atividades.get('act_1')).toBeNull()
  })

  it('responde 404 quando a atividade não existe (PRAZO-11)', async () => {
    const response = await PATCH(
      request({ prazo: '2026-10-20T09:30:00.000Z' }),
      context('act_x'),
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('activity_not_found')
  })

  it('responde 401 sem sessão e não persiste (AUTH-14)', async () => {
    mocks.atividades.set('act_1', null)

    const response = await PATCH(
      request({ prazo: '2026-10-20T09:30:00.000Z' }, { usuarioId: null }),
      context('act_1'),
    )

    expect(response.status).toBe(401)
    expect(mocks.atividades.get('act_1')).toBeNull()
  })
})
