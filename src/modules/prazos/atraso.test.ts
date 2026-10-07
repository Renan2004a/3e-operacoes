import { describe, expect, it } from 'vitest'
import { calcularStatusPrazo } from './atraso'

const AGORA = new Date('2026-10-10T12:00:00.000Z')

describe('calcularStatusPrazo', () => {
  it('retorna SEM_PRAZO quando não há prazo definido (PRAZO-05)', () => {
    expect(calcularStatusPrazo({ prazo: null, concluido: false, agora: AGORA })).toBe('SEM_PRAZO')
  })

  it('retorna SEM_PRAZO mesmo com escopo concluído e sem prazo (PRAZO-09)', () => {
    expect(calcularStatusPrazo({ prazo: null, concluido: true, agora: AGORA })).toBe('SEM_PRAZO')
  })

  it('retorna EM_DIA quando o prazo ainda não foi ultrapassado (PRAZO-06)', () => {
    const prazo = new Date('2026-10-11T12:00:00.000Z')
    expect(calcularStatusPrazo({ prazo, concluido: false, agora: AGORA })).toBe('EM_DIA')
  })

  it('retorna EM_DIA quando o prazo é igual ao instante avaliado (PRAZO-06)', () => {
    expect(calcularStatusPrazo({ prazo: AGORA, concluido: false, agora: AGORA })).toBe('EM_DIA')
  })

  it('retorna ATRASADO quando o prazo foi ultrapassado e não está concluído (PRAZO-07)', () => {
    const prazo = new Date('2026-10-09T12:00:00.000Z')
    expect(calcularStatusPrazo({ prazo, concluido: false, agora: AGORA })).toBe('ATRASADO')
  })

  it('não classifica como atrasado quando o prazo foi ultrapassado e está concluído (PRAZO-08)', () => {
    const prazo = new Date('2026-10-09T12:00:00.000Z')
    expect(calcularStatusPrazo({ prazo, concluido: true, agora: AGORA })).toBe('EM_DIA')
  })
})
