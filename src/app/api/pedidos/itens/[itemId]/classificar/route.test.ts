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
  const activities: Array<{ id: string; orderItemId: string; sectorId: string }> = []
  const contador = { actSeq: 0 }

  function reset() {
    items.length = 0
    sectors.length = 0
    mappings.length = 0
    audits.length = 0
    activities.length = 0
    contador.actSeq = 0
  }

  return { items, sectors, mappings, audits, activities, contador, now: NOW, perfis, reset }
})

vi.mock(
  '../../../../../../modules/setores/adapters/prisma-unidade-trabalho-classificacao',
  async () => {
    const domain = await import('../../../../../../modules/setores/classificar-item')

    const prismaUnidadeTrabalhoClassificacao = {
      async transacional(
        fn: (escopo: {
          classificacao: unknown
          mapeamento: unknown
        }) => Promise<unknown>,
      ) {
        const classificacao = {
          async transicionarPendente(itemId: string) {
            const found = mocks.items.find((item) => item.id === itemId)
            if (!found) throw new domain.ItemNaoEncontradoError(itemId)
            if (found.classificationStatus === 'CLASSIFIED') {
              throw new domain.ItemJaClassificadoError(itemId)
            }
          },
          async findItemById(itemId: string) {
            const found = mocks.items.find((item) => item.id === itemId)
            return found ? { ...found } : null
          },
          async findSectorById(sectorId: string) {
            const found = mocks.sectors.find((sector) => sector.id === sectorId)
            return found ? { ...found } : null
          },
          async criarAtividade(itemId: string, sectorId: string) {
            const atividadeExistente = mocks.activities.find(
              (activity) => activity.orderItemId === itemId,
            )
            if (atividadeExistente) throw new domain.ItemJaClassificadoError(itemId)
            const found = mocks.items.find((item) => item.id === itemId)
            if (!found) throw new domain.ItemNaoEncontradoError(itemId)
            found.classificationStatus = 'CLASSIFIED'
            mocks.contador.actSeq += 1
            const activity = { id: `act_${mocks.contador.actSeq}`, orderItemId: itemId, sectorId }
            mocks.activities.push(activity)
            return activity
          },
        }

        const mapeamento = {
          async findByCategory(legacyCategory: string) {
            const found = mocks.mappings.find((mapping) => mapping.legacyCategory === legacyCategory)
            return found ? { ...found } : null
          },
          async findById(id: string) {
            const found = mocks.mappings.find((mapping) => mapping.id === id)
            return found ? { ...found } : null
          },
          async create(input: { legacyCategory: string; sectorId: string }) {
            const created = {
              id: `map_${mocks.mappings.length + 1}`,
              legacyCategory: input.legacyCategory,
              sectorId: input.sectorId,
              status: 'ACTIVE' as const,
              createdAt: mocks.now,
              updatedAt: mocks.now,
            }
            mocks.mappings.push(created)
            return { ...created }
          },
          async update(
            id: string,
            input: { sectorId: string; status: 'ACTIVE' | 'INACTIVE' },
          ) {
            const found = mocks.mappings.find((mapping) => mapping.id === id)
            if (!found) throw new Error('mapeamento não encontrado')
            found.sectorId = input.sectorId
            found.status = input.status
            return { ...found }
          },
          async deactivate(id: string) {
            const found = mocks.mappings.find((mapping) => mapping.id === id)
            if (!found) throw new Error('mapeamento não encontrado')
            found.status = 'INACTIVE'
            return { ...found }
          },
          async recordAudit(entry: Record<string, unknown>) {
            mocks.audits.push(entry)
          },
        }

        return fn({ classificacao, mapeamento })
      },
    }

    return { prismaUnidadeTrabalhoClassificacao }
  },
)

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
    legacyCategory: overrides.legacyCategory !== undefined ? overrides.legacyCategory : 'Telhas',
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

  it('usa a categoria persistida no item e ignora a categoria e a autoria do corpo', async () => {
    seedItem()
    seedSector()

    const response = await POST(
      request('item_1', {
        sectorId: 'setor_telhas',
        legacyCategory: 'Nova Categoria',
        userId: 'user_forjado',
        actorId: 'user_forjado',
      }),
      context('item_1'),
    )

    expect(response.status).toBe(200)
    expect(mocks.mappings).toHaveLength(1)
    expect(mocks.mappings[0]).toMatchObject({
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
    })
    expect(mocks.audits[0]).toMatchObject({
      action: 'CREATE',
      entityType: 'CategorySectorMapping',
      userId: 'user_mgr',
      afterJson: {
        legacyCategory: 'Telhas',
        sectorId: 'setor_telhas',
        status: 'ACTIVE',
      },
    })
  })

  it('não cria mapeamento quando o item não tem categoria, mesmo com categoria no corpo', async () => {
    seedItem({ legacyCategory: null })
    seedSector()

    const response = await POST(
      request('item_1', { sectorId: 'setor_telhas', legacyCategory: 'Nova Categoria' }),
      context('item_1'),
    )

    expect(response.status).toBe(200)
    expect(mocks.mappings).toHaveLength(0)
    expect(mocks.audits).toHaveLength(0)
  })

  it('reutiliza o mapeamento ativo sem alterar o setor', async () => {
    seedItem()
    seedSector()
    seedSector({ id: 'setor_corte' })
    mocks.mappings.push({
      id: 'map_1',
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW,
    })

    const response = await POST(
      request('item_1', { sectorId: 'setor_corte' }),
      context('item_1'),
    )

    expect(response.status).toBe(200)
    expect(mocks.mappings).toHaveLength(1)
    expect(mocks.mappings[0]).toMatchObject({
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
    })
    expect(mocks.audits).toHaveLength(0)
  })

  it('responde 404 quando o item não existe e não cria mapeamento', async () => {
    seedSector()

    const response = await POST(
      request('item_inexistente', { sectorId: 'setor_telhas' }),
      context('item_inexistente'),
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'item_not_found' })
    expect(mocks.mappings).toHaveLength(0)
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
