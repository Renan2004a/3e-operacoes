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

  const store: Atividade[] = []

  const repo = {
    definirPrioridade: async ({ atividadeId, prioridade }: { atividadeId: string; prioridade: number }) => {
      const found = store.find((candidate) => candidate.id === atividadeId)
      if (!found) return null
      found.priority = prioridade
      return { ...found }
    },
  }

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

  function reset() {
    store.length = 0
  }

  return { store, atividade, repo, reset }
})

vi.mock('../../../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: mocks.repo,
}))

import { PATCH } from './route'

function request(
  body: unknown,
  token: string | null = 'segredo-interno',
): Request {
  return new Request('http://localhost/api/producao/atividades/act_1/prioridade', {
    method: 'PATCH',
    headers:
      token === null
        ? { 'content-type': 'application/json' }
        : { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/producao/atividades/[id]/prioridade', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 200 e persiste a prioridade da atividade', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({ prioridade: 7 }), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.atividade.priority).toBe(7)
    expect(mocks.store[0].priority).toBe(7)
  })

  it('responde 404 quando a atividade não existe', async () => {
    const response = await PATCH(request({ prioridade: 7 }), context('act_x'))

    expect(response.status).toBe(404)
  })

  it('responde 400 quando a prioridade está ausente', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({}), context('act_1'))

    expect(response.status).toBe(400)
    expect(mocks.store[0].priority).toBe(0)
  })

  it('responde 400 quando a prioridade não é um número', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({ prioridade: 'alta' }), context('act_1'))

    expect(response.status).toBe(400)
    expect(mocks.store[0].priority).toBe(0)
  })

  it('responde 401 quando o token está ausente', async () => {
    mocks.store.push(mocks.atividade({ id: 'act_1', sectorId: 'setor_telhas' }))

    const response = await PATCH(request({ prioridade: 7 }, null), context('act_1'))

    expect(response.status).toBe(401)
    expect(mocks.store[0].priority).toBe(0)
  })
})
