import { describe, expect, it } from 'vitest'
import type { Sector } from './gerenciar-setores'
import type { CategorySectorMapping, MapeamentoAudit, MapeamentoRepository } from './mapeamento'
import {
  ItemJaClassificadoError,
  SetorInvalidoError,
  classificarItem,
  classificarPorMapeamento,
  type ActivityCriada,
  type ClassificacaoRepository,
  type ItemParaClassificar,
} from './classificar-item'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function itemState(
  overrides: Partial<ItemParaClassificar> & Pick<ItemParaClassificar, 'id'>,
): ItemParaClassificar {
  return {
    id: overrides.id,
    legacyCategory: null,
    classificationStatus: 'PENDING_CLASSIFICATION',
    ...overrides,
  }
}

function sector(overrides: Partial<Sector> & Pick<Sector, 'id'>): Sector {
  return {
    id: overrides.id,
    code: 'TELHAS',
    name: 'Telhas',
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function mapping(
  overrides: Partial<CategorySectorMapping> & Pick<CategorySectorMapping, 'legacyCategory'>,
): CategorySectorMapping {
  return {
    id: 'map_1',
    legacyCategory: overrides.legacyCategory,
    sectorId: 'setor_telhas',
    status: 'ACTIVE',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function createDeps(
  seed: {
    items?: ItemParaClassificar[]
    sectors?: Sector[]
    mappings?: CategorySectorMapping[]
  } = {},
) {
  const itemStore = (seed.items ?? []).map((item) => ({ ...item }))
  const sectorStore = [...(seed.sectors ?? [])]
  const mappingStore = [...(seed.mappings ?? [])]
  const activities: ActivityCriada[] = []
  const audits: MapeamentoAudit[] = []
  let seq = 0

  const classificacao: ClassificacaoRepository = {
    async findItemById(id) {
      const found = itemStore.find((candidate) => candidate.id === id)
      return found ? { ...found } : null
    },
    async findSectorById(id) {
      const found = sectorStore.find((candidate) => candidate.id === id)
      return found ? { ...found } : null
    },
    async markClassified({ itemId, sectorId }) {
      const found = itemStore.find((candidate) => candidate.id === itemId)
      if (!found) throw new Error('item não encontrado')
      found.classificationStatus = 'CLASSIFIED'
      seq += 1
      const activity: ActivityCriada = { id: `act_${seq}`, orderItemId: itemId, sectorId }
      activities.push(activity)
      return activity
    },
  }

  const mapeamento: MapeamentoRepository = {
    async findByCategory(legacyCategory) {
      const found = mappingStore.find((candidate) => candidate.legacyCategory === legacyCategory)
      return found ? { ...found } : null
    },
    async findById(id) {
      const found = mappingStore.find((candidate) => candidate.id === id)
      return found ? { ...found } : null
    },
    async create({ legacyCategory, sectorId }) {
      seq += 1
      const created: CategorySectorMapping = {
        id: `map_${seq}`,
        legacyCategory,
        sectorId,
        status: 'ACTIVE',
        createdAt: NOW,
        updatedAt: NOW,
      }
      mappingStore.push(created)
      return { ...created }
    },
    async update(id, { sectorId, status }) {
      const found = mappingStore.find((candidate) => candidate.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.sectorId = sectorId
      found.status = status
      return { ...found }
    },
    async deactivate(id) {
      const found = mappingStore.find((candidate) => candidate.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.status = 'INACTIVE'
      return { ...found }
    },
    async recordAudit(entry) {
      audits.push(entry)
    },
  }

  return {
    deps: { classificacao, mapeamento },
    itemStore,
    sectorStore,
    mappingStore,
    activities,
    audits,
  }
}

describe('classificarPorMapeamento', () => {
  it('classifica o item no setor do mapeamento ativo e cria a atividade', async () => {
    const { deps, itemStore, activities } = createDeps({
      items: [itemState({ id: 'item_1', legacyCategory: 'Telhas' })],
      mappings: [mapping({ legacyCategory: 'Telhas', sectorId: 'setor_telhas' })],
    })

    const result = await classificarPorMapeamento('item_1', deps)

    expect(result.status).toBe('CLASSIFIED')
    expect(result.sectorId).toBe('setor_telhas')
    expect(result.activityId).toBe('act_1')
    expect(itemStore[0].classificationStatus).toBe('CLASSIFIED')
    expect(activities).toEqual([{ id: 'act_1', orderItemId: 'item_1', sectorId: 'setor_telhas' }])
  })

  it('mantém o item pendente quando a categoria não tem mapeamento', async () => {
    const { deps, itemStore, activities } = createDeps({
      items: [itemState({ id: 'item_1', legacyCategory: 'Telhas' })],
    })

    const result = await classificarPorMapeamento('item_1', deps)

    expect(result.status).toBe('PENDING_CLASSIFICATION')
    expect(result.activityId).toBeNull()
    expect(itemStore[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
    expect(activities).toHaveLength(0)
  })

  it('mantém o item pendente quando a categoria é nula', async () => {
    const { deps, itemStore } = createDeps({
      items: [itemState({ id: 'item_1', legacyCategory: null })],
    })

    const result = await classificarPorMapeamento('item_1', deps)

    expect(result.status).toBe('PENDING_CLASSIFICATION')
    expect(itemStore[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('rejeita com conflito quando o item já está classificado', async () => {
    const { deps } = createDeps({
      items: [itemState({ id: 'item_1', classificationStatus: 'CLASSIFIED' })],
    })

    await expect(classificarPorMapeamento('item_1', deps)).rejects.toBeInstanceOf(
      ItemJaClassificadoError,
    )
  })
})

describe('classificarItem', () => {
  it('classifica manualmente no setor informado e cria a atividade', async () => {
    const { deps, itemStore, activities } = createDeps({
      items: [itemState({ id: 'item_1' })],
      sectors: [sector({ id: 'setor_telhas', active: true })],
    })

    const result = await classificarItem(
      { itemId: 'item_1', sectorId: 'setor_telhas', userId: 'user_1' },
      deps,
    )

    expect(result.status).toBe('CLASSIFIED')
    expect(result.sectorId).toBe('setor_telhas')
    expect(itemStore[0].classificationStatus).toBe('CLASSIFIED')
    expect(activities).toEqual([{ id: 'act_1', orderItemId: 'item_1', sectorId: 'setor_telhas' }])
  })

  it('cria o mapeamento quando a classificação manual informa a categoria', async () => {
    const { deps, mappingStore, audits } = createDeps({
      items: [itemState({ id: 'item_1' })],
      sectors: [sector({ id: 'setor_telhas', active: true })],
    })

    await classificarItem(
      { itemId: 'item_1', sectorId: 'setor_telhas', legacyCategory: 'Telhas', userId: 'user_1' },
      deps,
    )

    expect(mappingStore).toHaveLength(1)
    expect(mappingStore[0].legacyCategory).toBe('Telhas')
    expect(mappingStore[0].sectorId).toBe('setor_telhas')
    expect(audits[0].action).toBe('CREATE')
  })

  it('rejeita a classificação quando o setor está inativo', async () => {
    const { deps, itemStore } = createDeps({
      items: [itemState({ id: 'item_1' })],
      sectors: [sector({ id: 'setor_telhas', active: false })],
    })

    await expect(
      classificarItem({ itemId: 'item_1', sectorId: 'setor_telhas' }, deps),
    ).rejects.toBeInstanceOf(SetorInvalidoError)
    expect(itemStore[0].classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('rejeita a classificação quando o setor não existe', async () => {
    const { deps } = createDeps({ items: [itemState({ id: 'item_1' })] })

    await expect(
      classificarItem({ itemId: 'item_1', sectorId: 'inexistente' }, deps),
    ).rejects.toBeInstanceOf(SetorInvalidoError)
  })

  it('rejeita com conflito quando o item já está classificado', async () => {
    const { deps } = createDeps({
      items: [itemState({ id: 'item_1', classificationStatus: 'CLASSIFIED' })],
      sectors: [sector({ id: 'setor_telhas', active: true })],
    })

    await expect(
      classificarItem({ itemId: 'item_1', sectorId: 'setor_telhas' }, deps),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)
  })
})
