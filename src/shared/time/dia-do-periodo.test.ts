import { describe, expect, it } from 'vitest'
import { fimDoDiaNoFuso, inicioDoDiaNoFuso } from './dia-do-periodo'

describe('inicioDoDiaNoFuso', () => {
  it('interpreta o dia em America/Sao_Paulo (UTC-03 sem horário de verão)', () => {
    expect(inicioDoDiaNoFuso('2026-10-22')?.toISOString()).toBe('2026-10-22T03:00:00.000Z')
  })

  it('devolve o início do dia seguinte com diasAdicionais', () => {
    expect(inicioDoDiaNoFuso('2026-10-22', 1)?.toISOString()).toBe('2026-10-23T03:00:00.000Z')
    expect(inicioDoDiaNoFuso('2026-10-31', 1)?.toISOString()).toBe('2026-11-01T03:00:00.000Z')
    expect(inicioDoDiaNoFuso('2026-12-31', 1)?.toISOString()).toBe('2027-01-01T03:00:00.000Z')
  })

  it('respeita o horário de verão vigente na data (UTC-02 em 2018)', () => {
    expect(inicioDoDiaNoFuso('2018-11-10')?.toISOString()).toBe('2018-11-10T02:00:00.000Z')
  })

  it('volta ao UTC-03 após o fim do horário de verão (fev/2019)', () => {
    expect(inicioDoDiaNoFuso('2019-02-16')?.toISOString()).toBe('2019-02-16T02:00:00.000Z')
    expect(inicioDoDiaNoFuso('2019-02-17')?.toISOString()).toBe('2019-02-17T03:00:00.000Z')
  })

  it('rejeita texto que não é uma data real', () => {
    expect(inicioDoDiaNoFuso('2026-02-30')).toBeNull()
    expect(inicioDoDiaNoFuso('2026-13-01')).toBeNull()
    expect(inicioDoDiaNoFuso('22/10/2026')).toBeNull()
    expect(inicioDoDiaNoFuso('2026-10-22T12:00:00Z')).toBeNull()
  })
})

describe('fimDoDiaNoFuso', () => {
  it('devolve o último milissegundo do dia em America/Sao_Paulo (D2)', () => {
    expect(fimDoDiaNoFuso('2026-10-22')?.toISOString()).toBe('2026-10-23T02:59:59.999Z')
    expect(fimDoDiaNoFuso('2026-02-01')?.toISOString()).toBe('2026-02-02T02:59:59.999Z')
  })

  it('respeita o horário de verão histórico (UTC-02 em 2018)', () => {
    expect(fimDoDiaNoFuso('2018-11-10')?.toISOString()).toBe('2018-11-11T01:59:59.999Z')
  })

  it('trata o dia em que o horário de verão termina (fev/2019)', () => {
    // O dia 16/02/2019 tem 25 horas; o último instante é 02:59:59.999Z.
    expect(fimDoDiaNoFuso('2019-02-16')?.toISOString()).toBe('2019-02-17T02:59:59.999Z')
    expect(fimDoDiaNoFuso('2019-02-17')?.toISOString()).toBe('2019-02-18T02:59:59.999Z')
  })

  it('atravessa a virada do ano', () => {
    expect(fimDoDiaNoFuso('2026-12-31')?.toISOString()).toBe('2027-01-01T02:59:59.999Z')
  })

  it('rejeita texto que não é uma data real', () => {
    expect(fimDoDiaNoFuso('2026-02-30')).toBeNull()
    expect(fimDoDiaNoFuso('2026-13-01')).toBeNull()
    expect(fimDoDiaNoFuso('22/10/2026')).toBeNull()
    expect(fimDoDiaNoFuso('2026-10-22T12:00:00Z')).toBeNull()
    expect(fimDoDiaNoFuso('')).toBeNull()
  })
})
