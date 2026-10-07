import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { AtividadeNaoEncontradaError } from '../producao/registrar-execucao'
import {
  listarOcorrencias,
  type ListarOcorrenciasRepository,
  type OcorrenciaListada,
} from './listar-ocorrencias'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function createRepo(
  seed: { atividades?: string[]; porAtividade?: Record<string, OcorrenciaListada[]> } = {},
): ListarOcorrenciasRepository {
  const atividades = seed.atividades ?? []
  const porAtividade = seed.porAtividade ?? {}
  return {
    async buscarAtividadeParaOcorrencia(atividadeId) {
      return atividades.includes(atividadeId) ? { id: atividadeId } : null
    },
    async listarOcorrencias(atividadeId) {
      return porAtividade[atividadeId] ?? []
    },
  }
}

describe('listarOcorrencias', () => {
  it('retorna tipo, quantidade, motivo, observação e data/hora (OCO-07)', async () => {
    const repo = createRepo({
      atividades: ['act_1'],
      porAtividade: {
        act_1: [
          {
            id: 'oco_1',
            tipo: 'PERDA',
            quantidade: new Prisma.Decimal(2),
            duracaoMin: null,
            motivo: {
              id: 'm1',
              tipo: 'PERDA',
              codigo: 'DEFEITO_CORTE',
              descricao: 'Defeito de corte',
              ativo: true,
            },
            observacao: 'peça trincada',
            occurredAt: NOW,
          },
        ],
      },
    })

    const lista = await listarOcorrencias('act_1', repo)

    expect(lista).toHaveLength(1)
    expect(lista[0].tipo).toBe('PERDA')
    expect(lista[0].quantidade?.toString()).toBe('2')
    expect(lista[0].motivo?.descricao).toBe('Defeito de corte')
    expect(lista[0].observacao).toBe('peça trincada')
    expect(lista[0].occurredAt).toBe(NOW)
  })

  it('retorna motivo nulo quando a ocorrência não exige motivo (OCO-07)', async () => {
    const repo = createRepo({
      atividades: ['act_1'],
      porAtividade: {
        act_1: [
          {
            id: 'oco_1',
            tipo: 'PARADA',
            quantidade: null,
            duracaoMin: null,
            motivo: null,
            observacao: null,
            occurredAt: NOW,
          },
        ],
      },
    })

    const lista = await listarOcorrencias('act_1', repo)

    expect(lista[0].motivo).toBeNull()
    expect(lista[0].observacao).toBeNull()
  })

  it('inclui a duração em minutos de pausa/parada (OCO-12)', async () => {
    const repo = createRepo({
      atividades: ['act_1'],
      porAtividade: {
        act_1: [
          {
            id: 'oco_1',
            tipo: 'PAUSA',
            quantidade: null,
            duracaoMin: 30,
            motivo: null,
            observacao: null,
            occurredAt: NOW,
          },
        ],
      },
    })

    const lista = await listarOcorrencias('act_1', repo)

    expect(lista[0].duracaoMin).toBe(30)
    expect(lista[0].quantidade).toBeNull()
  })

  it('retorna lista vazia quando a atividade não tem ocorrências (OCO-07)', async () => {
    const repo = createRepo({ atividades: ['act_1'] })

    const lista = await listarOcorrencias('act_1', repo)

    expect(lista).toEqual([])
  })

  it('rejeita atividade inexistente (OCO-10)', async () => {
    const repo = createRepo()

    await expect(listarOcorrencias('act_x', repo)).rejects.toBeInstanceOf(
      AtividadeNaoEncontradaError,
    )
  })
})
