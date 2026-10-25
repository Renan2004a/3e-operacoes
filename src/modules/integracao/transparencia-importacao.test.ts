import { describe, expect, it } from 'vitest'
import {
  codigoDaFalha,
  divergenciasUnidadeDosEventos,
  mensagemDoResultado,
  mensagemEmAndamento,
  sucessoFoiReimportacao,
  temEventoNovo,
  ultimoEvento,
} from './transparencia-importacao'

const AGORA = '2026-10-23T15:00:00.000Z'

describe('eventos de importação', () => {
  it('usa o último evento do tipo, não o primeiro', () => {
    const events = [
      { type: 'FAILED', detail: 'UPSERT_FAILED' },
      { type: 'SUCCEEDED', detail: 'IMPORTED' },
      { type: 'FAILED', detail: 'ORDER_NOT_FOUND' },
    ]
    expect(codigoDaFalha(events)).toBe('ORDER_NOT_FOUND')
  })

  it('identifica reimportação pelo último SUCCEEDED', () => {
    expect(
      sucessoFoiReimportacao([
        { type: 'SUCCEEDED', detail: 'IMPORTED' },
        { type: 'SUCCEEDED', detail: 'REIMPORTED' },
      ]),
    ).toBe(true)
    expect(sucessoFoiReimportacao([{ type: 'SUCCEEDED', detail: 'IMPORTED' }])).toBe(false)
  })

  it('considera evento novo somente a partir da solicitação', () => {
    const events = [
      { type: 'SUCCEEDED', detail: 'IMPORTED', createdAt: '2026-10-23T14:00:00.000Z' },
      { type: 'FAILED', detail: 'ORDER_NOT_FOUND', createdAt: '2026-10-23T15:01:00.000Z' },
    ]
    expect(temEventoNovo(events, 'SUCCEEDED', AGORA)).toBe(false)
    expect(temEventoNovo(events, 'FAILED', AGORA)).toBe(true)
  })

  it('lê divergências de unidade do último evento', () => {
    const divergencias = [
      {
        legacyItemKey: '1',
        description: 'TELHA',
        unidadeAnterior: 'UN',
        unidadeNova: 'M',
        motivo: 'REGISTROS_OPERACIONAIS',
      },
    ]
    const events = [
      { type: 'UNIT_DIVERGENCE', detail: JSON.stringify([]) },
      { type: 'UNIT_DIVERGENCE', detail: JSON.stringify(divergencias) },
    ]
    expect(divergenciasUnidadeDosEventos(events)).toEqual(divergencias)
  })

  it('ignora divergência de unidade de tentativa anterior em consulta nova', () => {
    const antiga = [
      {
        legacyItemKey: '1',
        description: 'TELHA',
        unidadeAnterior: 'UN',
        unidadeNova: 'M',
        motivo: 'REGISTROS_OPERACIONAIS',
      },
    ]
    const events = [
      {
        type: 'UNIT_DIVERGENCE',
        detail: JSON.stringify(antiga),
        createdAt: '2026-10-23T14:00:00.000Z',
      },
      { type: 'SUCCEEDED', detail: 'IMPORTED', createdAt: '2026-10-23T15:01:00.000Z' },
    ]

    expect(divergenciasUnidadeDosEventos(events, AGORA)).toEqual([])
    expect(divergenciasUnidadeDosEventos(events)).toEqual(antiga)
  })

  it('tolera evento de unidade inválido', () => {
    expect(divergenciasUnidadeDosEventos([{ type: 'UNIT_DIVERGENCE', detail: '{' }])).toEqual([])
    expect(divergenciasUnidadeDosEventos(null)).toEqual([])
  })

  it('ultimoEvento devolve null quando não existe', () => {
    expect(ultimoEvento([], 'FAILED')).toBeNull()
  })
})

describe('mensagens de transparência', () => {
  it('não apresenta resultado anterior como nova importação', () => {
    expect(
      mensagemDoResultado({
        origem: 'RESULTADO_ANTERIOR',
        status: 'SUCCEEDED',
        reimportado: false,
      }),
    ).toEqual({
      titulo: 'Resultado de importação anterior',
      mensagem:
        'Nenhuma nova consulta ao Top Gerente foi feita; este é o resultado da importação recente.',
    })
  })

  it('distingue nova importação de atualização de pedido existente', () => {
    expect(
      mensagemDoResultado({ origem: 'NOVA', status: 'SUCCEEDED', reimportado: false }).titulo,
    ).toBe('Importação concluída')
    expect(
      mensagemDoResultado({ origem: 'NOVA', status: 'SUCCEEDED', reimportado: true }).titulo,
    ).toBe('Pedido atualizado')
  })

  it('não atribui nova consulta à tentativa em andamento', () => {
    const mensagem = mensagemDoResultado({
      origem: 'EM_ANDAMENTO',
      status: 'SUCCEEDED',
      reimportado: false,
    })
    expect(mensagem.titulo).toBe('Tentativa em andamento concluída')
    expect(mensagem.mensagem).not.toContain('Top Gerente foi consultado')
  })

  it('distingue falha atual de resultado anterior', () => {
    expect(
      mensagemDoResultado({ origem: 'RESULTADO_ANTERIOR', status: 'FAILED', reimportado: false })
        .titulo,
    ).toBe('Tentativa anterior falhou')
    expect(
      mensagemDoResultado({ origem: 'NOVA', status: 'FAILED', reimportado: false }).titulo,
    ).toBe('Consulta ao Top Gerente falhou')
  })

  it('informa acompanhamento sem prometer nova consulta quando já havia tentativa', () => {
    expect(mensagemEmAndamento('EM_ANDAMENTO').mensagem).toContain('já estava em andamento')
    expect(mensagemEmAndamento('NOVA').titulo).toContain('Consulta')
  })
})
