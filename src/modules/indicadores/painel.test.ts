import { describe, expect, it } from 'vitest'
import { montarPainel, type AtividadeIndicador, type PainelRepository } from './painel'

function atividade(
  id: string,
  sectorId: string,
  status: AtividadeIndicador['status'],
): AtividadeIndicador {
  return { id, sectorId, status }
}

function createRepo(atividades: AtividadeIndicador[]): PainelRepository {
  return {
    async listarAtividades() {
      return atividades.map((a) => ({ ...a }))
    },
  }
}

describe('montarPainel', () => {
  it('conta as atividades por setor (IND-05)', async () => {
    const repo = createRepo([
      atividade('a1', 'setor_telhas', 'PENDING'),
      atividade('a2', 'setor_telhas', 'COMPLETED'),
      atividade('a3', 'setor_corte', 'IN_PROGRESS'),
    ])

    const painel = await montarPainel(repo)

    expect(painel.porSetor).toEqual([
      { sectorId: 'setor_corte', total: 1 },
      { sectorId: 'setor_telhas', total: 2 },
    ])
  })

  it('conta as atividades por status (IND-05)', async () => {
    const repo = createRepo([
      atividade('a1', 'setor_telhas', 'PENDING'),
      atividade('a2', 'setor_telhas', 'IN_PROGRESS'),
      atividade('a3', 'setor_corte', 'COMPLETED'),
      atividade('a4', 'setor_corte', 'COMPLETED'),
    ])

    const painel = await montarPainel(repo)

    expect(painel.porStatus).toEqual([
      { status: 'PENDING', total: 1 },
      { status: 'IN_PROGRESS', total: 1 },
      { status: 'COMPLETED', total: 2 },
    ])
  })

  it('conta como pendência toda atividade não concluída (IND-06)', async () => {
    const repo = createRepo([
      atividade('a1', 'setor_telhas', 'PENDING'),
      atividade('a2', 'setor_telhas', 'PAUSED'),
      atividade('a3', 'setor_corte', 'COMPLETED'),
    ])

    const painel = await montarPainel(repo)

    expect(painel.pendencias).toBe(2)
  })

  it('retorna contagens vazias e zero pendências sem atividades (IND-05)', async () => {
    const painel = await montarPainel(createRepo([]))

    expect(painel).toEqual({ porSetor: [], porStatus: [], pendencias: 0 })
  })

  it('não conta atividades concluídas como pendência (IND-06)', async () => {
    const repo = createRepo([
      atividade('a1', 'setor_telhas', 'COMPLETED'),
      atividade('a2', 'setor_corte', 'COMPLETED'),
    ])

    const painel = await montarPainel(repo)

    expect(painel.pendencias).toBe(0)
  })
})
