import { describe, expect, it } from 'vitest'
import {
  agruparPorSetor,
  formatarQuantidadeParaExibicao,
  ROTULO_SEM_UNIDADE,
  rotuloDaUnidade,
  somarQuantidadesDaUnidade,
  valorPorUnidade,
  type ItemResumoSetor,
  type TotalUnidadeView,
} from './totais-unidade'

function total(overrides: Partial<TotalUnidadeView>): TotalUnidadeView {
  return {
    unidade: 'peca',
    itens: 1,
    solicitado: '0',
    executado: '0',
    disponivel: '0',
    entregue: '0',
    pendente: '0',
    ...overrides,
  }
}

describe('valorPorUnidade', () => {
  it('mostra um valor por unidade, sem total geral (RN02)', () => {
    const totais = [
      total({ unidade: 'peca', pendente: '30' }),
      total({ unidade: 'metro', pendente: '15' }),
    ]

    expect(valorPorUnidade(totais, 'pendente')).toBe('30 peca · 15,00 metro')
  })

  it('mostra zero quando o pedido não tem itens', () => {
    expect(valorPorUnidade([], 'disponivel')).toBe('0')
  })

  it('rotula o grupo sem unidade informada sem inventar unidade (RN05)', () => {
    const totais = [total({ unidade: null, entregue: '4' })]

    expect(valorPorUnidade(totais, 'entregue')).toBe(`4 ${ROTULO_SEM_UNIDADE}`)
  })

  it('preserva a precisão decimal recebida da API (RN04)', () => {
    expect(valorPorUnidade([total({ unidade: 'M', pendente: '2.75' })], 'pendente')).toBe('2,75 M')
  })
})

describe('rotuloDaUnidade', () => {
  it('devolve a unidade quando informada e o rótulo padrão quando ausente', () => {
    expect(rotuloDaUnidade('UN')).toBe('UN')
    expect(rotuloDaUnidade(null)).toBe(ROTULO_SEM_UNIDADE)
  })
})

describe('formatarQuantidadeParaExibicao', () => {
  it('mantém unidade inteira sem casas decimais', () => {
    expect(formatarQuantidadeParaExibicao('UN', '10')).toBe('10')
    expect(formatarQuantidadeParaExibicao('peca', 8)).toBe('8')
  })

  it('padroniza metro com duas casas (RN020, RN022)', () => {
    expect(formatarQuantidadeParaExibicao('M', '10.5')).toBe('10,50')
    expect(formatarQuantidadeParaExibicao('MT', '20.2999')).toBe('20,30')
  })

  it('formata zero sem confundir com ausência de valor', () => {
    expect(formatarQuantidadeParaExibicao('M', '0')).toBe('0,00')
    expect(formatarQuantidadeParaExibicao('UN', 0)).toBe('0')
    expect(formatarQuantidadeParaExibicao('UN', '')).toBe('')
  })

  it('não impõe duas casas a unidades que não são metro', () => {
    expect(formatarQuantidadeParaExibicao('CX', '10.5')).toBe('11')
  })

  it('preserva valor inválido ou sem unidade em vez de virar zero', () => {
    expect(formatarQuantidadeParaExibicao('UN', 'abc')).toBe('abc')
    expect(formatarQuantidadeParaExibicao(null, '10.5')).toBe('10.5')
    expect(formatarQuantidadeParaExibicao('', '10.5')).toBe('10.5')
  })
})

describe('somarQuantidadesDaUnidade', () => {
  it('soma sem artefato de ponto flutuante', () => {
    expect(somarQuantidadesDaUnidade(['0.1', '0.2'])).toBe('0.3')
  })

  it('preserva zero e mais de duas casas recebidas', () => {
    expect(somarQuantidadesDaUnidade(['0', '0'])).toBe('0')
    expect(somarQuantidadesDaUnidade(['20.1', '0.1999'])).toBe('20.2999')
  })
})

function itemResumo(overrides: Partial<ItemResumoSetor>): ItemResumoSetor {
  return {
    sectorCode: 'TELHAS',
    sectorName: 'Telhas',
    unit: 'M',
    solicitado: '0',
    pendente: '0',
    ...overrides,
  }
}

describe('agruparPorSetor', () => {
  it('agrupa por setor e unidade e soma sem perder precisão', () => {
    const grupos = agruparPorSetor([
      itemResumo({ unit: 'M', solicitado: '10.1', pendente: '0.1' }),
      itemResumo({ unit: 'm', solicitado: '10.1999', pendente: '0.2' }),
      itemResumo({
        sectorCode: 'REVENDA',
        sectorName: 'Revenda',
        unit: 'UN',
        solicitado: '4',
        pendente: '4',
      }),
    ])

    expect(grupos).toEqual([
      {
        sectorCode: 'TELHAS',
        setor: 'Telhas',
        unidade: 'M',
        itens: 2,
        solicitado: '20.2999',
        pendente: '0.3',
      },
      {
        sectorCode: 'REVENDA',
        setor: 'Revenda',
        unidade: 'UN',
        itens: 1,
        solicitado: '4',
        pendente: '4',
      },
    ])
  })

  it('mantém unidades diferentes do mesmo setor em linhas separadas (RN01, RN02)', () => {
    const grupos = agruparPorSetor([
      itemResumo({ unit: 'M', solicitado: '10', pendente: '2' }),
      itemResumo({ unit: 'UN', solicitado: '3', pendente: '1' }),
    ])

    expect(grupos.map((grupo) => grupo.unidade)).toEqual(['M', 'UN'])
  })

  it('preserva setor sem unidade informada e quantidade zero', () => {
    const grupos = agruparPorSetor([
      itemResumo({
        sectorCode: null,
        sectorName: null,
        unit: '  ',
        solicitado: '0',
        pendente: '0',
      }),
    ])

    expect(grupos).toEqual([
      {
        sectorCode: null,
        setor: 'Não classificado',
        unidade: null,
        itens: 1,
        solicitado: '0',
        pendente: '0',
      },
    ])
  })

  it('não altera os valores originais usados nos cálculos', () => {
    const item = itemResumo({ solicitado: '10.5', pendente: '2.25' })

    agruparPorSetor([item])

    expect(item.solicitado).toBe('10.5')
    expect(item.pendente).toBe('2.25')
  })
})
