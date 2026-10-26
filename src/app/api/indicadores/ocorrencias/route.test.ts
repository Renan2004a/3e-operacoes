import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import type { OcorrenciaDetalhada } from '../../../../modules/ocorrencias/painel-ocorrencias'

const mocks = vi.hoisted(() => {
  const ocorrencias: OcorrenciaDetalhada[] = []
  const perfis: Record<string, RoleCode[]> = {}
  return { ocorrencias, perfis }
})

vi.mock('../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository', () => ({
  prismaOcorrenciasRepository: {
    listarOcorrenciasDetalhadas: async () => mocks.ocorrencias.map((item) => ({ ...item })),
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
  return new Request('http://localhost/api/indicadores/ocorrencias', { headers })
}

function ocorrencia(overrides: Partial<OcorrenciaDetalhada> = {}): OcorrenciaDetalhada {
  return {
    id: 'o1',
    activityId: 'a1',
    tipo: 'PERDA',
    quantidade: null,
    observacao: 'Peça trincada',
    occurredAt: new Date(),
    motivo: 'Defeito de corte',
    pedido: '82269',
    item: 'Perfil UE',
    setor: 'Corte e Dobra',
    usuario: 'Operador',
    activityStatus: 'IN_PROGRESS',
    ...overrides,
  }
}

describe('GET /api/indicadores/ocorrencias', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.ocorrencias.length = 0
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('retorna o resumo com total, últimos 7 dias e recentes', async () => {
    mocks.ocorrencias.push(ocorrencia(), ocorrencia({ id: 'o2', tipo: 'REFUGO' }))

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.resumo.total).toBe(2)
    expect(body.resumo.ultimos7Dias).toBe(2)
    expect(body.resumo.recentes).toHaveLength(2)
    expect(body.resumo.porTipo).toContainEqual({ tipo: 'PERDA', total: 1 })
    expect(body.resumo.porTipo).toContainEqual({ tipo: 'REFUGO', total: 1 })
  })

  it('responde 401 sem sessão', async () => {
    const response = await GET(request({ usuarioId: null }))
    expect(response.status).toBe(401)
  })
})
