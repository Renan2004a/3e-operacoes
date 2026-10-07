import { Prisma } from '@/generated/prisma/client'
import type { ActivityStatus, RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../modules/auth/sessao'
import type { IndicadoresRepository } from '../../../modules/indicadores/adapters/prisma-indicadores-repository'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

const holder = vi.hoisted(() => ({
  atividades: [] as { id: string; sectorId: string; status: ActivityStatus }[],
  execucoes: [] as { sectorId: string; quantidade: number }[],
  comPrazo: [] as {
    id: string
    sectorId: string
    status: ActivityStatus
    deadlineAt: string | null
    completedAt: string | null
  }[],
  perfis: {} as Record<string, RoleCode[]>,
  repo: null as unknown as IndicadoresRepository,
}))

vi.mock('../../../modules/indicadores/adapters/prisma-indicadores-repository', () => ({
  prismaIndicadoresRepository: {
    listarAtividades: () => holder.repo.listarAtividades(),
    listarExecucoes: () => holder.repo.listarExecucoes(),
    listarAtividadesComPrazo: () => holder.repo.listarAtividadesComPrazo(),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(holder.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

holder.repo = {
  async listarAtividades() {
    return holder.atividades.map((atividade) => ({ ...atividade }))
  },
  async listarExecucoes() {
    return holder.execucoes.map((execucao) => ({
      sectorId: execucao.sectorId,
      quantidade: new Prisma.Decimal(execucao.quantidade),
    }))
  },
  async listarAtividadesComPrazo() {
    return holder.comPrazo.map((atividade) => ({
      id: atividade.id,
      sectorId: atividade.sectorId,
      status: atividade.status,
      deadlineAt: atividade.deadlineAt ? new Date(atividade.deadlineAt) : null,
      completedAt: atividade.completedAt ? new Date(atividade.completedAt) : null,
    }))
  },
  async listarPedidosParaConsulta() {
    return []
  },
  async buscarCabecalhoPedido() {
    return null
  },
  async buscarItensDoPedido() {
    return null
  },
}

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function request(opts: { userId?: string | null } = {}): Request {
  const { userId = 'user_gerente' } = opts
  const headers: Record<string, string> = {}
  if (userId) {
    const token = assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/indicadores', { method: 'GET', headers })
}

describe('GET /api/indicadores', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    holder.atividades.length = 0
    holder.execucoes.length = 0
    holder.comPrazo.length = 0
    for (const key of Object.keys(holder.perfis)) delete holder.perfis[key]
    holder.perfis.user_gerente = ['PRODUCTION_MANAGER']
    holder.perfis.user_sem_perfil = []
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 com contagem por setor/status e pendências (IND-05, IND-06)', async () => {
    holder.atividades.push(
      { id: 'a1', sectorId: 'setor_telhas', status: 'PENDING' },
      { id: 'a2', sectorId: 'setor_telhas', status: 'COMPLETED' },
      { id: 'a3', sectorId: 'setor_corte', status: 'IN_PROGRESS' },
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.painel.porSetor).toEqual([
      { sectorId: 'setor_corte', total: 1 },
      { sectorId: 'setor_telhas', total: 2 },
    ])
    expect(body.painel.porStatus).toEqual([
      { status: 'PENDING', total: 1 },
      { status: 'IN_PROGRESS', total: 1 },
      { status: 'COMPLETED', total: 1 },
    ])
    expect(body.painel.pendencias).toBe(2)
  })

  it('responde 200 com a produção por setor (IND-07)', async () => {
    holder.execucoes.push(
      { sectorId: 'setor_telhas', quantidade: 4 },
      { sectorId: 'setor_telhas', quantidade: 6 },
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pcp.producaoPorSetor).toEqual([{ sectorId: 'setor_telhas', quantidade: '10' }])
  })

  it('responde 200 com o cumprimento de prazo (IND-08)', async () => {
    holder.comPrazo.push(
      {
        id: 'a1',
        sectorId: 'setor_telhas',
        status: 'COMPLETED',
        deadlineAt: '2026-06-10T00:00:00.000Z',
        completedAt: '2026-06-09T00:00:00.000Z',
      },
      {
        id: 'a2',
        sectorId: 'setor_corte',
        status: 'COMPLETED',
        deadlineAt: '2026-06-10T00:00:00.000Z',
        completedAt: '2026-06-11T00:00:00.000Z',
      },
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pcp.cumprimentoPrazo).toEqual({
      concluidasComPrazo: 2,
      concluidasNoPrazo: 1,
      percentual: 50,
    })
  })

  it('responde 401 sem sessão (IND-11)', async () => {
    const response = await GET(request({ userId: null }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('responde 403 quando o usuário não tem perfil (IND-11)', async () => {
    const response = await GET(request({ userId: 'user_sem_perfil' }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })
})
