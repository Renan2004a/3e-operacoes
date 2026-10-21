import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const NOW = new Date('2026-10-21T12:00:00.000Z')
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
  const atividades: Array<{
    id: string
    itemId: string
    sectorId: string
    status: string
    execucoes: number
    ocorrencias: number
    entregas: number
  }> = []
  const auditorias: Array<Record<string, unknown>> = []

  const correcao = {
    findItemById: async (id: string) => {
      const found = items.find((item) => item.id === id)
      return found ? { ...found } : null
    },
    findSectorById: async (id: string) => {
      const found = sectors.find((sector) => sector.id === id)
      return found ? { ...found } : null
    },
    findActivityByItemId: async (itemId: string) => {
      const found = atividades.find((atividade) => atividade.itemId === itemId)
      return found ? { ...found } : null
    },
    trocarSetorDaAtividade: async (input: {
      atividadeId: string
      setorAnteriorId: string
      sectorId: string
      userId: string
      motivo: string | null
    }) => {
      const found = atividades.find((atividade) => atividade.id === input.atividadeId)
      if (!found) return false
      found.sectorId = input.sectorId
      auditorias.push({ ...input })
      return true
    },
  }

  function reset() {
    items.length = 0
    sectors.length = 0
    atividades.length = 0
    auditorias.length = 0
  }

  return { NOW, items, sectors, atividades, auditorias, correcao, perfis, reset }
})

vi.mock('../../../../../../modules/setores/adapters/prisma-correcao-setor-repository', () => ({
  prismaCorrecaoSetorRepository: mocks.correcao,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { PATCH } from './route'

function seedItem(
  overrides: Partial<{
    id: string
    classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  }> = {},
) {
  mocks.items.push({
    id: overrides.id ?? 'item_1',
    legacyCategory: null,
    classificationStatus: overrides.classificationStatus ?? 'CLASSIFIED',
  })
}

function seedSector(overrides: Partial<{ id: string; active: boolean }> = {}) {
  mocks.sectors.push({
    id: overrides.id ?? 'setor_telhas',
    code: 'TELHAS',
    name: 'Telhas',
    active: overrides.active ?? true,
    createdAt: mocks.NOW,
    updatedAt: mocks.NOW,
  })
}

function seedAtividade(
  overrides: Partial<{
    execucoes: number
    ocorrencias: number
    entregas: number
    status: string
  }> = {},
) {
  mocks.atividades.push({
    id: 'act_1',
    itemId: 'item_1',
    sectorId: 'setor_corte',
    status: overrides.status ?? 'PENDING',
    execucoes: overrides.execucoes ?? 0,
    ocorrencias: overrides.ocorrencias ?? 0,
    entregas: overrides.entregas ?? 0,
  })
}

function request(itemId: string, body: unknown, opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_vendedor' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request(`http://localhost/api/pedidos/itens/${itemId}/setor`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function context(itemId: string) {
  return { params: Promise.resolve({ itemId }) }
}

describe('PATCH /api/pedidos/itens/[itemId]/setor', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_vendedor = ['SELLER']
    mocks.perfis.user_gerente = ['PRODUCTION_MANAGER']
    mocks.perfis.user_sistema = ['SYSTEM_RESPONSIBLE']
    mocks.perfis.user_operador = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 e permite ao vendedor corrigir o setor sem motivo', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(request('item_1', { sectorId: 'setor_telhas' }), context('item_1'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'CLASSIFIED',
      sectorId: 'setor_telhas',
      activityId: 'act_1',
      alterado: true,
    })
    expect(mocks.atividades[0].sectorId).toBe('setor_telhas')
    expect(mocks.auditorias[0]).toMatchObject({ userId: 'user_vendedor', motivo: null })
  })

  it('responde 400 quando gerente corrige sem motivo', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(
      request('item_1', { sectorId: 'setor_telhas' }, { usuarioId: 'user_gerente' }),
      context('item_1'),
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('reason_required')
    expect(mocks.atividades[0].sectorId).toBe('setor_corte')
  })

  it('responde 200 quando gerente corrige com motivo e registra o motivo', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(
      request(
        'item_1',
        { sectorId: 'setor_telhas', motivo: 'Cadastro do produto estava errado' },
        { usuarioId: 'user_gerente' },
      ),
      context('item_1'),
    )

    expect(response.status).toBe(200)
    expect(mocks.auditorias[0]).toMatchObject({
      userId: 'user_gerente',
      motivo: 'Cadastro do produto estava errado',
    })
  })

  it('responde 200 quando responsável pelo sistema corrige com motivo', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(
      request(
        'item_1',
        { sectorId: 'setor_telhas', motivo: 'Ajuste administrativo' },
        { usuarioId: 'user_sistema' },
      ),
      context('item_1'),
    )

    expect(response.status).toBe(200)
  })

  it('responde 409 quando o item tem registros operacionais', async () => {
    seedItem()
    seedSector()
    seedAtividade({ execucoes: 2 })

    const response = await PATCH(request('item_1', { sectorId: 'setor_telhas' }), context('item_1'))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('operational_records')
    expect(mocks.atividades[0].sectorId).toBe('setor_corte')
  })

  it('responde 409 quando o item ainda não foi desmembrado', async () => {
    seedItem({ classificationStatus: 'PENDING_CLASSIFICATION' })
    seedSector()

    const response = await PATCH(request('item_1', { sectorId: 'setor_telhas' }), context('item_1'))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('item_not_classified')
  })

  it('responde 400 quando o setor está inativo ou não existe', async () => {
    seedItem()
    seedSector({ id: 'setor_inativo', active: false })
    seedAtividade()

    const inativo = await PATCH(request('item_1', { sectorId: 'setor_inativo' }), context('item_1'))
    const inexistente = await PATCH(
      request('item_1', { sectorId: 'inexistente' }),
      context('item_1'),
    )

    expect(inativo.status).toBe(400)
    expect(inexistente.status).toBe(400)
    expect((await inativo.json()).error).toBe('invalid_sector')
    expect(mocks.atividades[0].sectorId).toBe('setor_corte')
  })

  it('responde 404 quando o item não existe', async () => {
    seedSector()

    const response = await PATCH(request('item_x', { sectorId: 'setor_telhas' }), context('item_x'))

    expect(response.status).toBe(404)
  })

  it('responde 400 quando o corpo não tem sectorId', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(request('item_1', {}), context('item_1'))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_body')
  })

  it('responde 401 sem sessão e não altera o setor', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(
      request('item_1', { sectorId: 'setor_telhas' }, { usuarioId: null }),
      context('item_1'),
    )

    expect(response.status).toBe(401)
    expect(mocks.atividades[0].sectorId).toBe('setor_corte')
  })

  it('responde 403 quando o perfil não pode corrigir setor', async () => {
    seedItem()
    seedSector()
    seedAtividade()

    const response = await PATCH(
      request('item_1', { sectorId: 'setor_telhas' }, { usuarioId: 'user_operador' }),
      context('item_1'),
    )

    expect(response.status).toBe(403)
    expect(mocks.atividades[0].sectorId).toBe('setor_corte')
  })
})
