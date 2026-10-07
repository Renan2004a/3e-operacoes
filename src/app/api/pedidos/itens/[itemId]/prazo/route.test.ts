import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const itens = new Map<string, Date | null>()
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    definirPrazoItem: async ({ itemId, prazo }: { itemId: string; prazo: Date }) => {
      if (!itens.has(itemId)) return null
      itens.set(itemId, prazo)
      return { id: itemId, deadlineAt: prazo }
    },
  }

  function reset() {
    itens.clear()
  }

  return { itens, perfis, repo, reset }
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

function request(
  body: unknown,
  opts: { usuarioId?: string | null } = {},
): Request {
  const { usuarioId = 'user_mgr' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/pedidos/itens/item_1/prazo', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function context(itemId: string) {
  return { params: Promise.resolve({ itemId }) }
}

describe('PATCH /api/pedidos/itens/[itemId]/prazo', () => {
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

  it('responde 200 e persiste o prazo do item (PRAZO-01)', async () => {
    mocks.itens.set('item_1', null)
    const prazo = '2026-10-15T12:00:00.000Z'

    const response = await PATCH(request({ prazo }), context('item_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.item.id).toBe('item_1')
    expect(body.item.deadlineAt).toBe(prazo)
    expect(mocks.itens.get('item_1')).toEqual(new Date(prazo))
  })

  it('responde 403 quando o perfil não pode definir prazo (PRAZO-03)', async () => {
    mocks.itens.set('item_1', null)

    const response = await PATCH(
      request({ prazo: '2026-10-15T12:00:00.000Z' }, { usuarioId: 'user_operador' }),
      context('item_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(mocks.itens.get('item_1')).toBeNull()
  })

  it('responde 400 para data inválida e não persiste (PRAZO-04)', async () => {
    mocks.itens.set('item_1', null)

    const response = await PATCH(request({ prazo: 'data-invalida' }), context('item_1'))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_deadline')
    expect(mocks.itens.get('item_1')).toBeNull()
  })

  it('responde 400 quando o prazo está ausente e não persiste (PRAZO-04)', async () => {
    mocks.itens.set('item_1', null)

    const response = await PATCH(request({}), context('item_1'))

    expect(response.status).toBe(400)
    expect(mocks.itens.get('item_1')).toBeNull()
  })

  it('responde 404 quando o item não existe (PRAZO-12)', async () => {
    const response = await PATCH(request({ prazo: '2026-10-15T12:00:00.000Z' }), context('item_x'))

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('item_not_found')
  })

  it('responde 401 sem sessão e não persiste (AUTH-14)', async () => {
    mocks.itens.set('item_1', null)

    const response = await PATCH(
      request({ prazo: '2026-10-15T12:00:00.000Z' }, { usuarioId: null }),
      context('item_1'),
    )

    expect(response.status).toBe(401)
    expect(mocks.itens.get('item_1')).toBeNull()
  })
})
