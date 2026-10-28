import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import type { AtividadeDetalhadaIndicador } from '../../../../modules/indicadores/adapters/prisma-indicadores-repository'

const mocks = vi.hoisted(() => {
  const atividades: AtividadeDetalhadaIndicador[] = []
  const perfis: Record<string, RoleCode[]> = {}
  const filtros: Array<{ status?: string | null }> = []
  return { atividades, perfis, filtros }
})

vi.mock('../../../../modules/indicadores/adapters/prisma-indicadores-repository', () => ({
  prismaIndicadoresRepository: {
    listarAtividadesDetalhadas: async (filtro: { status?: string | null } = {}) => {
      mocks.filtros.push(filtro)
      return mocks.atividades.map((atividade) => ({ ...atividade }))
    },
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

function request(opts: { usuarioId?: string | null; status?: string } = {}): Request {
  const { usuarioId = 'user_mgr', status } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  const query = status ? `?status=${status}` : ''
  return new Request(`http://localhost/api/indicadores/atividades${query}`, { headers })
}

function atividade(overrides: Partial<AtividadeDetalhadaIndicador> = {}): AtividadeDetalhadaIndicador {
  return {
    id: 'a1',
    orderId: 'o1',
    orderNumber: '82269',
    itemDescription: 'Perfil UE',
    sectorName: 'Corte e Dobra',
    status: 'PENDING',
    priority: 0,
    deadlineAt: null,
    ...overrides,
  }
}

describe('GET /api/indicadores/atividades', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.atividades.length = 0
    mocks.filtros.length = 0
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('nega acesso ao Operador (drill-down é da gerência)', async () => {
    mocks.perfis.user_op = ['OPERATOR']
    const response = await GET(request({ usuarioId: 'user_op' }))
    expect(response.status).toBe(403)
  })

  it('lista as atividades sem filtro', async () => {
    mocks.atividades.push(atividade(), atividade({ id: 'a2', status: 'COMPLETED' }))

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividades).toHaveLength(2)
    expect(mocks.filtros[0]?.status).toBeNull()
  })

  it('repassa o filtro de status', async () => {
    mocks.atividades.push(atividade())

    const response = await GET(request({ status: 'ABERTAS' }))

    expect(response.status).toBe(200)
    expect(mocks.filtros[0]?.status).toBe('ABERTAS')
  })

  it('responde 400 para status inválido', async () => {
    const response = await GET(request({ status: 'QUALQUER' }))

    expect(response.status).toBe(400)
    expect(mocks.filtros).toHaveLength(0)
  })

  it('responde 401 sem sessão', async () => {
    const response = await GET(request({ usuarioId: null }))
    expect(response.status).toBe(401)
  })
})
