import { describe, expect, it } from 'vitest'
import {
  ROTULO_SEM_UNIDADE,
  rotuloDaUnidade,
  valorPorUnidade,
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

    expect(valorPorUnidade(totais, 'pendente')).toBe('30 peca · 15 metro')
  })

  it('mostra zero quando o pedido não tem itens', () => {
    expect(valorPorUnidade([], 'disponivel')).toBe('0')
  })

  it('rotula o grupo sem unidade informada sem inventar unidade (RN05)', () => {
    const totais = [total({ unidade: null, entregue: '4' })]

    expect(valorPorUnidade(totais, 'entregue')).toBe(`4 ${ROTULO_SEM_UNIDADE}`)
  })

  it('preserva a precisão decimal recebida da API (RN04)', () => {
    expect(valorPorUnidade([total({ unidade: 'M', pendente: '2.75' })], 'pendente')).toBe('2.75 M')
  })
})

describe('rotuloDaUnidade', () => {
  it('devolve a unidade quando informada e o rótulo padrão quando ausente', () => {
    expect(rotuloDaUnidade('UN')).toBe('UN')
    expect(rotuloDaUnidade(null)).toBe(ROTULO_SEM_UNIDADE)
  })
})
