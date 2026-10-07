import { describe, expect, it } from 'vitest'
import {
  CodigoSetorInvalidoError,
  SetorJaExisteError,
  criarSetor,
  inativarSetor,
  listarSetores,
  type Sector,
  type SectorRepository,
} from './gerenciar-setores'

function sector(overrides: Partial<Sector> & Pick<Sector, 'code'>): Sector {
  const base: Sector = {
    id: 'sector_1',
    code: overrides.code,
    name: overrides.code,
    active: true,
    createdAt: new Date('2026-10-07T12:00:00.000Z'),
    updatedAt: new Date('2026-10-07T12:00:00.000Z'),
  }
  return { ...base, ...overrides }
}

function createFakeRepo(seed: Sector[] = []) {
  const sectors = [...seed]
  let seq = seed.length

  const repo: SectorRepository = {
    async findByCode(code) {
      return sectors.find((candidate) => candidate.code === code) ?? null
    },
    async listActive() {
      return sectors.filter((candidate) => candidate.active)
    },
    async create({ code, name }) {
      seq += 1
      const now = new Date()
      const created: Sector = {
        id: `sector_${seq}`,
        code,
        name,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      sectors.push(created)
      return created
    },
    async deactivate(id) {
      const found = sectors.find((candidate) => candidate.id === id)
      if (!found) throw new Error('setor não encontrado')
      found.active = false
      return found
    },
  }

  return { repo, sectors }
}

describe('criarSetor', () => {
  it('cria um setor ativo com o código e o nome informados', async () => {
    const { repo, sectors } = createFakeRepo()

    const created = await criarSetor({ code: 'TELHAS', name: 'Telhas' }, repo)

    expect(created.active).toBe(true)
    expect(created.code).toBe('TELHAS')
    expect(created.name).toBe('Telhas')
    expect(sectors).toHaveLength(1)
  })

  it('rejeita código vazio', async () => {
    const { repo } = createFakeRepo()

    await expect(criarSetor({ code: '', name: 'Telhas' }, repo)).rejects.toBeInstanceOf(
      CodigoSetorInvalidoError,
    )
  })

  it('rejeita código só com espaços', async () => {
    const { repo } = createFakeRepo()

    await expect(criarSetor({ code: '   ', name: 'Telhas' }, repo)).rejects.toBeInstanceOf(
      CodigoSetorInvalidoError,
    )
  })

  it('rejeita código já existente com conflito', async () => {
    const { repo } = createFakeRepo([sector({ code: 'TELHAS' })])

    await expect(criarSetor({ code: 'TELHAS', name: 'Telhas' }, repo)).rejects.toBeInstanceOf(
      SetorJaExisteError,
    )
  })

  it('rejeita código já existente mesmo quando o setor está inativo', async () => {
    const { repo } = createFakeRepo([sector({ code: 'TELHAS', active: false })])

    await expect(criarSetor({ code: 'TELHAS', name: 'Telhas' }, repo)).rejects.toBeInstanceOf(
      SetorJaExisteError,
    )
  })
})

describe('listarSetores', () => {
  it('retorna apenas setores ativos', async () => {
    const { repo } = createFakeRepo([
      sector({ id: 'ativo', code: 'TELHAS' }),
      sector({ id: 'inativo', code: 'REVENDA', active: false }),
    ])

    const result = await listarSetores(repo)

    expect(result.map((item) => item.id)).toEqual(['ativo'])
  })
})

describe('inativarSetor', () => {
  it('marca o setor como inativo sem apagá-lo', async () => {
    const { repo, sectors } = createFakeRepo([sector({ id: 'sector_1', code: 'TELHAS' })])

    const result = await inativarSetor('sector_1', repo)

    expect(result.active).toBe(false)
    expect(sectors).toHaveLength(1)
    expect(sectors[0].id).toBe('sector_1')
  })
})
