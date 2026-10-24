import { describe, expect, it } from 'vitest'
import {
  ehRevenda,
  participioExecucao,
  rotuloExecucao,
  rotuloExecutado,
  rotuloSituacaoDoSetor,
  vocabularioDoSetor,
} from './vocabulario-setor'

describe('vocabularioDoSetor', () => {
  it('usa separação na Revenda pelo código do setor', () => {
    expect(vocabularioDoSetor('REVENDA', 'Revenda')).toBe('separacao')
    expect(ehRevenda('REVENDA', null)).toBe(true)
  })

  it('usa separação na Revenda pelo nome quando o código não veio', () => {
    expect(vocabularioDoSetor(null, ' revenda ')).toBe('separacao')
  })

  it('mantém produção em Corte e Dobra e Telhas', () => {
    expect(vocabularioDoSetor('CORTE_DOBRA', 'Corte e Dobra')).toBe('producao')
    expect(vocabularioDoSetor('TELHAS', 'Telhas')).toBe('producao')
  })

  it('preserva produção para setor não informado ou desconhecido', () => {
    expect(vocabularioDoSetor(null, null)).toBe('producao')
    expect(vocabularioDoSetor('OUTRO', 'Outro setor')).toBe('producao')
  })
})

describe('rótulos de vocabulário', () => {
  it('usa execução/executado para produção', () => {
    expect(rotuloExecucao('producao')).toBe('Execução')
    expect(rotuloExecutado('producao')).toBe('Executado')
    expect(participioExecucao('producao')).toBe('executadas')
  })

  it('usa separação/separado para Revenda', () => {
    expect(rotuloExecucao('separacao')).toBe('Separação')
    expect(rotuloExecutado('separacao')).toBe('Separado')
    expect(participioExecucao('separacao')).toBe('separadas')
  })

  it('troca apenas o rótulo de atividade em andamento na Revenda', () => {
    expect(rotuloSituacaoDoSetor('IN_PROGRESS', 'separacao')).toBe('Em separação')
    expect(rotuloSituacaoDoSetor('IN_PROGRESS', 'producao')).toBe('Em execução')
    expect(rotuloSituacaoDoSetor('COMPLETED', 'separacao')).toBe('Concluída')
    expect(rotuloSituacaoDoSetor('DESCONHECIDO', 'separacao')).toBeNull()
  })
})
