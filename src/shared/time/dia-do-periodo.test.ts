import { describe, expect, it } from 'vitest'
import { inicioDoDiaNoFuso } from './dia-do-periodo'

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
