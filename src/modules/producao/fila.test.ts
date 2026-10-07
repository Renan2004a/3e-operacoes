import { describe, expect, it } from 'vitest'
import { listarFila, type Atividade, type FilaRepository } from './fila'

function atividade(
  overrides: Partial<Atividade> & Pick<Atividade, 'id' | 'sectorId'>,
): Atividade {
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

function createDeps(seed: {
  setores?: Record<string, string[]>
  atividades?: Atividade[]
}) {
  const setoresPorUsuario = seed.setores ?? {}
  const atividades = [...(seed.atividades ?? [])]
  const setoresConsultados: string[][] = []

  const repo: FilaRepository = {
    async listarSetoresDoUsuario(usuarioId) {
      return [...(setoresPorUsuario[usuarioId] ?? [])]
    },
    async listarAtividadesPorSetores(sectorIds) {
      setoresConsultados.push(sectorIds)
      return atividades
        .filter((candidate) => sectorIds.includes(candidate.sectorId))
        .map((candidate) => ({ ...candidate }))
    },
  }

  return { repo, setoresConsultados }
}

describe('listarFila', () => {
  it('retorna apenas as atividades dos setores do usuário', async () => {
    const { repo } = createDeps({
      setores: { user_1: ['setor_telhas'] },
      atividades: [
        atividade({ id: 'act_telha', sectorId: 'setor_telhas' }),
        atividade({ id: 'act_corte', sectorId: 'setor_corte' }),
      ],
    })

    const fila = await listarFila('user_1', repo)

    expect(fila.map((item) => item.id)).toEqual(['act_telha'])
  })

  it('retorna atividades de todos os setores do usuário', async () => {
    const { repo } = createDeps({
      setores: { user_1: ['setor_telhas', 'setor_revenda'] },
      atividades: [
        atividade({ id: 'act_telha', sectorId: 'setor_telhas' }),
        atividade({ id: 'act_revenda', sectorId: 'setor_revenda' }),
        atividade({ id: 'act_corte', sectorId: 'setor_corte' }),
      ],
    })

    const fila = await listarFila('user_1', repo)

    expect(fila.map((item) => item.id).sort()).toEqual(['act_revenda', 'act_telha'])
  })

  it('ordena por prioridade decrescente', async () => {
    const { repo } = createDeps({
      setores: { user_1: ['setor_telhas'] },
      atividades: [
        atividade({ id: 'act_baixa', sectorId: 'setor_telhas', priority: 1 }),
        atividade({ id: 'act_alta', sectorId: 'setor_telhas', priority: 5 }),
        atividade({ id: 'act_media', sectorId: 'setor_telhas', priority: 3 }),
      ],
    })

    const fila = await listarFila('user_1', repo)

    expect(fila.map((item) => item.id)).toEqual(['act_alta', 'act_media', 'act_baixa'])
  })

  it('desempata por data de criação ascendente', async () => {
    const { repo } = createDeps({
      setores: { user_1: ['setor_telhas'] },
      atividades: [
        atividade({
          id: 'act_nova',
          sectorId: 'setor_telhas',
          priority: 2,
          createdAt: new Date('2026-10-07T13:00:00.000Z'),
        }),
        atividade({
          id: 'act_antiga',
          sectorId: 'setor_telhas',
          priority: 2,
          createdAt: new Date('2026-10-07T11:00:00.000Z'),
        }),
      ],
    })

    const fila = await listarFila('user_1', repo)

    expect(fila.map((item) => item.id)).toEqual(['act_antiga', 'act_nova'])
  })

  it('prioridade tem precedência sobre a data de criação', async () => {
    const { repo } = createDeps({
      setores: { user_1: ['setor_telhas'] },
      atividades: [
        atividade({
          id: 'act_antiga_alta',
          sectorId: 'setor_telhas',
          priority: 9,
          createdAt: new Date('2026-10-07T10:00:00.000Z'),
        }),
        atividade({
          id: 'act_nova_baixa',
          sectorId: 'setor_telhas',
          priority: 0,
          createdAt: new Date('2026-10-07T14:00:00.000Z'),
        }),
      ],
    })

    const fila = await listarFila('user_1', repo)

    expect(fila.map((item) => item.id)).toEqual(['act_antiga_alta', 'act_nova_baixa'])
  })

  it('retorna lista vazia quando o usuário não pertence a nenhum setor', async () => {
    const { repo, setoresConsultados } = createDeps({
      setores: { user_1: [] },
      atividades: [atividade({ id: 'act_telha', sectorId: 'setor_telhas' })],
    })

    const fila = await listarFila('user_1', repo)

    expect(fila).toEqual([])
    expect(setoresConsultados).toHaveLength(0)
  })
})
