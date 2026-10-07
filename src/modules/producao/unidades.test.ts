import { describe, expect, it } from 'vitest'
import {
  QuantidadeInvalidaError,
  formatarQuantidade,
  validarQuantidade,
} from './unidades'

describe('validarQuantidade', () => {
  it('aceita peça inteira', () => {
    const quantidade = validarQuantidade('UN', '10')

    expect(quantidade.toString()).toBe('10')
  })

  it('rejeita peça fracionária', () => {
    expect(() => validarQuantidade('UN', '2.5')).toThrow(QuantidadeInvalidaError)
  })

  it('rejeita quantidade zero', () => {
    expect(() => validarQuantidade('UN', '0')).toThrow(QuantidadeInvalidaError)
    expect(() => validarQuantidade('M', '0')).toThrow(QuantidadeInvalidaError)
  })

  it('rejeita quantidade negativa', () => {
    expect(() => validarQuantidade('UN', '-3')).toThrow(QuantidadeInvalidaError)
    expect(() => validarQuantidade('M', '-1.5')).toThrow(QuantidadeInvalidaError)
  })

  it('aceita metro com casas decimais', () => {
    const quantidade = validarQuantidade('M', '8.5')

    expect(quantidade.toString()).toBe('8.5')
  })

  it('padroniza metro em duas casas decimais', () => {
    const quantidade = validarQuantidade('M', '8.567')

    expect(quantidade.toString()).toBe('8.57')
  })

  it('rejeita valor não numérico', () => {
    expect(() => validarQuantidade('UN', 'abc')).toThrow(QuantidadeInvalidaError)
  })
})

describe('formatarQuantidade', () => {
  it('formata peça sem casas decimais', () => {
    expect(formatarQuantidade('UN', '10')).toBe('10')
  })

  it('formata metro com duas casas decimais', () => {
    expect(formatarQuantidade('M', '2')).toBe('2.00')
  })
})
