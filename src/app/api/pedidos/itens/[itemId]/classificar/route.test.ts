import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const NOW = new Date('2026-10-07T12:00:00.000Z')
  const perfis: Record<string, RoleCode[]> = {}
  const items: Array<{
    id: string
    legacyCategory: string | null
    classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  }> = []
  const sectors: Array<{
    id: string
    code: string
    name: string
    active: boolean
    createdAt: Date
    updatedAt: Date
  }> = []
  const mappings: Array<{
    id: string
    legacyCategory: string
    sectorId: string
    status: 'ACTIVE' | 'INACTIVE'
    createdAt: Date
    updatedAt: Date
  }> = []
  const audits: Array<Record<string, unknown>> = []
  let actSeq = 0

  const classificacao = {
    findItemById: async (id: string) => {
      const found = items.find((item) => item.id === id)
      return found ? { ...found } : null
    },
    findSectorById: async (id: string) => {
      const found = sectors.find((sector) => sector.id === id)
      return found ? { ...found } : null
    },
    markClassified: async ({ itemId, sectorId }: { itemId: string; sectorId: string }) => {
      const found = items.find((item) => item.id === itemId)
      if (!found) throw new Error('item não encontrado')
      found.classificationStatus = 'CLASSIFIED'
      actSeq += 1
      return { id: `act_${actSeq}`, orderItemId: itemId, sectorId }
    },
  }

  const mapeamento = {
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
    items.length = 0
    sectors.length = 0
    mappings.length = 0
    audits.length = 0
    actSeq = 0
  }

  return { items, sectors, mappings, audits, classificacao, mapeamento, perfis, reset }
})

vi.mock('../../../../../../modules/setores/adapters/prisma-classificacao-repository', () => ({
  prismaClassificacaoRepository: mocks.classificacao,
}))

vi.mock('../../../../../../modules/setores/adapters/prisma-setores-repository', () => ({
  prismaMapeamentoRepository: mocks.mapeamento,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { POST } from './route'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function seedItem(
  overrides: Partial<{
    id: string
    legacyCategory: string | null
    classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  }> = {},
) {
  mocks.items.push({
    id: overrides.id ?? 'item_1',
    legacyCategory: overrides.legacyCategory ?? 'Telhas',
    classificationStatus: overrides.classificationStatus ?? 'PENDING_CLASSIFICATION',
  })
}

function seedSector(overrides: Partial<{ id: string; active: boolean }> = {}) {
  mocks.sectors.push({
    id: overrides.id ?? 'setor_telhas',
    code: 'TELHAS',
    name: 'Telhas',
    active: overrides.active ?? true,
    createdAt: NOW,
    updatedAt: NOW,
  })
}

function request(
  itemId: string,
  body: unknown,
  opts: { usuarioId?: string | null; xUserId?: string | null } = {},
): Request {
  const { usuarioId = 'user_mgr', xUserId = null } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request(`http://localhost/api/pedidos/itens/${itemId}/classificar`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function context(itemId: string) {
  return { params: Promise.resolve({ itemId }) }
}

describe('POST /api/pedidos/itens/[itemId]/classificar', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
    mocks.perfis.user_system = ['SYSTEM_RESPONSIBLE']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 e classifica o item no setor informado', async () => {
    seedItem()
    seedSector()

    const response = await POST(request('item_1', { sectorId: 'setor_telhas' }), context('item_1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'CLASSIFIED',
      sectorId: 'setor_telhas',
      activityId: 'act_1',
    })
    expect(mocks.items[0].classificationStatus).toBe('CLASSIFIED')
  })

  it('responde 200 e cria o mapeamento quando a categoria é informada', async () => {
    seedItem()
    seedSector()

    const response = await POST(
      request('item_1', { sectorId: 'setor_telhas', legacyCategory: 'Nova Categoria' }),
      context('item_1'),
    )

    expect(response.status).toBe(200)
    expect(mocks.mappings).toHaveLength(1)
    expect(mocks.mappings[0]).toMatchObject({
      legacyCategory: 'Nova Categoria',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
    })
    expect(mocks.audits[0]).toMatchObject({ action: 'CREATE', entityType: 'CategorySectorMapping' })
  })

  it('responde 409 quando o item já está classificado', async () => {
    seedItem({ classificationStatus: 'CLASSIFIED' })
    seedSector()

    const response = await POST(request('item_1', { sectorId: 'setor_telhas' }), context('item_1'))

    expect(response.status).toBe(409)
    expect(mocks.mappings).toHaveLength(0)
  })

  it('responde 400 quando o setor está inativo', async () => {
    seedItem()
    seedSector({ id: 'setor_inativo', active: false })

    const response = await POST(request('item_1', { sectorId: 'setor_inativo' }), context('item_1'))

    expect(response.status).toBe(400)
    expect(mocks.items[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('responde 400 quando o setor não existe', async () => {
    seedItem()

    const response = await POST(request('item_1', { sectorId: 'inexistente' }), context('item_1'))

    expect(response.status).toBe(400)
    expect(mocks.items[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('responde 401 sem sessão e não classifica (AUTH-14)', async () => {
    seedItem()
    seedSector()

    const response = await POST(
      request('item_1', { sectorId: 'setor_telhas' }, { usuarioId: null }),
      context('item_1'),
    )

    expect(response.status).toBe(401)
    expect(mocks.items[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('ignora o cabeçalho x-user-id quando não há sessão (AUTH-14)', async () => {
    seedItem()
    seedSector()

    const response = await POST(
      request('item_1', { sectorId: 'setor_telhas' }, { usuarioId: null, xUserId: 'user_mgr' }),
      context('item_1'),
    )

    expect(response.status).toBe(401)
    expect(mocks.items[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('responde 403 quando o perfil não pode classificar (AUTH-14)', async () => {
    seedItem()
    seedSector()

    const response = await POST(
      request('item_1', { sectorId: 'setor_telhas' }, { usuarioId: 'user_operador' }),
      context('item_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(mocks.items[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })
})
