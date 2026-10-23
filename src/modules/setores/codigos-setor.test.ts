import { SectorCode } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { CODIGOS_SETOR, ehCodigoSetor } from './codigos-setor'

describe('códigos de setor', () => {
  it('acompanha o enum SectorCode do banco', () => {
    expect([...CODIGOS_SETOR].sort()).toEqual(Object.values(SectorCode).sort())
  })

  it('aceita somente códigos existentes, sem diferenciar nada além do código exato', () => {
    expect(ehCodigoSetor('CORTE_DOBRA')).toBe(true)
    expect(ehCodigoSetor('TELHAS')).toBe(true)
    expect(ehCodigoSetor('REVENDA')).toBe(true)

    expect(ehCodigoSetor('Telhas')).toBe(false)
    expect(ehCodigoSetor('telhas')).toBe(false)
    expect(ehCodigoSetor('Corte e Dobra')).toBe(false)
    expect(ehCodigoSetor('setor_telhas')).toBe(false)
    expect(ehCodigoSetor('')).toBe(false)
  })
})
