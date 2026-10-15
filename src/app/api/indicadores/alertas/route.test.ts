import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import type { ItemParaAlerta } from '../../../../modules/indicadores/alertas'

const mocks = vi.hoisted(() => {
  const itens: ItemParaAlerta[] = []
  const perfis: Record<string, RoleCode[]> = {}
  return { itens, perfis }
})

vi.mock('../../../../modules/indicadores/adapters/prisma-indicadores-repository', () => ({
  prismaIndicadoresRepository: {
    listarItensParaAlerta: async () => mocks.itens.map((item) => ({ ...item })),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

function request(opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_mgr' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/indicadores/alertas', { headers })
}

function item(overrides: Partial<ItemParaAlerta> = {}): ItemParaAlerta {
  return {
    itemId: 'i1',
    orderId: 'o1',
    orderNumber: '1001',
    itemDescription: 'Telha',
    classificationStatus: 'CLASSIFIED',
    activityId: 'a1',
    activityStatus: 'PENDING',
    sectorName: 'Telhas',
    activityCreatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    deadlineAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lastExecutionAt: null,
    ...overrides,
  }
}

describe('GET /api/indicadores/alertas', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.itens.length = 0
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('retorna atrasados, parados e não encaminhados', async () => {
    mocks.itens.push(
      item({ itemId: 'i1' }),
      item({ itemId: 'i2', classificationStatus: 'PENDING_CLASSIFICATION', activityId: null, activityStatus: null }),
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.alertas.atrasados).toHaveLength(1)
    expect(body.alertas.parados).toHaveLength(1)
    expect(body.alertas.naoEncaminhados).toHaveLength(1)
  })

  it('responde 401 sem sessão', async () => {
    const response = await GET(request({ usuarioId: null }))
    expect(response.status).toBe(401)
  })
})
