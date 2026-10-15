import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'
import type { Remessa } from '../../../../../../modules/expedicao/remessas'

const mocks = vi.hoisted(() => {
  const remessas: Remessa[] = []
  const perfis: Record<string, RoleCode[]> = {}
  const repo = {
    buscarPorNumero: async (orderItemId: string, remessa: number) =>
      remessas.find((item) => item.orderItemId === orderItemId && item.remessa === remessa) ?? null,
    criar: async (input: {
      orderItemId: string
      remessa: number
      scheduledAt: Date
      note: string | null
    }) => {
      const criada: Remessa = { id: `r${remessas.length + 1}`, confirmedAt: null, ...input }
      remessas.push(criada)
      return criada
    },
  }
  return { remessas, perfis, repo }
})

vi.mock('../../../../../../modules/expedicao/adapters/prisma-remessa-repository', () => ({
  prismaRemessaRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { POST } from './route'

function request(body: unknown, opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_mgr' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/pedidos/itens/item_1/remessas', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function context(itemId: string) {
  return { params: Promise.resolve({ itemId }) }
}

describe('POST /api/pedidos/itens/[itemId]/remessas', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.remessas.length = 0
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 201 e persiste a remessa', async () => {
    const response = await POST(
      request({ remessa: 1, scheduledAt: '2026-11-20T00:00:00.000Z' }),
      context('item_1'),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.remessa.remessa).toBe(1)
    expect(mocks.remessas).toHaveLength(1)
  })

  it('ancora data somente-dia ao meio-dia de São Paulo', async () => {
    const response = await POST(
      request({ remessa: 2, scheduledAt: '2026-12-15' }),
      context('item_1'),
    )

    expect(response.status).toBe(201)
    expect(mocks.remessas[0].scheduledAt.toISOString()).toBe('2026-12-15T15:00:00.000Z')
  })

  it('responde 409 para remessa repetida no mesmo item', async () => {
    mocks.remessas.push({
      id: 'r1',
      orderItemId: 'item_1',
      remessa: 1,
      scheduledAt: new Date(),
      confirmedAt: null,
      note: null,
    })

    const response = await POST(
      request({ remessa: 1, scheduledAt: '2026-11-20T00:00:00.000Z' }),
      context('item_1'),
    )

    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('remessa_duplicada')
  })

  it('responde 400 sem número ou data', async () => {
    const response = await POST(request({}), context('item_1'))
    expect(response.status).toBe(400)
    expect(mocks.remessas).toHaveLength(0)
  })

  it('responde 403 quando o perfil não pode programar remessa', async () => {
    const response = await POST(
      request({ remessa: 1, scheduledAt: '2026-11-20T00:00:00.000Z' }, { usuarioId: 'user_operador' }),
      context('item_1'),
    )
    expect(response.status).toBe(403)
    expect(mocks.remessas).toHaveLength(0)
  })

  it('responde 401 sem sessão', async () => {
    const response = await POST(
      request({ remessa: 1, scheduledAt: '2026-11-20T00:00:00.000Z' }, { usuarioId: null }),
      context('item_1'),
    )
    expect(response.status).toBe(401)
  })
})
