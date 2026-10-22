import { describe, expect, it } from 'vitest'
import { diaCivilParaInput, formatarDiaCivil } from './dia-civil'

describe('diaCivilParaInput', () => {
  it('mantém o dia informado para um prazo no fim do dia em São Paulo (D2)', () => {
    // 23:59:59.999 de 01/02/2026 em São Paulo (UTC-03) = 02/02 02:59:59.999Z.
    const prazo = new Date('2026-02-02T02:59:59.999Z')

    expect(diaCivilParaInput(prazo)).toBe('2026-02-01')
  })

  it('não desloca o dia para datas próximas da meia-noite', () => {
    expect(diaCivilParaInput('2026-02-02T02:59:59.999Z')).toBe('2026-02-01')
    expect(diaCivilParaInput('2026-02-02T03:00:00.000Z')).toBe('2026-02-02')
    expect(diaCivilParaInput('2026-02-02T02:59:59.998Z')).toBe('2026-02-01')
  })

  it('respeita o horário de verão histórico (UTC-02 em 2018)', () => {
    // 23:59:59.999 de 10/11/2018 em São Paulo (UTC-02) = 11/11 01:59:59.999Z.
    expect(diaCivilParaInput('2018-11-11T01:59:59.999Z')).toBe('2018-11-10')
  })

  it('devolve string vazia para ausente ou inválido', () => {
    expect(diaCivilParaInput(null)).toBe('')
    expect(diaCivilParaInput(undefined)).toBe('')
    expect(diaCivilParaInput('')).toBe('')
    expect(diaCivilParaInput('data-invalida')).toBe('')
  })
})

describe('formatarDiaCivil', () => {
  it('apresenta a data civil brasileira sem deslocar o dia (D2)', () => {
    expect(formatarDiaCivil('2026-02-02T02:59:59.999Z')).toBe('01/02/2026')
    expect(formatarDiaCivil(new Date('2026-10-23T02:59:59.999Z'))).toBe('22/10/2026')
    expect(formatarDiaCivil('2019-02-17T02:59:59.999Z')).toBe('16/02/2019')
  })

  it('devolve string vazia para ausente ou inválido', () => {
    expect(formatarDiaCivil(null)).toBe('')
    expect(formatarDiaCivil('data-invalida')).toBe('')
  })
})
