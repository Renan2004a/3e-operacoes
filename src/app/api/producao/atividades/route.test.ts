import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  function reset() {
    for (const key of Object.keys(setoresPorUsuario)) delete setoresPorUsuario[key]
    atividades.length = 0
  }

  return { setoresPorUsuario, atividades, atividade, repo, reset }
})

vi.mock('../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: mocks.repo,
}))

import { GET } from './route'

function request(usuarioId: string | null = 'user_1', token: string | null = 'segredo-interno'): Request {
  const headers: Record<string, string> = {}
  if (token !== null) headers.authorization = `Bearer ${token}`
  if (usuarioId !== null) headers['x-user-id'] = usuarioId
  return new Request('http://localhost/api/producao/atividades', { method: 'GET', headers })
}

describe('GET /api/producao/atividades', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 200 com apenas as atividades dos setores do usuário', async () => {
    mocks.setoresPorUsuario.user_1 = ['setor_telhas']
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
    mocks.setoresPorUsuario.user_1 = ['setor_telhas']
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
    mocks.setoresPorUsuario.user_1 = ['setor_telhas']
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

    const response = await GET(request('user_sem_setor'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividades).toEqual([])
  })

  it('responde 401 quando o token está ausente', async () => {
    const response = await GET(request('user_1', null))

    expect(response.status).toBe(401)
  })
})
