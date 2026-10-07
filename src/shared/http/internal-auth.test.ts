import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { requireInternalToken } from './internal-auth'

function requestWithAuthorization(value: string | null) {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? value : null),
    },
  }
}

describe('requireInternalToken', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('aceita o token interno quando o header Bearer confere', () => {
    expect(requireInternalToken(requestWithAuthorization('Bearer segredo-interno'))).toBe(true)
  })

  it('recusa quando o header de autorização está ausente', () => {
    expect(requireInternalToken(requestWithAuthorization(null))).toBe(false)
  })

  it('recusa quando o token diverge', () => {
    expect(requireInternalToken(requestWithAuthorization('Bearer outro-token'))).toBe(false)
  })

  it('recusa quando APP_INTERNAL_TOKEN não está configurado', () => {
    delete process.env.APP_INTERNAL_TOKEN
    expect(requireInternalToken(requestWithAuthorization('Bearer segredo-interno'))).toBe(false)
  })
})
