import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const NOW = new Date('2026-10-07T12:00:00.000Z')
  const mappings: Array<{
    id: string
    legacyCategory: string
    sectorId: string
    status: 'ACTIVE' | 'INACTIVE'
    createdAt: Date
    updatedAt: Date
  }> = []
  const audits: Array<Record<string, unknown>> = []

  const repo = {
    findByCategory: async (legacyCategory: string) => {
      const found = mappings.find((mapping) => mapping.legacyCategory === legacyCategory)
      return found ? { ...found } : null
    },
    findById: async (id: string) => {
      const found = mappings.find((mapping) => mapping.id === id)
      return found ? { ...found } : null
    },
    create: async ({ legacyCategory, sectorId }: { legacyCategory: string; sectorId: string }) => {
      const created = {
        id: `map_${mappings.length + 1}`,
        legacyCategory,
        sectorId,
        status: 'ACTIVE' as const,
        createdAt: NOW,
        updatedAt: NOW,
      }
      mappings.push(created)
      return { ...created }
    },
    update: async (id: string, { sectorId, status }: { sectorId: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      const found = mappings.find((mapping) => mapping.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.sectorId = sectorId
      found.status = status
      return { ...found }
    },
    deactivate: async (id: string) => {
      const found = mappings.find((mapping) => mapping.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.status = 'INACTIVE'
      return { ...found }
    },
    recordAudit: async (entry: Record<string, unknown>) => {
      audits.push(entry)
    },
  }

  function reset() {
    mappings.length = 0
    audits.length = 0
  }

  return { mappings, audits, repo, reset }
})

vi.mock('../../../modules/setores/adapters/prisma-setores-repository', () => ({
  prismaMapeamentoRepository: mocks.repo,
}))

import { GET, PATCH, POST } from './route'

function request(
  method: 'GET' | 'POST' | 'PATCH',
  options: { body?: unknown; token?: string | null; query?: string } = {},
): Request {
  const token = options.token === undefined ? 'segredo-interno' : options.token
  return new Request(`http://localhost/api/mapeamentos${options.query ?? ''}`, {
    method,
    headers:
      token === null
        ? { 'content-type': 'application/json' }
        : { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

function seedMapping(overrides: Partial<{ id: string; sectorId: string; status: 'ACTIVE' | 'INACTIVE' }> = {}) {
  mocks.mappings.push({
    id: overrides.id ?? 'map_1',
    legacyCategory: 'Telhas',
    sectorId: overrides.sectorId ?? 'setor_a',
    status: overrides.status ?? 'ACTIVE',
    createdAt: new Date('2026-10-07T12:00:00.000Z'),
    updatedAt: new Date('2026-10-07T12:00:00.000Z'),
  })
}

describe('/api/mapeamentos', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 201 ao criar um mapeamento ativo', async () => {
    const response = await POST(
      request('POST', { body: { legacyCategory: 'Telhas', sectorId: 'setor_telhas' } }),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.mapping).toMatchObject({
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
    })
    expect(mocks.mappings).toHaveLength(1)
    expect(mocks.audits).toHaveLength(1)
  })

  it('responde 409 ao criar mapeamento para categoria já mapeada', async () => {
    seedMapping()

    const response = await POST(
      request('POST', { body: { legacyCategory: 'Telhas', sectorId: 'outro_setor' } }),
    )

    expect(response.status).toBe(409)
    expect(mocks.mappings).toHaveLength(1)
  })

  it('responde 200 ao alterar o mapeamento e registra auditoria antes/depois', async () => {
    seedMapping({ id: 'map_1', sectorId: 'setor_a' })

    const response = await PATCH(
      request('PATCH', { body: { id: 'map_1', sectorId: 'setor_b' } }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mapping.sectorId).toBe('setor_b')
    expect(mocks.audits).toHaveLength(1)
    expect(mocks.audits[0]).toMatchObject({
      action: 'UPDATE',
      entityType: 'CategorySectorMapping',
      entityId: 'map_1',
      beforeJson: { sectorId: 'setor_a', status: 'ACTIVE' },
      afterJson: { sectorId: 'setor_b', status: 'ACTIVE' },
    })
  })

  it('responde 200 com o mapeamento da categoria consultada', async () => {
    seedMapping({ sectorId: 'setor_telhas' })

    const response = await GET(request('GET', { query: '?category=Telhas' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mapping).toMatchObject({ legacyCategory: 'Telhas', sectorId: 'setor_telhas' })
  })

  it('responde 401 na criação sem token e não persiste', async () => {
    const response = await POST(
      request('POST', { body: { legacyCategory: 'Telhas', sectorId: 'setor_telhas' }, token: null }),
    )

    expect(response.status).toBe(401)
    expect(mocks.mappings).toHaveLength(0)
  })

  it('responde 401 na alteração sem token e não audita', async () => {
    seedMapping()

    const response = await PATCH(request('PATCH', { body: { id: 'map_1', sectorId: 'setor_b' }, token: null }))

    expect(response.status).toBe(401)
    expect(mocks.audits).toHaveLength(0)
  })
})
