import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import type { OcorrenciaDetalhada } from '../../../../modules/ocorrencias/painel-ocorrencias'

const mocks = vi.hoisted(() => {
  const ocorrencias: OcorrenciaDetalhada[] = []
  const perfis: Record<string, RoleCode[]> = {}
  const filtros: Array<{ usuarioId?: string; limite?: number } | undefined> = []
  return { ocorrencias, perfis, filtros }
})

vi.mock('../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository', () => ({
  prismaOcorrenciasRepository: {
    listarOcorrenciasDetalhadas: async (filtro?: { usuarioId?: string; limite?: number }) => {
      mocks.filtros.push(filtro)
      return mocks.ocorrencias.map((item) => ({ ...item }))
    },
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

function request(opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_op' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/producao/ocorrencias', { headers })
}

function ocorrencia(): OcorrenciaDetalhada {
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
  }
}

describe('GET /api/producao/ocorrencias', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.ocorrencias.length = 0
    mocks.filtros.length = 0
    mocks.perfis.user_op = ['OPERATOR']
    mocks.perfis.user_vend = ['SELLER']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('retorna as ocorrências do usuário da sessão', async () => {
    mocks.ocorrencias.push(ocorrencia())

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ocorrencias).toHaveLength(1)
    expect(body.ocorrencias[0]).toMatchObject({ pedido: '82269', tipo: 'PERDA' })
    expect(mocks.filtros[0]?.usuarioId).toBe('user_op')
  })

  it('responde 401 sem sessão', async () => {
    const response = await GET(request({ usuarioId: null }))
    expect(response.status).toBe(401)
  })

  it('responde 403 para perfil sem permissão de ocorrência', async () => {
    const response = await GET(request({ usuarioId: 'user_vend' }))
    expect(response.status).toBe(403)
  })
})
