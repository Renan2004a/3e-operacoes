import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONNECTOR_TIMEOUT_MS,
  resolverConnectorTimeoutMs,
} from './http-conector-legado'

describe('resolverConnectorTimeoutMs', () => {
  it('usa o padrão quando a variável não é informada', () => {
    expect(resolverConnectorTimeoutMs(undefined)).toBe(DEFAULT_CONNECTOR_TIMEOUT_MS)
  })

  it('usa o valor da variável quando é um número positivo', () => {
    expect(resolverConnectorTimeoutMs('20000')).toBe(20000)
  })

  it('ignora valor inválido, zero ou negativo', () => {
    expect(resolverConnectorTimeoutMs('abc')).toBe(DEFAULT_CONNECTOR_TIMEOUT_MS)
    expect(resolverConnectorTimeoutMs('0')).toBe(DEFAULT_CONNECTOR_TIMEOUT_MS)
    expect(resolverConnectorTimeoutMs('-5')).toBe(DEFAULT_CONNECTOR_TIMEOUT_MS)
  })
})
