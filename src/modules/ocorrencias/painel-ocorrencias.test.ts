import { describe, expect, it } from 'vitest'
import { montarResumoOcorrencias, type OcorrenciaDetalhada } from './painel-ocorrencias'

function ocorrencia(overrides: Partial<OcorrenciaDetalhada> = {}): OcorrenciaDetalhada {
  return {
    id: 'o1',
    activityId: 'a1',
    tipo: 'PERDA',
    quantidade: null,
    observacao: null,
    occurredAt: new Date('2026-10-25T12:00:00.000Z'),
    motivo: 'Defeito de corte',
    pedido: '82269',
    item: 'Perfil UE',
    setor: 'Corte e Dobra',
    usuario: 'Operador',
    activityStatus: 'IN_PROGRESS',
    ...overrides,
  }
}

const AGORA = new Date('2026-10-26T12:00:00.000Z')

describe('montarResumoOcorrencias', () => {
  it('conta total, últimos 7 dias e por tipo', () => {
    const resumo = montarResumoOcorrencias(
      [
        ocorrencia({ id: 'o1', occurredAt: new Date('2026-10-25T12:00:00.000Z') }),
        ocorrencia({ id: 'o2', tipo: 'REFUGO', occurredAt: new Date('2026-10-10T12:00:00.000Z') }),
        ocorrencia({ id: 'o3', tipo: 'PARADA', occurredAt: new Date('2026-10-26T12:00:00.000Z') }),
      ],
      AGORA,
    )

    expect(resumo.total).toBe(3)
    expect(resumo.ultimos7Dias).toBe(2)
    expect(resumo.porTipo).toContainEqual({ tipo: 'PERDA', total: 1 })
    expect(resumo.porTipo).toContainEqual({ tipo: 'REFUGO', total: 1 })
    expect(resumo.porTipo).toContainEqual({ tipo: 'PARADA', total: 1 })
    expect(resumo.porTipo).toContainEqual({ tipo: 'DEFEITO', total: 0 })
    expect(resumo.porTipo).toHaveLength(6)
  })

  it('ordena as recentes por data decrescente e limita a quantidade', () => {
    const resumo = montarResumoOcorrencias(
      [
        ocorrencia({ id: 'antiga', occurredAt: new Date('2026-10-01T12:00:00.000Z') }),
        ocorrencia({ id: 'recente', occurredAt: new Date('2026-10-25T12:00:00.000Z') }),
        ocorrencia({ id: 'meio', occurredAt: new Date('2026-10-10T12:00:00.000Z') }),
      ],
      AGORA,
      2,
    )

    expect(resumo.recentes.map((item) => item.id)).toEqual(['recente', 'meio'])
  })

  it('lida com lista vazia', () => {
    const resumo = montarResumoOcorrencias([], AGORA)
    expect(resumo.total).toBe(0)
    expect(resumo.ultimos7Dias).toBe(0)
    expect(resumo.recentes).toEqual([])
    expect(resumo.porTipo.every((item) => item.total === 0)).toBe(true)
  })
})
