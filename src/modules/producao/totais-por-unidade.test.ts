import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import {
  agruparPorUnidade,
  chaveUnidade,
  compararUnidades,
  rotuloUnidade,
  somarQuantidades,
} from './totais-por-unidade'

describe('rotuloUnidade e chaveUnidade', () => {
  it('ignora espaços nas bordas e agrupa sem diferenciar maiúsculas (RN01)', () => {
    expect(rotuloUnidade('  peca ')).toBe('peca')
    expect(chaveUnidade(' peca ')).toBe(chaveUnidade('PECA'))
  })

  it('trata unidade vazia ou só com espaços como ausente (RN05)', () => {
    expect(rotuloUnidade('')).toBeNull()
    expect(rotuloUnidade('   ')).toBeNull()
  })

  it('não converte nem equivale unidades diferentes (RN04)', () => {
    expect(chaveUnidade('M')).not.toBe(chaveUnidade('MT'))
    expect(chaveUnidade('M')).not.toBe(chaveUnidade('M2'))
  })
})

describe('compararUnidades', () => {
  it('deixa o grupo sem unidade por último (RN05)', () => {
    expect(compararUnidades(null, 'UN')).toBeGreaterThan(0)
    expect(compararUnidades('UN', null)).toBeLessThan(0)
    expect(compararUnidades(null, null)).toBe(0)
  })
})

describe('agruparPorUnidade', () => {
  const itens = [
    { id: 'a', unidade: 'peca' },
    { id: 'b', unidade: 'metro' },
    { id: 'c', unidade: 'PECA' },
    { id: 'd', unidade: '' },
  ]

  it('separa os itens por unidade sem misturar unidades diferentes (RN01, RN02)', () => {
    const grupos = agruparPorUnidade(itens, (item) => item.unidade)

    expect(grupos.map((grupo) => [grupo.unidade, grupo.itens.map((item) => item.id)])).toEqual([
      ['metro', ['b']],
      ['peca', ['a', 'c']],
      [null, ['d']],
    ])
  })

  it('devolve lista vazia sem itens', () => {
    expect(agruparPorUnidade([], (item: { unidade: string }) => item.unidade)).toEqual([])
  })
})

describe('somarQuantidades', () => {
  it('soma com precisão decimal e devolve zero sem valores (RN04)', () => {
    expect(
      somarQuantidades([new Prisma.Decimal('0.1'), new Prisma.Decimal('0.2')]).toString(),
    ).toBe('0.3')
    expect(somarQuantidades([]).toString()).toBe('0')
  })
})
