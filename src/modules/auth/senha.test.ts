import { describe, expect, it } from 'vitest'
import { hashSenha, verificarSenha } from './senha'

describe('hashSenha', () => {
  it('gera hashes diferentes para a mesma senha (sal por senha)', async () => {
    const primeiro = await hashSenha('segredo-123')
    const segundo = await hashSenha('segredo-123')

    expect(primeiro).not.toBe(segundo)
  })

  it('não armazena a senha em texto puro', async () => {
    const hash = await hashSenha('segredo-123')

    expect(hash).not.toBe('segredo-123')
    expect(hash.includes('segredo-123')).toBe(false)
    expect(hash).toContain(':')
  })
})

describe('verificarSenha', () => {
  it('aceita a senha correta', async () => {
    const hash = await hashSenha('segredo-123')

    await expect(verificarSenha('segredo-123', hash)).resolves.toBe(true)
  })

  it('rejeita a senha incorreta', async () => {
    const hash = await hashSenha('segredo-123')

    await expect(verificarSenha('outra-senha', hash)).resolves.toBe(false)
  })
})
