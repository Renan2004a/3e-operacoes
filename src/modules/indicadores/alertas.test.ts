import { describe, expect, it } from 'vitest'
import { montarAlertas, type ItemParaAlerta } from './alertas'

function item(overrides: Partial<ItemParaAlerta> = {}): ItemParaAlerta {
  return {
    itemId: 'i1',
    orderId: 'o1',
    orderNumber: '1001',
    itemDescription: 'Telha',
    classificationStatus: 'CLASSIFIED',
    activityId: 'a1',
    activityStatus: 'PENDING',
    sectorName: 'Telhas',
    activityCreatedAt: new Date('2026-01-01T00:00:00Z'),
    deadlineAt: null,
    lastExecutionAt: null,
    ...overrides,
  }
}

const AGORA = new Date('2026-01-10T00:00:00Z')

describe('montarAlertas', () => {
  it('marca atrasado quando o prazo venceu e a atividade não concluiu', () => {
    const resumo = montarAlertas([item({ deadlineAt: new Date('2026-01-05T00:00:00Z') })], AGORA)
    expect(resumo.atrasados).toHaveLength(1)
    expect(resumo.atrasados[0]).toMatchObject({ tipo: 'ATRASADO', orderNumber: '1001' })
  })

  it('não marca atrasado quando a atividade já concluiu', () => {
    const resumo = montarAlertas(
      [item({ deadlineAt: new Date('2026-01-05T00:00:00Z'), activityStatus: 'COMPLETED' })],
      AGORA,
    )
    expect(resumo.atrasados).toHaveLength(0)
  })

  it('marca parado quando não há movimentação há N dias', () => {
    const resumo = montarAlertas([item()], AGORA, 5)
    expect(resumo.parados).toHaveLength(1)
    expect(resumo.parados[0].detail).toContain('9 dia')
  })

  it('não marca parado quando há execução recente', () => {
    const resumo = montarAlertas(
      [item({ lastExecutionAt: new Date('2026-01-09T00:00:00Z') })],
      AGORA,
      5,
    )
    expect(resumo.parados).toHaveLength(0)
  })

  it('não marca parado quando a atividade concluiu', () => {
    const resumo = montarAlertas([item({ activityStatus: 'COMPLETED' })], AGORA, 5)
    expect(resumo.parados).toHaveLength(0)
  })

  it('marca não encaminhado para item pendente de desmembramento', () => {
    const resumo = montarAlertas(
      [item({ classificationStatus: 'PENDING_CLASSIFICATION', activityId: null, activityStatus: null })],
      AGORA,
    )
    expect(resumo.naoEncaminhados).toHaveLength(1)
    expect(resumo.naoEncaminhados[0].tipo).toBe('NAO_ENCAMINHADO')
    expect(resumo.atrasados).toHaveLength(0)
  })

  it('marca não encaminhado para item classificado sem atividade no setor', () => {
    const resumo = montarAlertas([item({ activityId: null, activityStatus: null })], AGORA)
    expect(resumo.naoEncaminhados).toHaveLength(1)
  })

  it('um item pode ser atrasado e parado ao mesmo tempo', () => {
    const resumo = montarAlertas([item({ deadlineAt: new Date('2026-01-05T00:00:00Z') })], AGORA)
    expect(resumo.atrasados).toHaveLength(1)
    expect(resumo.parados).toHaveLength(1)
  })
})
