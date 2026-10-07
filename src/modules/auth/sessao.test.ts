import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assinarSessao, verificarSessao } from './sessao'

const SEGREDO = 'segredo-de-teste'
const ORIGINAL = process.env.SESSION_SECRET

beforeEach(() => {
  process.env.SESSION_SECRET = SEGREDO
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = ORIGINAL
})

function futuro(ms = 60 * 60 * 1000): Date {
  return new Date(Date.now() + ms)
}

describe('assinarSessao / verificarSessao', () => {
  it('verifica um token válido e retorna o usuário', () => {
    const token = assinarSessao({ userId: 'user_1', expiraEm: futuro() })

    const sessao = verificarSessao(token)

    expect(sessao?.userId).toBe('user_1')
  })

  it('rejeita token com payload adulterado', () => {
    const token = assinarSessao({ userId: 'user_1', expiraEm: futuro() })
    const assinatura = token.split('.')[1]
    const payloadAdulterado = Buffer.from(
      JSON.stringify({ sub: 'user_2', exp: futuro().getTime() }),
    ).toString('base64url')

    expect(verificarSessao(`${payloadAdulterado}.${assinatura}`)).toBeNull()
  })

  it('rejeita token com assinatura adulterada', () => {
    const token = assinarSessao({ userId: 'user_1', expiraEm: futuro() })
    const [payload, assinatura] = token.split('.')
    const assinaturaAdulterada = `${assinatura.slice(0, -1)}${assinatura.endsWith('a') ? 'b' : 'a'}`

    expect(verificarSessao(`${payload}.${assinaturaAdulterada}`)).toBeNull()
  })

  it('rejeita token expirado', () => {
    const token = assinarSessao({ userId: 'user_1', expiraEm: new Date(Date.now() - 1000) })

    expect(verificarSessao(token)).toBeNull()
  })

  it('rejeita token assinado com outro segredo', () => {
    const token = assinarSessao({ userId: 'user_1', expiraEm: futuro() })
    process.env.SESSION_SECRET = 'outro-segredo'

    expect(verificarSessao(token)).toBeNull()
  })

  it('falha quando SESSION_SECRET está ausente', () => {
    delete process.env.SESSION_SECRET

    expect(() => assinarSessao({ userId: 'user_1', expiraEm: futuro() })).toThrow()
    expect(() => verificarSessao('qualquer.token')).toThrow()
  })
})
