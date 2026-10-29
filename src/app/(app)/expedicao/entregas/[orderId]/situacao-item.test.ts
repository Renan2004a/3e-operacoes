import { describe, expect, it } from 'vitest'

import { situacaoDoItem } from './situacao-item'

function item(solicitado: number, executado: number, entregue: number) {
  return {
    solicitado,
    executado,
    entregue,
    disponivel: executado - entregue,
    pendente: Math.max(solicitado - executado, 0),
  }
}

describe('situacaoDoItem', () => {
  it('com saldo e nada entregue está Disponível', () => {
    expect(situacaoDoItem(item(10, 8, 0))).toEqual({
      codigo: 'DISPONIVEL',
      rotulo: 'Disponível',
      variante: 'success',
    })
  })

  it('com saldo e algo já entregue está em Entrega parcial', () => {
    expect(situacaoDoItem(item(10, 8, 3))).toEqual({
      codigo: 'ENTREGA_PARCIAL',
      rotulo: 'Entrega parcial',
      variante: 'info',
    })
  })

  it('sem saldo, com tudo solicitado entregue, está Entregue', () => {
    expect(situacaoDoItem(item(10, 10, 10))).toEqual({
      codigo: 'ENTREGUE',
      rotulo: 'Entregue',
      variante: 'neutral',
    })
  })

  it('sem saldo e nada entregue aguarda a produção', () => {
    expect(situacaoDoItem(item(10, 0, 0))).toEqual({
      codigo: 'AGUARDANDO_PRODUCAO',
      rotulo: 'Aguardando produção',
      variante: 'warning',
    })
  })

  it('tudo o que foi produzido já foi entregue, mas falta produzir: aguarda a produção', () => {
    expect(situacaoDoItem(item(10, 8, 8)).codigo).toBe('AGUARDANDO_PRODUCAO')
  })

  it('entrega acima do executado autorizada (saldo negativo) não vira Disponível', () => {
    expect(situacaoDoItem(item(10, 8, 9)).codigo).toBe('AGUARDANDO_PRODUCAO')
    expect(situacaoDoItem(item(10, 10, 12)).codigo).toBe('ENTREGUE')
  })
})
