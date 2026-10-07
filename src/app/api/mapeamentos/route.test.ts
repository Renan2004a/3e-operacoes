import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleCode } from '@/generated/prisma/client'
import { assinarSessao } from '../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

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
  const perfis: Record<string, RoleCode[]> = {}

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
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return { mappings, audits, repo, reset, perfis }
})

vi.mock('../../../modules/setores/adapters/prisma-setores-repository', () => ({
  prismaMapeamentoRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET, PATCH, POST } from './route'

function request(
  method: 'GET' | 'POST' | 'PATCH',
  options: { body?: unknown; usuarioId?: string | null; query?: string } = {},
): Request {
  const { usuarioId = 'user_admin' } = options
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request(`http://localhost/api/mapeamentos${options.query ?? ''}`, {
    method,
    headers,
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
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_admin = ['SYSTEM_RESPONSIBLE']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
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

  it('responde 400 no GET sem o parâmetro category', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'invalid_category' })
  })

  it('responde 404 no GET quando a categoria não tem mapeamento', async () => {
    const response = await GET(request('GET', { query: '?category=Inexistente' }))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'mapping_not_found' })
  })

  it('responde 401 no GET sem sessão', async () => {
    seedMapping()

    const response = await GET(request('GET', { query: '?category=Telhas', usuarioId: null }))

    expect(response.status).toBe(401)
  })

  it('responde 401 na criação sem sessão e não persiste', async () => {
    const response = await POST(
      request('POST', { body: { legacyCategory: 'Telhas', sectorId: 'setor_telhas' }, usuarioId: null }),
    )

    expect(response.status).toBe(401)
    expect(mocks.mappings).toHaveLength(0)
  })

  it('responde 401 na alteração sem sessão e não audita', async () => {
    seedMapping()

    const response = await PATCH(
      request('PATCH', { body: { id: 'map_1', sectorId: 'setor_b' }, usuarioId: null }),
    )

    expect(response.status).toBe(401)
    expect(mocks.audits).toHaveLength(0)
  })

  it('responde 403 na criação sem perfil autorizado', async () => {
    mocks.perfis.user_vendedor = ['SELLER']

    const response = await POST(
      request('POST', {
        body: { legacyCategory: 'Telhas', sectorId: 'setor_telhas' },
        usuarioId: 'user_vendedor',
      }),
    )

    expect(response.status).toBe(403)
    expect(mocks.mappings).toHaveLength(0)
  })
})
