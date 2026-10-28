import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../shared/http/auth-context'
import type { Remessa } from '../../../../../modules/expedicao/remessas'

const mocks = vi.hoisted(() => {
  const remessas: Remessa[] = []
  const perfis: Record<string, RoleCode[]> = {}
  const repo = {
    confirmar: async (id: string, now: Date) => {
      const remessa = remessas.find((item) => item.id === id)
      if (!remessa) return null
      remessa.confirmedAt = now
      return remessa
    },
    remover: async (id: string) => {
      const indice = remessas.findIndex((item) => item.id === id)
      if (indice < 0) return false
      remessas.splice(indice, 1)
      return true
    },
  }
  return { remessas, perfis, repo }
})

vi.mock('../../../../../modules/expedicao/adapters/prisma-remessa-repository', () => ({
  prismaRemessaRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { DELETE, PATCH } from './route'

function request(method: string, opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_mgr' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/pedidos/remessas/r1', { method, headers })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH/DELETE /api/pedidos/remessas/[id]', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.remessas.length = 0
    mocks.remessas.push({
      id: 'r1',
      orderItemId: 'item_1',
      remessa: 1,
      scheduledAt: new Date('2026-11-20T00:00:00.000Z'),
      confirmedAt: null,
      note: null,
    })
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('confirma a remessa (PATCH)', async () => {
    const response = await PATCH(request('PATCH'), context('r1'))
    expect(response.status).toBe(200)
    expect((await response.json()).remessa.confirmedAt).not.toBeNull()
  })

  it('responde 404 ao confirmar remessa inexistente', async () => {
    const response = await PATCH(request('PATCH'), context('inexistente'))
    expect(response.status).toBe(404)
  })

  it('remove a remessa (DELETE)', async () => {
    const response = await DELETE(request('DELETE'), context('r1'))
    expect(response.status).toBe(204)
    expect(mocks.remessas).toHaveLength(0)
  })

  it('responde 404 ao remover remessa inexistente', async () => {
    const response = await DELETE(request('DELETE'), context('inexistente'))
    expect(response.status).toBe(404)
  })

  it('responde 403 sem permissão', async () => {
    const response = await PATCH(request('PATCH', { usuarioId: 'user_operador' }), context('r1'))
    expect(response.status).toBe(403)
  })

  it('responde 403 ao remover sem permissão', async () => {
    const response = await DELETE(request('DELETE', { usuarioId: 'user_operador' }), context('r1'))
    expect(response.status).toBe(403)
  })

  it('nega confirmação e remoção ao Vendedor (remessa é tarefa da expedição)', async () => {
    mocks.perfis.user_seller = ['SELLER']

    const confirmacao = await PATCH(request('PATCH', { usuarioId: 'user_seller' }), context('r1'))
    expect(confirmacao.status).toBe(403)

    const remocao = await DELETE(request('DELETE', { usuarioId: 'user_seller' }), context('r1'))
    expect(remocao.status).toBe(403)
  })

  it('confirmações repetidas não duplicam a remessa', async () => {
    const respostas = await Promise.all([
      PATCH(request('PATCH'), context('r1')),
      PATCH(request('PATCH'), context('r1')),
    ])

    expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200])
    expect(mocks.remessas).toHaveLength(1)
  })

  it('exclusões concorrentes removem a remessa uma única vez', async () => {
    const respostas = await Promise.all([
      DELETE(request('DELETE'), context('r1')),
      DELETE(request('DELETE'), context('r1')),
    ])

    expect(respostas.map((resposta) => resposta.status).sort()).toEqual([204, 404])
    expect(mocks.remessas).toHaveLength(0)
  })

  it('mantém a remoção de remessa confirmada enquanto a D6 estiver pendente (AD-016)', async () => {
    mocks.remessas[0].confirmedAt = new Date('2026-11-21T12:00:00.000Z')

    const response = await DELETE(request('DELETE'), context('r1'))

    expect(response.status).toBe(204)
    expect(mocks.remessas).toHaveLength(0)
  })

  it('responde 401 sem sessão', async () => {
    const response = await PATCH(request('PATCH', { usuarioId: null }), context('r1'))
    expect(response.status).toBe(401)
  })
})
