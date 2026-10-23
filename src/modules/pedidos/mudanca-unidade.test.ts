import { describe, expect, it } from 'vitest'
import { avaliarMudancaUnidade, type RegistrosOperacionaisDoItem } from './mudanca-unidade'

const semRegistros: RegistrosOperacionaisDoItem = { atividades: [], entregas: 0 }

describe('avaliarMudancaUnidade', () => {
  it('reconhece diferença apenas de escrita sem bloquear', () => {
    expect(
      avaliarMudancaUnidade({
        unidadeAtual: 'm',
        unidadeNova: ' M ',
        registros: {
          atividades: [{ status: 'COMPLETED', execucoes: 1, ocorrencias: 0 }],
          entregas: 1,
        },
      }),
    ).toEqual({ tipo: 'SEM_MUDANCA' })
  })

  it('atualiza unidade real quando não há registros operacionais', () => {
    expect(
      avaliarMudancaUnidade({ unidadeAtual: 'UN', unidadeNova: 'M', registros: semRegistros }),
    ).toEqual({ tipo: 'ATUALIZAR' })
  })

  it('permite atualizar com atividade apenas pendente e sem lançamentos', () => {
    expect(
      avaliarMudancaUnidade({
        unidadeAtual: 'UN',
        unidadeNova: 'M',
        registros: {
          atividades: [{ status: 'PENDING', execucoes: 0, ocorrencias: 0 }],
          entregas: 0,
        },
      }),
    ).toEqual({ tipo: 'ATUALIZAR' })
  })

  it('bloqueia quando existe execução', () => {
    expect(
      avaliarMudancaUnidade({
        unidadeAtual: 'UN',
        unidadeNova: 'M',
        registros: {
          atividades: [{ status: 'IN_PROGRESS', execucoes: 2, ocorrencias: 0 }],
          entregas: 0,
        },
      }),
    ).toEqual({ tipo: 'BLOQUEAR', motivo: 'REGISTROS_OPERACIONAIS' })
  })

  it('bloqueia quando existe ocorrência, mesmo sem execução', () => {
    expect(
      avaliarMudancaUnidade({
        unidadeAtual: 'UN',
        unidadeNova: 'M',
        registros: {
          atividades: [{ status: 'PENDING', execucoes: 0, ocorrencias: 1 }],
          entregas: 0,
        },
      }),
    ).toEqual({ tipo: 'BLOQUEAR', motivo: 'REGISTROS_OPERACIONAIS' })
  })

  it('bloqueia quando existe entrega', () => {
    expect(
      avaliarMudancaUnidade({
        unidadeAtual: 'UN',
        unidadeNova: 'M',
        registros: { atividades: [], entregas: 1 },
      }),
    ).toEqual({ tipo: 'BLOQUEAR', motivo: 'REGISTROS_OPERACIONAIS' })
  })

  it('bloqueia quando existe remessa programada', () => {
    expect(
      avaliarMudancaUnidade({
        unidadeAtual: 'UN',
        unidadeNova: 'M',
        registros: { atividades: [], entregas: 0, remessas: 1 },
      }),
    ).toEqual({ tipo: 'BLOQUEAR', motivo: 'REGISTROS_OPERACIONAIS' })
  })

  it('bloqueia quando a atividade já foi iniciada ou concluída', () => {
    for (const status of ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'DIVERGENT']) {
      expect(
        avaliarMudancaUnidade({
          unidadeAtual: 'UN',
          unidadeNova: 'M',
          registros: { atividades: [{ status, execucoes: 0, ocorrencias: 0 }], entregas: 0 },
        }),
      ).toEqual({ tipo: 'BLOQUEAR', motivo: 'REGISTROS_OPERACIONAIS' })
    }
  })

  it('trata unidade vazia como valor próprio, sem inventar equivalência', () => {
    expect(
      avaliarMudancaUnidade({ unidadeAtual: '', unidadeNova: 'UN', registros: semRegistros }),
    ).toEqual({ tipo: 'ATUALIZAR' })
  })
})
