import { describe, expect, it } from 'vitest'
import { listarFila, type Atividade, type FilaRepository } from './fila'
import { AtividadeNaoEncontradaError } from './registrar-execucao'
import { definirPrioridade, type PrioridadeRepository } from './prioridade'

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

function createDeps(atividades: Atividade[]) {
  const store = atividades.map((item) => ({ ...item }))

  const repo: PrioridadeRepository & FilaRepository = {
    async definirPrioridade({ atividadeId, prioridade }) {
      const found = store.find((candidate) => candidate.id === atividadeId)
      if (!found) return null
      found.priority = prioridade
      return { ...found }
    },
    async listarSetoresDoUsuario() {
      return ['setor_telhas']
    },
    async listarAtividadesPorSetores(sectorIds) {
      return store
        .filter((candidate) => sectorIds.includes(candidate.sectorId))
        .map((candidate) => ({ ...candidate }))
    },
  }

  return { repo, store }
}

describe('definirPrioridade', () => {
  it('persiste a prioridade na atividade', async () => {
    const { repo, store } = createDeps([atividade({ id: 'act_1', sectorId: 'setor_telhas' })])

    await definirPrioridade({ atividadeId: 'act_1', prioridade: 7 }, repo)

    expect(store[0].priority).toBe(7)
  })

  it('retorna a atividade atualizada com a nova prioridade', async () => {
    const { repo } = createDeps([atividade({ id: 'act_1', sectorId: 'setor_telhas' })])

    const atualizada = await definirPrioridade({ atividadeId: 'act_1', prioridade: 4 }, repo)

    expect(atualizada.id).toBe('act_1')
    expect(atualizada.priority).toBe(4)
  })

  it('rejeita atividade inexistente sem alterar o estado', async () => {
    const { repo, store } = createDeps([atividade({ id: 'act_1', sectorId: 'setor_telhas' })])

    await expect(
      definirPrioridade({ atividadeId: 'act_x', prioridade: 9 }, repo),
    ).rejects.toBeInstanceOf(AtividadeNaoEncontradaError)
    expect(store[0].priority).toBe(0)
  })

  it('reflete a prioridade definida na ordenação da fila', async () => {
    const { repo } = createDeps([
      atividade({ id: 'act_a', sectorId: 'setor_telhas', priority: 1 }),
      atividade({ id: 'act_b', sectorId: 'setor_telhas', priority: 2 }),
    ])

    await definirPrioridade({ atividadeId: 'act_a', prioridade: 10 }, repo)
    const fila = await listarFila('user_1', repo)

    expect(fila.map((item) => item.id)).toEqual(['act_a', 'act_b'])
  })
})
