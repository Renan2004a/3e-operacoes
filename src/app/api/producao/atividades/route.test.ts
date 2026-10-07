import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleCode } from '@/generated/prisma/client'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  interface Atividade {
    id: string
    orderItemId: string
    sectorId: string
    status: string
    priority: number
    createdAt: Date
  }

  const setoresPorUsuario: Record<string, string[]> = {}
  const perfisPorUsuario: Record<string, RoleCode[]> = {}
  const atividades: Atividade[] = []

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

  const repo = {
    listarSetoresDoUsuario: async (usuarioId: string) => [...(setoresPorUsuario[usuarioId] ?? [])],
    listarAtividadesPorSetores: async (sectorIds: string[]) =>
      atividades.filter((candidate) => sectorIds.includes(candidate.sectorId)).map((c) => ({ ...c })),
  }

  const usuariosRepo = {
    findById: async (id: string) => ({ id, roles: [...(perfisPorUsuario[id] ?? [])] }),
  }

  function reset() {
    for (const key of Object.keys(setoresPorUsuario)) delete setoresPorUsuario[key]
    for (const key of Object.keys(perfisPorUsuario)) delete perfisPorUsuario[key]
    atividades.length = 0
  }

  return { setoresPorUsuario, perfisPorUsuario, atividades, atividade, repo, usuariosRepo, reset }
})

vi.mock('../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: mocks.usuariosRepo,
}))

import { GET } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function request(opts: { userId?: string | null; xUserId?: string | null } = {}): Request {
  const { userId = 'user_operador', xUserId = null } = opts
  const headers: Record<string, string> = {}
  if (userId) {
    const token = assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request('http://localhost/api/producao/atividades', { method: 'GET', headers })
}

describe('GET /api/producao/atividades', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfisPorUsuario.user_operador = ['OPERATOR']
    mocks.perfisPorUsuario.user_outro = ['OPERATOR']
    mocks.perfisPorUsuario.user_sem_setor = ['OPERATOR']
    mocks.perfisPorUsuario.user_vendedor = ['SELLER']
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 com apenas as atividades dos setores do usuário da sessão (AUTH-14)', async () => {
    mocks.setoresPorUsuario.user_operador = ['setor_telhas']
    mocks.atividades.push(
      mocks.atividade({ id: 'act_telha', sectorId: 'setor_telhas' }),
      mocks.atividade({ id: 'act_corte', sectorId: 'setor_corte' }),
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividades.map((item: { id: string }) => item.id)).toEqual(['act_telha'])
  })

  it('ordena a fila por prioridade decrescente', async () => {
    mocks.setoresPorUsuario.user_operador = ['setor_telhas']
    mocks.atividades.push(
      mocks.atividade({ id: 'act_baixa', sectorId: 'setor_telhas', priority: 1 }),
      mocks.atividade({ id: 'act_alta', sectorId: 'setor_telhas', priority: 5 }),
      mocks.atividade({ id: 'act_media', sectorId: 'setor_telhas', priority: 3 }),
    )

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.atividades.map((item: { id: string }) => item.id)).toEqual([
      'act_alta',
      'act_media',
      'act_baixa',
    ])
  })

  it('desempata por data de criação ascendente', async () => {
    mocks.setoresPorUsuario.user_operador = ['setor_telhas']
    mocks.atividades.push(
      mocks.atividade({
        id: 'act_nova',
        sectorId: 'setor_telhas',
        priority: 2,
        createdAt: new Date('2026-10-07T13:00:00.000Z'),
      }),
      mocks.atividade({
        id: 'act_antiga',
        sectorId: 'setor_telhas',
        priority: 2,
        createdAt: new Date('2026-10-07T11:00:00.000Z'),
      }),
    )

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.atividades.map((item: { id: string }) => item.id)).toEqual(['act_antiga', 'act_nova'])
  })

  it('responde 200 com lista vazia quando o usuário não pertence a nenhum setor', async () => {
    mocks.atividades.push(mocks.atividade({ id: 'act_telha', sectorId: 'setor_telhas' }))

    const response = await GET(request({ userId: 'user_sem_setor' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividades).toEqual([])
  })

  it('usa o usuário da sessão e ignora o cabeçalho x-user-id (AUTH-14)', async () => {
    mocks.setoresPorUsuario.user_operador = ['setor_telhas']
    mocks.setoresPorUsuario.user_outro = ['setor_corte']
    mocks.atividades.push(
      mocks.atividade({ id: 'act_telha', sectorId: 'setor_telhas' }),
      mocks.atividade({ id: 'act_corte', sectorId: 'setor_corte' }),
    )

    const response = await GET(request({ userId: 'user_operador', xUserId: 'user_outro' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividades.map((item: { id: string }) => item.id)).toEqual(['act_telha'])
  })

  it('responde 401 sem sessão (AUTH-14)', async () => {
    const response = await GET(request({ userId: null }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('responde 403 quando o perfil não pode acessar a produção (AUTH-14)', async () => {
    mocks.setoresPorUsuario.user_vendedor = ['setor_telhas']
    mocks.atividades.push(mocks.atividade({ id: 'act_telha', sectorId: 'setor_telhas' }))

    const response = await GET(request({ userId: 'user_vendedor' }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })
})
