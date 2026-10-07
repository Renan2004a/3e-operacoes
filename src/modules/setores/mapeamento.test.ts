import { describe, expect, it } from 'vitest'
import {
  CategoriaJaMapeadaError,
  alterarMapeamento,
  criarMapeamento,
  garantirMapeamento,
  inativarMapeamento,
  type CategorySectorMapping,
  type MapeamentoAudit,
  type MapeamentoRepository,
} from './mapeamento'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function mapping(
  overrides: Partial<CategorySectorMapping> & Pick<CategorySectorMapping, 'legacyCategory'>,
): CategorySectorMapping {
  return {
    id: 'map_1',
    legacyCategory: overrides.legacyCategory,
    sectorId: 'setor_a',
    status: 'ACTIVE',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function createFakeRepo(seed: CategorySectorMapping[] = []) {
  const mappings = [...seed]
  const audits: MapeamentoAudit[] = []
  let seq = seed.length

  const repo: MapeamentoRepository = {
    async findByCategory(legacyCategory) {
      const found = mappings.find((candidate) => candidate.legacyCategory === legacyCategory)
      return found ? { ...found } : null
    },
    async findById(id) {
      const found = mappings.find((candidate) => candidate.id === id)
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
      mappings.push(created)
      return { ...created }
    },
    async update(id, { sectorId, status }) {
      const found = mappings.find((candidate) => candidate.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.sectorId = sectorId
      found.status = status
      return { ...found }
    },
    async deactivate(id) {
      const found = mappings.find((candidate) => candidate.id === id)
      if (!found) throw new Error('mapeamento não encontrado')
      found.status = 'INACTIVE'
      return { ...found }
    },
    async recordAudit(entry) {
      audits.push(entry)
    },
  }

  return { repo, mappings, audits }
}

describe('criarMapeamento', () => {
  it('cria um mapeamento ativo e registra auditoria com categoria e setor', async () => {
    const { repo, mappings, audits } = createFakeRepo()

    const created = await criarMapeamento(
      { legacyCategory: 'Telhas', sectorId: 'setor_telhas', userId: 'user_1' },
      repo,
    )

    expect(created.status).toBe('ACTIVE')
    expect(created.legacyCategory).toBe('Telhas')
    expect(created.sectorId).toBe('setor_telhas')
    expect(mappings).toHaveLength(1)
    expect(audits).toHaveLength(1)
    expect(audits[0].action).toBe('CREATE')
    expect(audits[0].entityType).toBe('CategorySectorMapping')
    expect(audits[0].entityId).toBe(created.id)
    expect(audits[0].afterJson).toEqual({
      legacyCategory: 'Telhas',
      sectorId: 'setor_telhas',
      status: 'ACTIVE',
    })
    expect(audits[0].userId).toBe('user_1')
  })

  it('rejeita a criação quando a categoria já tem mapeamento ativo', async () => {
    const { repo } = createFakeRepo([mapping({ legacyCategory: 'Telhas', status: 'ACTIVE' })])

    await expect(
      criarMapeamento({ legacyCategory: 'Telhas', sectorId: 'outro_setor' }, repo),
    ).rejects.toBeInstanceOf(CategoriaJaMapeadaError)
  })

  it('não grava auditoria quando a criação é rejeitada', async () => {
    const { repo, audits } = createFakeRepo([mapping({ legacyCategory: 'Telhas', status: 'ACTIVE' })])

    await expect(
      criarMapeamento({ legacyCategory: 'Telhas', sectorId: 'outro_setor' }, repo),
    ).rejects.toBeInstanceOf(CategoriaJaMapeadaError)

    expect(audits).toHaveLength(0)
  })

  it('reativa um mapeamento inativo reutilizando a mesma linha', async () => {
    const { repo, mappings } = createFakeRepo([
      mapping({ id: 'map_1', legacyCategory: 'Telhas', sectorId: 'setor_a', status: 'INACTIVE' }),
    ])

    const result = await criarMapeamento({ legacyCategory: 'Telhas', sectorId: 'setor_b' }, repo)

    expect(mappings).toHaveLength(1)
    expect(result.id).toBe('map_1')
    expect(result.status).toBe('ACTIVE')
    expect(result.sectorId).toBe('setor_b')
  })
})

describe('alterarMapeamento', () => {
  it('altera o setor e registra antes/depois na auditoria', async () => {
    const { repo, mappings, audits } = createFakeRepo([
      mapping({ id: 'map_1', legacyCategory: 'Telhas', sectorId: 'setor_a' }),
    ])

    const updated = await alterarMapeamento(
      { id: 'map_1', sectorId: 'setor_b', userId: 'user_2' },
      repo,
    )

    expect(updated.sectorId).toBe('setor_b')
    expect(mappings[0].sectorId).toBe('setor_b')
    expect(audits).toHaveLength(1)
    expect(audits[0].action).toBe('UPDATE')
    expect(audits[0].beforeJson).toEqual({ sectorId: 'setor_a', status: 'ACTIVE' })
    expect(audits[0].afterJson).toEqual({ sectorId: 'setor_b', status: 'ACTIVE' })
  })
})

describe('inativarMapeamento', () => {
  it('inativa o mapeamento e registra auditoria', async () => {
    const { repo, mappings, audits } = createFakeRepo([
      mapping({ id: 'map_1', legacyCategory: 'Telhas', sectorId: 'setor_a' }),
    ])

    const result = await inativarMapeamento({ id: 'map_1', userId: 'user_3' }, repo)

    expect(result.status).toBe('INACTIVE')
    expect(mappings[0].status).toBe('INACTIVE')
    expect(audits[0].action).toBe('DEACTIVATE')
    expect(audits[0].afterJson).toEqual({ sectorId: 'setor_a', status: 'INACTIVE' })
  })
})

describe('garantirMapeamento', () => {
  it('reutiliza o mapeamento ativo para a mesma categoria', async () => {
    const { repo, mappings, audits } = createFakeRepo()

    const first = await garantirMapeamento({ legacyCategory: 'Telhas', sectorId: 'setor_a' }, repo)
    const second = await garantirMapeamento({ legacyCategory: 'Telhas', sectorId: 'setor_a' }, repo)

    expect(second.id).toBe(first.id)
    expect(mappings).toHaveLength(1)
    expect(audits).toHaveLength(1)
  })
})
